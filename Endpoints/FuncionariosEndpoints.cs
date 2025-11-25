using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;

namespace WebAppEstudo.Endpoints;

/// <summary>
/// Endpoints de CRUD e consulta de Funcionários.
/// Usado tanto para cadastro quanto para lista de vendedores na tela de Vendas.
/// </summary>
public static class FuncionariosEndpoints
{
    /// <summary>
    /// Registra os endpoints de Funcionários na aplicação.
    /// </summary>
    public static void MapFuncionariosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/funcionarios").WithTags("Funcionários");

        // GET /api/funcionarios
        // Lista funcionários com paginação e pesquisa simples por nome.
        group.MapGet("/", async (
            AppDbContext db,
            int page = 1,
            int pageSize = 50,
            string? column = null,  // mantido para compat de assinatura (apesar de não usar)
            string? search = null
        ) =>
        {
            // Sanitiza paginação
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 200) pageSize = 200;

            // Base: funcionários não deletados e diferentes do ID 1 (reserva/sistema)
            var query = db.Funcionarios
                .AsNoTracking()
                .Where(f => !f.Deletado && f.FuncionariosId != 1)
                .AsQueryable();

            // Filtro por nome (case sensitive no SQL Server, mas suficiente pro cenário)
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();
                query = query.Where(f =>
                    f.Nome != null &&
                    f.Nome.Contains(search)
                );
            }

            var total = await query.CountAsync();

            // Para essa tela o front usa só Id + Nome, mas devolver o objeto completo
            // não quebra nada e simplifica o código.
            var itens = await query
                .OrderBy(f => f.Nome)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new
            {
                total,
                page,
                pageSize,
                items = itens
            });
        });

        // GET /api/funcionarios/{id}
        // Busca um funcionário específico pelo ID (tela de edição).
        group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var funcionario = await db.Funcionarios.FindAsync(id);
            return funcionario is not null ? Results.Ok(funcionario) : Results.NotFound();
        });

        // POST /api/funcionarios
        // Cria um novo funcionário.
        // OBS: ainda usamos a entidade Funcionario como DTO de entrada por simplicidade.
        group.MapPost("/", async (Funcionario dto, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return Results.BadRequest("Nome é obrigatório.");

            var agora = DateTime.Now;

            var funcionario = new Funcionario
            {
                Nome = dto.Nome.Trim().ToUpper(),
                Deletado = false,
                DataCadastro = agora,
                DataUltimoRegistro = agora
            };

            db.Funcionarios.Add(funcionario);
            await db.SaveChangesAsync();

            return Results.Created($"/api/funcionarios/{funcionario.FuncionariosId}", funcionario);
        });

        // PUT /api/funcionarios/{id}
        // Atualiza nome do funcionário e reflete nos Movimentos não deletados.
        group.MapPut("/{id:int}", async (int id, AppDbContext db, Funcionario dto) =>
        {
            var funcionario = await db.Funcionarios.FindAsync(id);
            if (funcionario is null)
                return Results.NotFound();

            if (string.IsNullOrWhiteSpace(dto.Nome))
                return Results.BadRequest("Nome é obrigatório.");

            var nomeNovo = dto.Nome.Trim().ToUpper();
            var agora = DateTime.Now;

            funcionario.Nome = nomeNovo;
            funcionario.DataUltimoRegistro = agora;

            // Atualiza nome “congelado” do funcionário nas vendas abertas
            // (mantemos histórico de registros deletados como estavam).
            var movimentosDoFuncionario = await db.Movimentos
                .Where(m => m.FuncionariosId == funcionario.FuncionariosId && m.Deletado == false)
                .ToListAsync();

            if (movimentosDoFuncionario.Count > 0)
            {
                foreach (var m in movimentosDoFuncionario)
                {
                    m.FuncionariosNome = nomeNovo;
                    m.DataUltimoRegistro = agora;
                }
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // DELETE /api/funcionarios/{id}
        // Soft delete: marca funcionário como deletado sem apagar do banco.
        group.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var funcionario = await db.Funcionarios.FindAsync(id);
            if (funcionario is null)
                return Results.NotFound();

            funcionario.Deletado = true;
            funcionario.DataUltimoRegistro = DateTime.Now;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
