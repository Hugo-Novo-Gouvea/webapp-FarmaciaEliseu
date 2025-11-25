using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

namespace WebAppEstudo.Endpoints;

/// <summary>
/// Endpoints de consulta, pagamento e impressão relacionados às
/// "Contas a Receber" (baseadas na tabela de Movimentos).
/// </summary>
public static class ContasPagarEndpoints
{
    /// <summary>
    /// Registra os endpoints de Contas a Receber na aplicação.
    /// </summary>
    public static void MapContasPagarEndpoints(this WebApplication app)
    {
        // Grupo raiz da feature com prefixo /api/contas
        var group = app.MapGroup("/api/contas")
            .WithTags("Contas a Receber");

        // --------------------------------------------------------------------
        // GET /api/contas/clientes
        // Retorna lista básica de clientes para o autocomplete/seleção.
        // --------------------------------------------------------------------
        group.MapGet("/clientes", async (AppDbContext db) =>
        {
            var clientes = await db.Clientes
                .AsNoTracking()
                .Where(c =>
                    (c.Deletado == null || c.Deletado == false) &&
                    c.ClientesId != 1 // pula o registro "técnico" / reservado
                )
                .OrderBy(c => c.Nome)
                .Select(c => new
                {
                    c.ClientesId,
                    c.Nome
                })
                .ToListAsync();

            return Results.Ok(clientes);
        });

        // --------------------------------------------------------------------
        // GET /api/contas/total-cliente/{clienteId}
        // Retorna o total em aberto do cliente (somente movimentos não deletados).
        // Fórmula: soma de (PrecoTotalAtual - Desconto).
        // --------------------------------------------------------------------
        group.MapGet("/total-cliente/{clienteId:int}", async (int clienteId, AppDbContext db) =>
        {
            if (clienteId <= 0)
                return Results.BadRequest("clienteId inválido.");

            var total = await db.Movimentos
                .AsNoTracking()
                .Where(m =>
                    m.ClientesId == clienteId &&
                    m.Deletado == false
                )
                .SumAsync(m => (decimal?)(m.PrecoTotalAtual - m.Desconto)) ?? 0m;

            return Results.Ok(new { clienteId, total });
        });

        // --------------------------------------------------------------------
        // GET /api/contas/movimentos?clienteId=123
        // Lista os movimentos em aberto de um cliente (Deletado = false),
        // ordenados pela data da venda. Usado na tela de "Contas a receber".
        // --------------------------------------------------------------------
        group.MapGet("/movimentos", async (AppDbContext db, int clienteId) =>
        {
            if (clienteId <= 0)
                return Results.BadRequest("clienteId inválido.");

            var movimentos = await db.Movimentos
                .AsNoTracking()
                .Where(m =>
                    m.Deletado == false &&
                    m.ClientesId == clienteId
                )
                .OrderBy(m => m.DataVenda)
                .ToListAsync();

            return Results.Ok(movimentos);
        });

        // --------------------------------------------------------------------
        // PUT /api/contas/movimentos/pagar
        // Recebe uma lista de IDs de movimentos e marca todos como "pagos"
        // via soft delete (Deletado = true), registrando data de pagamento.
        //
        // Espera um payload no formato:
        // {
        //   "ids": [1, 2, 3]
        // }
        // --------------------------------------------------------------------
        group.MapPut("/movimentos/pagar", async (AppDbContext db, IdsPayload payload) =>
        {
            if (payload?.ids == null || payload.ids.Count == 0)
                return Results.BadRequest("Lista de IDs vazia.");

            var agora = DateTime.Now;

            var itens = await db.Movimentos
                .Where(m => payload.ids.Contains(m.MovimentosId))
                .ToListAsync();

            if (itens.Count == 0)
                return Results.NotFound();

            foreach (var m in itens)
            {
                // Soft delete = considerado pago/baixado
                m.Deletado = true;
                m.DataPagamento = agora;
                m.DataUltimoRegistro = agora;
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // --------------------------------------------------------------------
        // POST /api/contas/movimentos/imprimir
        // Gera um cupom (em bytes) das contas selecionadas e retorna em Base64
        // para o front imprimir localmente no agente de impressão.
        //
        // Também espera um payload:
        // {
        //   "ids": [1, 2, 3]
        // }
        // --------------------------------------------------------------------
        group.MapPost("/movimentos/imprimir", async (AppDbContext db, IdsPayload payload) =>
        {
            if (payload?.ids == null || payload.ids.Count == 0)
                return Results.BadRequest("Lista de IDs vazia.");

            var movimentos = await db.Movimentos
                .Where(m => payload.ids.Contains(m.MovimentosId))
                .OrderBy(m => m.DataVenda)
                .ToListAsync();

            if (movimentos.Count == 0)
                return Results.NotFound("Nenhum movimento encontrado para imprimir.");

            var primeiro = movimentos.First();
            var clienteNome = primeiro.ClientesNome;
            var vendedorNome = primeiro.FuncionariosNome;
            var dataHora = DateTime.Now;

            // Busca código de fichário (se existir) do cliente
            string? codigoFichario = null;
            var clienteId = primeiro.ClientesId;
            var cliente = await db.Clientes.FindAsync(clienteId);
            if (cliente is not null && cliente.CodigoFichario.HasValue)
                codigoFichario = cliente.CodigoFichario.Value.ToString();

            // Converte movimentos em itens de cupom para o ReceiptPrinter
            var itens = movimentos
                .Select(m => new ReceiptPrinter.Item(
                    m.Quantidade,
                    m.ProdutosDescricao,
                    m.PrecoUnitarioDiaVenda,
                    m.Desconto
                ))
                .ToList();

            var totalDesconto = movimentos.Sum(m => m.Desconto);
            var totalFinal = movimentos.Sum(m => m.PrecoTotalDiaVenda - m.Desconto);

            try
            {
                // Monta o cupom em bytes (formato específico da impressora)
                var cupomBytes = ReceiptPrinter.BuildReceipt(
                    lojaNome: "FARMACIA DO ELISEU",
                    dataHora: dataHora,
                    clienteNome: clienteNome,
                    vendedorNome: vendedorNome,
                    itens: itens,
                    isDinheiro: true,     // aqui estamos tratando como pagamento à vista
                    totalDesconto: totalDesconto,
                    totalFinal: totalFinal,
                    codigoFichario: codigoFichario,
                    codigoMovimento: null // não estamos usando um código único de movimento aqui
                );

                // Converte bytes para Base64 e envia para o front
                var cupomBase64 = Convert.ToBase64String(cupomBytes);
                return Results.Ok(new
                {
                    cupomBase64,
                    message = "Cupom gerado com sucesso."
                });
            }
            catch (Exception ex)
            {
                // Log simples por enquanto; em produção ideal seria ILogger.
                Console.WriteLine("Falha ao gerar cupom: " + ex.Message);
                return Results.Problem("Falha ao gerar cupom.");
            }
        });
    }
}
