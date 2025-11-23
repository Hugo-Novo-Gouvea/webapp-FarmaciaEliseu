using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

namespace WebAppEstudo.Endpoints;

public static class ContasPagarEndpoints
{
    public static void MapContasPagarEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/contas").WithTags("Contas a Pagar");

        // GET /api/contas/clientes - Listar clientes para seleção
        group.MapGet("/clientes", async (AppDbContext db) =>
        {
            var clientes = await db.Clientes
                .AsNoTracking()
                .Where(c => (c.Deletado == null || c.Deletado == false) && c.ClientesId != 1)
                .OrderBy(c => c.Nome)
                .Select(c => new { c.ClientesId, c.Nome })
                .ToListAsync();
            return Results.Ok(clientes);
        });

        // GET /api/contas/total-cliente/{id} - Total em aberto (deletado = false) do cliente
        group.MapGet("/total-cliente/{clienteId:int}", async (int clienteId, AppDbContext db) =>
        {
            if (clienteId <= 0)
                return Results.BadRequest("clienteId invalido.");

            var total = await db.Movimentos
                .AsNoTracking()
                .Where(m => m.ClientesId == clienteId && m.Deletado == false)
                .SumAsync(m => (decimal?)(m.PrecoTotalAtual - m.Desconto)) ?? 0m;

            return Results.Ok(new { clienteId, total });
        });

        // GET /api/contas/movimentos - Listar movimentos de um cliente
        group.MapGet("/movimentos", async (AppDbContext db, int clienteId) =>
        {
            if (clienteId <= 0) return Results.BadRequest("clienteId invalido.");

            var movimentos = await db.Movimentos
                .AsNoTracking()
                .Where(m => (m.Deletado == false) && m.ClientesId == clienteId)
                .OrderBy(m => m.DataVenda)
                .ToListAsync();

            return Results.Ok(movimentos);
        });

        // PUT /api/contas/movimentos/pagar - Marcar movimentos como pagos
        group.MapPut("/movimentos/pagar", async (AppDbContext db, IdsPayload payload) =>
        {
            if (payload?.ids == null || payload.ids.Count == 0)
                return Results.BadRequest("Lista de IDs vazia.");

            var agora = DateTime.Now;
            var itens = await db.Movimentos
                .Where(m => payload.ids.Contains(m.MovimentosId))
                .ToListAsync();

            if (itens.Count == 0) return Results.NotFound();

            foreach (var m in itens)
            {
                m.Deletado = true;
                m.DataPagamento = agora;
                m.DataUltimoRegistro = agora;
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // POST /api/contas/movimentos/imprimir - Imprimir cupom das contas pagas
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

            var clienteNome = movimentos.First().ClientesNome;
            var vendedorNome = movimentos.First().FuncionariosNome;
            var dataHora = DateTime.Now;

            string? codigoFichario = null;
            var clienteId = movimentos.First().ClientesId;
            var cliente = await db.Clientes.FindAsync(clienteId);
            if (cliente is not null && cliente.CodigoFichario.HasValue)
                codigoFichario = cliente.CodigoFichario.Value.ToString();

            var itens = movimentos.Select(m => new ReceiptPrinter.Item(
                m.Quantidade,
                m.ProdutosDescricao,
                m.PrecoUnitarioDiaVenda,
                m.Desconto
            )).ToList();

            var totalDesconto = movimentos.Sum(m => m.Desconto);
            var totalFinal = movimentos.Sum(m => m.PrecoTotalDiaVenda - m.Desconto);

            try
            {
                var cupomBytes = ReceiptPrinter.BuildReceipt(
                    lojaNome: "FARMACIA DO ELISEU",
                    dataHora: dataHora,
                    clienteNome: clienteNome,
                    vendedorNome: vendedorNome,
                    itens: itens,
                    isDinheiro: true,
                    totalDesconto: totalDesconto,
                    totalFinal: totalFinal,
                    codigoFichario: codigoFichario,
                    codigoMovimento: null
                );

                // Converte bytes para Base64 e retorna para o cliente imprimir localmente
                var cupomBase64 = Convert.ToBase64String(cupomBytes);
                return Results.Ok(new { cupomBase64, message = "Cupom gerado com sucesso." });
            }
            catch (Exception ex)
            {
                Console.WriteLine("Falha ao gerar cupom: " + ex.Message);
                return Results.Problem("Falha ao gerar cupom.");
            }
        });
    }
}
