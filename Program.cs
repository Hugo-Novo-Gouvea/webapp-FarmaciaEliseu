using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// LISTAR (só não deletados)
app.MapGet("/api/clientes", async (AppDbContext db) =>
    await db.Clientes
        .Where(c => (c.Deletado == null || c.Deletado == false) && c.ClientesId != 1)
        .ToListAsync());

// PEGAR UM
app.MapGet("/api/clientes/{id:int}", async (int id, AppDbContext db) =>
{
    var cliente = await db.Clientes.FindAsync(id);
    return cliente is not null ? Results.Ok(cliente) : Results.NotFound();
});

// ATUALIZAR
app.MapPut("/api/clientes/{id:int}", async (int id, AppDbContext db, Cliente dto) =>
{
    var cliente = await db.Clientes.FindAsync(id);
    if (cliente is null)
        return Results.NotFound();

    // campos editáveis
    cliente.Nome = dto.Nome;
    cliente.Endereco = string.IsNullOrWhiteSpace(dto.Endereco)
        ? "Não informado, 000, Não informado"
        : dto.Endereco;
    cliente.Rg = dto.Rg;
    cliente.Cpf = dto.Cpf;
    cliente.Telefone = dto.Telefone;
    cliente.Celular = dto.Celular;
    cliente.CodigoFichario = dto.CodigoFichario ?? 0;
    cliente.DataNascimento = dto.DataNascimento ?? DateTime.Today;

    // controlados pelo sistema
    cliente.DataUltimoRegistro = DateTime.Now;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// CRIAR
app.MapPost("/api/clientes", async (Cliente dto, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(dto.Nome))
        return Results.BadRequest("Nome é obrigatório.");

    var agora = DateTime.Now;

    var cliente = new Cliente
    {
        Nome = dto.Nome,
        Endereco = string.IsNullOrWhiteSpace(dto.Endereco)
            ? "Não informado, 000, Não informado"
            : dto.Endereco,
        Rg = dto.Rg,
        Cpf = dto.Cpf,
        Telefone = dto.Telefone,
        Celular = dto.Celular,
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

// DELETAR (soft)
app.MapDelete("/api/clientes/{id:int}", async (int id, AppDbContext db) =>
{
    var cliente = await db.Clientes.FindAsync(id);
    if (cliente is null)
        return Results.NotFound();

    cliente.Deletado = true;
    cliente.DataUltimoRegistro = DateTime.Now;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();
