using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

namespace WebAppEstudo.Endpoints;

/// <summary>
/// Endpoints de consulta e impressão de movimentos de venda.
/// </summary>
public static class MovimentosEndpoints
{
    /// <summary>
    /// Registra os endpoints de movimentos no pipeline da aplicação.
    /// </summary>
    public static void MapMovimentosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/movimentos").WithTags("Movimentos");

        // GET /api/movimentos
        // Lista movimentos agrupados por CodigoMovimento com paginação e filtro.
        group.MapGet("/", async (
            AppDbContext db,
            int page = 1,
            int pageSize = 50,
            string? search = null,
            string? column = null
        ) =>
        {
            // Sanitiza paginação
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 200) pageSize = 200;

            // Query base: todos os movimentos (sem tracking)
            var baseQuery = db.Movimentos
                .AsNoTracking()
                .AsQueryable();

            // Filtro opcional
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                if (column == "cliente")
                {
                    baseQuery = baseQuery.Where(m =>
                        m.ClientesNome != null &&
                        m.ClientesNome.Contains(search)
                    );
                }
                else if (column == "movimento")
                {
                    baseQuery = baseQuery.Where(m =>
                        m.CodigoMovimento.ToString().Contains(search)
                    );
                }
                else
                {
                    // Filtro "solto": tenta por cliente ou código do movimento
                    baseQuery = baseQuery.Where(m =>
                        (m.ClientesNome != null && m.ClientesNome.Contains(search)) ||
                        m.CodigoMovimento.ToString().Contains(search)
                    );
                }
            }

            // Projeção leve antes de agrupar
            var linhas = await baseQuery
                .Select(m => new
                {
                    m.CodigoMovimento,
                    m.ClientesNome,
                    m.DataVenda,
                    // Valor corrente (atual) do item, já somado/descontado
                    valorCalculado = m.PrecoTotalAtual - m.Desconto
                })
                .ToListAsync();

            // Agrupa por código de movimento para montar o "cabeçalho"
            var agrupados = linhas
                .GroupBy(x => x.CodigoMovimento)
                .Select(g => new
                {
                    codigoMovimento = g.Key,
                    clienteNome = g.Max(x => x.ClientesNome),
                    dataVenda = g.Max(x => x.DataVenda),
                    valorTotal = g.Sum(x => x.valorCalculado)
                })
                .OrderByDescending(x => x.dataVenda) // últimos movimentos primeiro
                .ToList();

            var total = agrupados.Count;

