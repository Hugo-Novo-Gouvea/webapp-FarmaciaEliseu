using WebAppEstudo.Data;

namespace WebAppEstudo.Endpoints;

/// <summary>
/// Endpoints de configuração da aplicação (ex.: conexão com o banco).
/// A ideia aqui é expor a configuração atual e permitir atualizá-la.
/// </summary>
public static class ConfigEndpoints
{
    /// <summary>
    /// Registra os endpoints de configuração em <c>/api/config</c>.
    /// </summary>
    /// <param name="app">Instância da aplicação Web.</param>
    /// <param name="dbConfigPath">
    /// Caminho completo do arquivo de configuração de banco
    /// (ex.: config/dbconfig.json).
    /// </param>
    public static void MapConfigEndpoints(this WebApplication app, string dbConfigPath)
    {
        // Grupo raiz: /api/config
        var group = app.MapGroup("/api/config")
            .WithTags("Configuração");

        // --------------------------------------------------------------------
        // GET /api/config/db
        //
        // Retorna a configuração atual do banco.
        // Se o arquivo não existir ou estiver inválido, DbConfig.Load()
        // deve devolver null e aqui retornamos um DbConfig "vazio" por padrão.
        // --------------------------------------------------------------------
        group.MapGet("/db", () =>
        {
            var cfg = DbConfig.Load(dbConfigPath) ?? new DbConfig();
            return Results.Ok(cfg);
        });

        // --------------------------------------------------------------------
        // POST /api/config/db
        //
        // Atualiza a configuração do banco, salvando no arquivo apontado por
        // dbConfigPath. Espera um JSON compatível com DbConfig no body:
        //
        // {
        //   "Server": "...",
        //   "Database": "...",
        //   "User": "...",
        //   "Password": "...",
        //   ...
        // }
        //
        // Após salvar, é necessário reiniciar o app/serviço para aplicar.
        // --------------------------------------------------------------------
        group.MapPost("/db", (DbConfig cfg) =>
        {
            if (cfg is null)
                return Results.BadRequest("Configuração inválida.");

            try
            {
                DbConfig.Save(cfg, dbConfigPath);

                return Results.Ok(new
                {
                    message = "Configurações de banco salvas. Reinicie o app para aplicar."
                });
            }
            catch (Exception ex)
            {
                // Em produção o ideal seria usar ILogger; por enquanto log simples.
                Console.WriteLine($"Falha ao salvar DbConfig: {ex.Message}");
                return Results.Problem("Falha ao salvar configurações de banco.");
            }
        });
    }
}
