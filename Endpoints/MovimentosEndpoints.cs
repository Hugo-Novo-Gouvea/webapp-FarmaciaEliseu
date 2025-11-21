using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

namespace WebAppEstudo.Endpoints;

public static class MovimentosEndpoints
{
    public static void MapMovimentosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/movimentos").WithTags("Movimentos");

        // GET /api/movimentos - Listar movimentos agrupados por codigoMovimento
        group.MapGet("/", async (
            AppDbContext db,
            int page = 1,
            int pageSize = 50,
            string? search = null,
            string? column = null
        ) =>
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 200) pageSize = 200;

            var baseQuery = db.Movimentos
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                if (column == "cliente")
                {
                    baseQuery = baseQuery.Where(m => m.ClientesNome != null && m.ClientesNome.Contains(search));
                }
                else if (column == "movimento")
                {
                    baseQuery = baseQuery.Where(m => m.CodigoMovimento.ToString().Contains(search));
                }
                else
                {
                    baseQuery = baseQuery.Where(m =>
                        (m.ClientesNome != null && m.ClientesNome.Contains(search)) ||
                        m.CodigoMovimento.ToString().Contains(search)
                    );
                }
            }

            var linhas = await baseQuery
                .Select(m => new
                {
                    m.CodigoMovimento,
                    m.ClientesNome,
                    m.DataVenda,
                    valorCalculado = m.PrecoTotalAtual - m.Desconto
                })
                .ToListAsync();

            var agrupados = linhas
                .GroupBy(x => x.CodigoMovimento)
                .Select(g => new
                {
                    codigoMovimento = g.Key,
                    clienteNome = g.Max(x => x.ClientesNome),
                    dataVenda = g.Max(x => x.DataVenda),
                    valorTotal = g.Sum(x => x.valorCalculado)
                })
                .OrderByDescending(x => x.dataVenda)
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

        // GET /api/movimentos/{codigoMovimento} - Detalhes de um movimento
        group.MapGet("/{codigoMovimento:int}", async (int codigoMovimento, AppDbContext db) =>
        {
            var itens = await db.Movimentos
                .AsNoTracking()
                .Where(m => m.CodigoMovimento == codigoMovimento)
                .OrderBy(m => m.MovimentosId)
                .ToListAsync();

            if (itens.Count == 0) return Results.NotFound();

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
                deletado = m.Deletado
            });

            return Results.Ok(new
            {
                header,
                itens = itensDto
            });
        });

        // POST /api/movimentos/{codigoMovimento}/imprimir - Imprimir movimento
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

            string? codigoFichario = null;
            var clienteId = movimentos.First().ClientesId;
            var cliente = await db.Clientes.FindAsync(clienteId);
            if (cliente is not null && cliente.CodigoFichario.HasValue)
                codigoFichario = cliente.CodigoFichario.Value.ToString();

            var pagos = movimentos.Where(m => m.Deletado == true).ToList();
            var naoPagos = movimentos.Where(m => m.Deletado == false).ToList();

            List<ReceiptPrinter.Item> ToItems(List<Movimento> list) =>
                list.Select(m => new ReceiptPrinter.Item(
                    m.Quantidade,
                    m.ProdutosDescricao,
                    m.PrecoUnitarioDiaVenda,
                    m.Desconto
                )).ToList();

            try
            {
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
                else // TODOS -> usar modelo sem valor, com todos os itens
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
                Console.WriteLine("Falha ao gerar cupom: " + ex.Message);
                return Results.Problem("Falha ao gerar cupom.");
            }
        });
    }
}

public class MovimentoPrintRequest
{
    public string? filtro { get; set; }
}
