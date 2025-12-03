using Microsoft.AspNetCore.Mvc;
using WebAppEstudo.Data;
using WebAppEstudo.Services; // Namespace novo

namespace WebAppEstudo.Endpoints;

public static class VendasEndpoints
{
    public static void MapVendasEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/vendas").WithTags("Vendas");

        // --------------------------------------------------------------------
        // POST /api/vendas
        // Realiza a venda e enfileira a impressão se necessário
        // --------------------------------------------------------------------
        group.MapPost("/", async (VendaService service, PrintQueue printQueue, [FromBody] VendaPayload payload) =>
        {
            try
            {
                // 1. Processa a regra de negócio (banco de dados)
                var resultado = await service.RegistrarVendaAsync(payload);

                // 2. Se deu tudo certo, gera o cupom e manda pra fila de impressão (Background)
                // O usuário não precisa esperar a impressora terminar para receber o "OK"
                try 
                {
                    var cupomBytes = await service.GerarCupomBytesAsync(payload, resultado.CodigoMovimento);
                    printQueue.Enqueue(cupomBytes); // Manda pra fila e segue a vida
                }
                catch (Exception ex)
                {
                    // Se falhar a geração do cupom, loga mas não cancela a venda que já foi feita
                    Console.WriteLine($"Erro ao enfileirar impressão: {ex.Message}");
                }

                return Results.Ok(resultado);
            }
            catch (ArgumentException ex) // Erros de validação (ex: cliente não existe)
            {
                return Results.BadRequest(ex.Message);
            }
            catch (Exception ex) // Erros genéricos
            {
                return Results.Problem($"Erro interno: {ex.Message}");
            }
        });

        // --------------------------------------------------------------------
        // POST /api/vendas/imprimir
        // Apenas gera o Base64 para preview ou reimpressão manual
        // --------------------------------------------------------------------
        group.MapPost("/imprimir", async (VendaService service, [FromBody] VendaPayload payload) =>
        {
            try
            {
                // Gera o cupom em memória sem salvar no banco
                var cupomBytes = await service.GerarCupomBytesAsync(payload, null);
                var cupomBase64 = Convert.ToBase64String(cupomBytes);
                return Results.Ok(new { cupomBase64 });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }
}