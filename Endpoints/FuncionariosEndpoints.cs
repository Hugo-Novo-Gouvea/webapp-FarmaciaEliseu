using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;

namespace WebAppEstudo.Endpoints;

public static class FuncionariosEndpoints
{
    public static void MapFuncionariosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/funcionarios").WithTags("Funcionários");

        // GET /api/funcionarios - Listar com paginação e pesquisa
        group.MapGet("/", async (
            AppDbContext db,
            int page = 1,
            int pageSize = 50,
            string? column = null,
            string? search = null
        ) =>
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 50;
            if (pageSize > 200) pageSize = 200;

            var query = db.Funcionarios
                .AsNoTracking()
                .Where(f => !f.Deletado && f.FuncionariosId != 1)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();
                query = query.Where(f => f.Nome != null && f.Nome.Contains(search));
            }

            var total = await query.CountAsync();

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

        // GET /api/funcionarios/{id} - Buscar por ID
        group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var funcionario = await db.Funcionarios.FindAsync(id);
            return funcionario is not null ? Results.Ok(funcionario) : Results.NotFound();
        });

        // POST /api/funcionarios - Criar novo funcionário
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

        // PUT /api/funcionarios/{id} - Atualizar funcionário
        group.MapPut("/{id:int}", async (int id, AppDbContext db, Funcionario dto) =>
        {
            var funcionario = await db.Funcionarios.FindAsync(id);
            if (funcionario is null)
                return Results.NotFound();

            if (string.IsNullOrWhiteSpace(dto.Nome))
                return Results.BadRequest("Nome é obrigatório.");

            var nomeNovo = dto.Nome.Trim().ToUpper();

            funcionario.Nome = nomeNovo;
            funcionario.DataUltimoRegistro = DateTime.Now;

            var movimentosDoFuncionario = await db.Movimentos
                .Where(m => m.FuncionariosId == funcionario.FuncionariosId)
                .ToListAsync();

            if (movimentosDoFuncionario.Count > 0)
            {
                var agora = DateTime.Now;
                foreach (var m in movimentosDoFuncionario)
                {
                    m.FuncionariosNome = nomeNovo;
                    m.DataUltimoRegistro = agora;
                }
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // DELETE /api/funcionarios/{id} - Soft delete
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