            var itens = agrupados
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Results.Ok(new
            {
                total,
                page,
                pageSize,
                items = itens
            });
        });

        // GET /api/movimentos/{codigoMovimento}
        // Retorna detalhes de um movimento específico (itens + cabeçalho).
        group.MapGet("/{codigoMovimento:int}", async (int codigoMovimento, AppDbContext db) =>
        {
            var itens = await db.Movimentos
                .AsNoTracking()
                .Where(m => m.CodigoMovimento == codigoMovimento)
                .OrderBy(m => m.MovimentosId)
                .ToListAsync();

            if (itens.Count == 0)
                return Results.NotFound();

            var header = new
            {
                codigoMovimento = codigoMovimento,
                clienteNome = itens.First().ClientesNome,
                dataVenda = itens.Max(x => x.DataVenda),
                valorTotal = itens.Sum(x => (x.PrecoTotalAtual - x.Desconto))
            };

            var itensDto = itens.Select(m => new
            {
                produtosDescricao = m.ProdutosDescricao,
                quantidade = m.Quantidade,
                precoUnitario = m.PrecoUnitarioAtual,
                desconto = m.Desconto,
                valorItem = m.PrecoTotalAtual - m.Desconto,
                pago = m.ValorPago,
                // Deletado = true significa "pago" nesse modelo
                deletado = m.Deletado
            });

            return Results.Ok(new
            {
                header,
                itens = itensDto
            });
        });

        // POST /api/movimentos/{codigoMovimento}/imprimir
        // Gera o cupom de um movimento em três modos:
        // - filtro = "pagos": imprime só itens pagos, com total
        // - filtro = "naoPagos"/"não pagos": imprime só itens em aberto, sem total
        // - outro/sem filtro: imprime todos os itens, sem total (modelo neutro)
        group.MapPost("/{codigoMovimento:int}/imprimir", async (int codigoMovimento, AppDbContext db, MovimentoPrintRequest req) =>
        {
            var filtro = (req?.filtro ?? "todos").Trim().ToLower();

            var movimentos = await db.Movimentos
                .Where(m => m.CodigoMovimento == codigoMovimento)
                .OrderBy(m => m.MovimentosId)
                .ToListAsync();

            if (movimentos.Count == 0)
                return Results.NotFound("Movimento não encontrado.");

            var clienteNome = movimentos.First().ClientesNome;
            var vendedorNome = movimentos.First().FuncionariosNome;
            var data = movimentos.Max(m => m.DataVenda);

            // Tenta buscar o código de fichário do cliente, se existir
            string? codigoFichario = null;
            var clienteId = movimentos.First().ClientesId;
            var cliente = await db.Clientes.FindAsync(clienteId);
            if (cliente is not null && cliente.CodigoFichario.HasValue)
                codigoFichario = cliente.CodigoFichario.Value.ToString();

            // Nesse modelo, Deletado = true é considerado "pago"
            var pagos = movimentos.Where(m => m.Deletado == true).ToList();
            var naoPagos = movimentos.Where(m => m.Deletado == false).ToList();

            // Helper para converter Movimento -> Item de cupom
            List<ReceiptPrinter.Item> ToItems(List<Movimento> list) =>
                list.Select(m => new ReceiptPrinter.Item(
                    m.Quantidade,
                    m.ProdutosDescricao,
                    m.PrecoUnitarioDiaVenda,
                    m.Desconto
                )).ToList();

            try
            {
                // Somente pagos, com total financeiro
                if (filtro == "pagos")
                {
                    if (pagos.Count == 0)
                        return Results.BadRequest("Nenhum item pago nesse movimento.");

                    var itens = ToItems(pagos);
                    var totalDesconto = pagos.Sum(m => m.Desconto);
                    var totalFinal = pagos.Sum(m => m.PrecoTotalDiaVenda - m.Desconto);

                    var bytes = ReceiptPrinter.BuildReceipt(
                        lojaNome: "FARMACIA DO ELISEU",
                        dataHora: data,
                        clienteNome: clienteNome,
                        vendedorNome: vendedorNome,
                        itens: itens,
                        isDinheiro: true,
                        totalDesconto: totalDesconto,
                        totalFinal: totalFinal,
                        codigoFichario: codigoFichario,
                        codigoMovimento: codigoMovimento
                    );

                    var cupomBase64 = Convert.ToBase64String(bytes);
                    return Results.Ok(new { cupomBase64, message = "Cupom gerado com sucesso." });
                }
                // Somente itens em aberto, sem totais (recibo "pendente")
                else if (filtro == "naopagos" || filtro == "não pagos" || filtro == "nao pagos")
                {
                    if (naoPagos.Count == 0)
                        return Results.BadRequest("Nenhum item em aberto nesse movimento.");

                    var itens = ToItems(naoPagos);

                    var bytes = ReceiptPrinter.BuildReceipt(
                        lojaNome: "FARMACIA DO ELISEU",
                        dataHora: data,
                        clienteNome: clienteNome,
                        vendedorNome: vendedorNome,
                        itens: itens,
                        isDinheiro: false,
                        totalDesconto: 0,
                        totalFinal: 0,
                        codigoFichario: codigoFichario,
                        codigoMovimento: codigoMovimento
                    );

                    var cupomBase64 = Convert.ToBase64String(bytes);
                    return Results.Ok(new { cupomBase64, message = "Cupom gerado com sucesso." });
                }
                // "todos" ou qualquer outra coisa → imprime tudo, sem totais
                else
                {
                    var itens = ToItems(movimentos);

                    var bytes = ReceiptPrinter.BuildReceipt(
                        lojaNome: "FARMACIA DO ELISEU",
                        dataHora: data,
                        clienteNome: clienteNome,
                        vendedorNome: vendedorNome,
                        itens: itens,
                        isDinheiro: false,
                        totalDesconto: 0,
                        totalFinal: 0,
                        codigoFichario: codigoFichario,
                        codigoMovimento: codigoMovimento
                    );

                    var cupomBase64 = Convert.ToBase64String(bytes);
                    return Results.Ok(new { cupomBase64, message = "Cupom gerado com sucesso." });
                }
            }
            catch (Exception ex)
            {
                // Log simples de fallback. Se quiser ficar mais fino, aqui é o ponto de plugar um logger profissional.
                Console.WriteLine("Falha ao gerar cupom: " + ex.Message);
                return Results.Problem("Falha ao gerar cupom.");
            }
        });
    }
}

/// <summary>
/// Payload usado para impressão de movimento.
/// </summary>
public class MovimentoPrintRequest
{
    /// <summary>
    /// Filtro de impressão:
    /// - "pagos"
    /// - "naoPagos" / "não pagos"
    /// - null / outro → imprime todos.
    /// </summary>
    public string? filtro { get; set; }
}
