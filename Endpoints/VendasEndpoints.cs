using Microsoft.AspNetCore.Mvc;
using WebAppEstudo.Data;
using WebAppEstudo.Services;

namespace WebAppEstudo.Endpoints;

public static class VendasEndpoints
{
    public static void MapVendasEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/vendas").WithTags("Vendas");

        // --------------------------------------------------------------------
        // POST /api/vendas
        // Realiza a venda APENAS (grava no banco).
        // A impressão é responsabilidade do Front-end chamar o Agente Local.
        // --------------------------------------------------------------------
        group.MapPost("/", async (VendaService service, [FromBody] VendaPayload payload) =>
        {
            try
            {
                // 1. Processa a regra de negócio (banco de dados)
                var resultado = await service.RegistrarVendaAsync(payload);

                // Retorna 200 OK com os dados. O JavaScript decide se imprime ou não.
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return Results.Problem($"Erro interno: {ex.Message}");
            }
        });

        // --------------------------------------------------------------------
        // POST /api/vendas/imprimir
        // Gera o Base64 para o Frontend enviar ao Agente Local
        // --------------------------------------------------------------------
        group.MapPost("/imprimir", async (VendaService service, [FromBody] VendaPayload payload) =>
        {
            try
            {
                // Gera o cupom em memória (não salva no banco de novo)
                // O segundo parâmetro é null pois aqui não temos o ID do movimento se for apenas um preview,
                // mas se o JS mandar o payload completo, gera o cupom visual.
                var cupomBytes = await service.GerarCupomBytesAsync(payload, null);
                
                var cupomBase64 = Convert.ToBase64String(cupomBytes);
                
                // Retorna o Base64 para o JS mandar para o localhost:5005
                return Results.Ok(new { cupomBase64 });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }
}