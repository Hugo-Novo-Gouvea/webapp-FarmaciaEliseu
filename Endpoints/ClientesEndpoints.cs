using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;

namespace WebAppEstudo.Endpoints;

public static class ClientesEndpoints
{
    public static void MapClientesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/clientes").WithTags("Clientes");

        // GET /api/clientes - Listar com paginação e pesquisa
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

            var query = db.Clientes
                .AsNoTracking()
                .Where(c => (c.Deletado == null || c.Deletado == false) && c.ClientesId != 1)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();
                switch (column)
                {
                    case "cpf":
                        query = query.Where(c => c.Cpf != null && c.Cpf.Contains(search));
                        break;
                    case "telefone":
                        query = query.Where(c => c.Telefone != null && c.Telefone.Contains(search));
                        break;
                    case "celular":
                        query = query.Where(c => c.Celular != null && c.Celular.Contains(search));
                        break;
                    case "endereco":
                        query = query.Where(c => c.Endereco != null && c.Endereco.Contains(search));
                        break;
                    case "codigoFichario":
                        query = query.Where(c => c.CodigoFichario.HasValue &&
                                                 c.CodigoFichario.Value.ToString().Contains(search));
                        break;
                    default:
                        query = query.Where(c => c.Nome != null && c.Nome.Contains(search));
                        break;
                }
            }

            var total = await query.CountAsync();
            var itens = await query
                .OrderBy(c => c.Nome)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new { total, page, pageSize, items = itens });
        });

        // GET /api/clientes/{id} - Buscar por ID
        group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var cliente = await db.Clientes.FindAsync(id);
            return cliente is not null ? Results.Ok(cliente) : Results.NotFound();
        });

        // POST /api/clientes - Criar novo cliente
        group.MapPost("/", async (Cliente dto, AppDbContext db) =>
        {
            var nome = (dto.Nome ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nome))
                return Results.BadRequest("Nome é obrigatório.");

            var agora = DateTime.Now;

            string enderecoFinal;
            if (string.IsNullOrWhiteSpace(dto.Endereco))
            {
                enderecoFinal = "NAO INFORMADO, 000, NAO INFORMADO";
            }
            else
            {
                var partes = dto.Endereco.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var log = (partes.Length > 0 ? partes[0] : null);
                var num = (partes.Length > 1 ? partes[1] : null);
                var bai = (partes.Length > 2 ? partes[2] : null);
                log = string.IsNullOrWhiteSpace(log) ? "NAO INFORMADO" : log.ToUpper();
                num = string.IsNullOrWhiteSpace(num) ? "000" : num.ToUpper();
                bai = string.IsNullOrWhiteSpace(bai) ? "NAO INFORMADO" : bai.ToUpper();
                enderecoFinal = $"{log}, {num}, {bai}";
            }

            var cliente = new Cliente
            {
                Nome = nome.ToUpper(),
                Endereco = enderecoFinal,
                Rg = string.IsNullOrWhiteSpace(dto.Rg) ? "00.000.000-0" : dto.Rg,
                Cpf = string.IsNullOrWhiteSpace(dto.Cpf) ? "000.000.000-00" : dto.Cpf,
                Telefone = string.IsNullOrWhiteSpace(dto.Telefone) ? "(00)0000-0000" : dto.Telefone,
                Celular = string.IsNullOrWhiteSpace(dto.Celular) ? "(00)00000-0000" : dto.Celular,
                DataNascimento = dto.DataNascimento ?? DateTime.Today,
                CodigoFichario = dto.CodigoFichario ?? 0,
                Deletado = false,
                DataCadastro = agora,
                DataUltimoRegistro = agora
            };

            db.Clientes.Add(cliente);
            await db.SaveChangesAsync();

            return Results.Created($"/api/clientes/{cliente.ClientesId}", cliente);
        });

        // PUT /api/clientes/{id} - Atualizar cliente
        group.MapPut("/{id:int}", async (int id, AppDbContext db, Cliente dto) =>
        {
            var cliente = await db.Clientes.FindAsync(id);
            if (cliente is null)
                return Results.NotFound();

            var nome = (dto.Nome ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nome))
                return Results.BadRequest("Nome é obrigatório.");
            cliente.Nome = nome.ToUpper();

            string enderecoFinal;
            if (string.IsNullOrWhiteSpace(dto.Endereco))
            {
                enderecoFinal = "NAO INFORMADO, 000, NAO INFORMADO";
            }
            else
            {
                var partes = dto.Endereco.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var log = (partes.Length > 0 ? partes[0] : null);
                var num = (partes.Length > 1 ? partes[1] : null);
                var bai = (partes.Length > 2 ? partes[2] : null);
                log = string.IsNullOrWhiteSpace(log) ? "NAO INFORMADO" : log.ToUpper();
                num = string.IsNullOrWhiteSpace(num) ? "000" : num.ToUpper();
                bai = string.IsNullOrWhiteSpace(bai) ? "NAO INFORMADO" : bai.ToUpper();
                enderecoFinal = $"{log}, {num}, {bai}";
            }
            cliente.Endereco = enderecoFinal;

            cliente.Rg = string.IsNullOrWhiteSpace(dto.Rg) ? "00.000.000-0" : dto.Rg;
            cliente.Cpf = string.IsNullOrWhiteSpace(dto.Cpf) ? "000.000.000-00" : dto.Cpf;
            cliente.Telefone = string.IsNullOrWhiteSpace(dto.Telefone) ? "(00)0000-0000" : dto.Telefone;
            cliente.Celular = string.IsNullOrWhiteSpace(dto.Celular) ? "(00)00000-0000" : dto.Celular;
            cliente.CodigoFichario = dto.CodigoFichario ?? 0;
            cliente.DataNascimento = dto.DataNascimento ?? DateTime.Today;
            cliente.DataUltimoRegistro = DateTime.Now;

            // Reflete o nome nos movimentos
            var movimentosDoCliente = await db.Movimentos
                .Where(m => m.ClientesId == cliente.ClientesId)
                .ToListAsync();
            if (movimentosDoCliente.Count > 0)
            {
                var agora = DateTime.Now;
                foreach (var m in movimentosDoCliente)
                {
                    m.ClientesNome = cliente.Nome;
                    m.DataUltimoRegistro = agora;
                }
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // DELETE /api/clientes/{id} - Soft delete
        group.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var cliente = await db.Clientes.FindAsync(id);
            if (cliente is null)
                return Results.NotFound();

            if (cliente.ClientesId == 1)
                return Results.BadRequest("Cliente padrão não pode ser excluído.");

            cliente.Deletado = true;
            cliente.DataUltimoRegistro = DateTime.Now;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
