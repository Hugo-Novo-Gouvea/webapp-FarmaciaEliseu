using System.Text.Json;
using WebAppEstudo.Data;

namespace WebAppEstudo.Endpoints;

public static class ConfigEndpoints
{
    public static void MapConfigEndpoints(this WebApplication app, string dbConfigPath)
    {
        var group = app.MapGroup("/api/config").WithTags("Configuração");

        // GET /api/config/db - Obter configuração do banco
        group.MapGet("/db", () =>
        {
            var cfg = DbConfig.Load(dbConfigPath) ?? new DbConfig();
            return Results.Ok(cfg);
        });

        // POST /api/config/db - Salvar configuração do banco
        group.MapPost("/db", async (HttpContext http) =>
        {
            var cfg = await JsonSerializer.DeserializeAsync<DbConfig>(http.Request.Body);
            if (cfg is null) return Results.BadRequest("Config inválida.");

            DbConfig.Save(cfg, dbConfigPath);

            return Results.Ok(new { message = "Configurações de banco salvas. Reinicie o app pra aplicar." });
        });
    }
}
