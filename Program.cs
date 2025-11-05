using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

/* ===================== CLIENTES ===================== */

// LISTAR (com paginação e filtro)
app.MapGet("/api/clientes", async (
    AppDbContext db,
    int page = 1,
    int pageSize = 50,
    string? column = null,
    string? search = null
) =>
{
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 50;

    var query = db.Clientes
        .Where(c => (c.Deletado == null || c.Deletado == false) && c.ClientesId != 1)
        .AsQueryable();

    // filtro (nome, cpf etc.)
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
        default:
          // nome (padrão)
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

    return Results.Ok(new
    {
        total,
        page,
        pageSize,
        items = itens
    });
});

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


/* ===================== PRODUTOS ===================== */

// LISTAR (com paginação e filtro)
app.MapGet("/api/produtos", async (
    AppDbContext db,
    int page = 1,
    int pageSize = 50,
    string? column = null,
    string? search = null
) =>
{
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 50;

    var query = db.Produtos
        .Where(p => (p.Deletado == null || p.Deletado == false) && p.ProdutosId != 1)
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(search))
    {
        search = search.Trim();
        switch (column)
        {
            case "codigoBarras":
                query = query.Where(p => p.CodigoBarras != null && p.CodigoBarras.Contains(search));
                break;
            case "generico":
                query = query.Where(p => p.Generico != null && p.Generico.Contains(search));
                break;
            default:
                // descrição padrão
                query = query.Where(p => p.Descricao != null && p.Descricao.Contains(search));
                break;
        }
    }

    var total = await query.CountAsync();

    var itens = await query
        .OrderBy(p => p.Descricao)
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

// PEGAR UM
app.MapGet("/api/produtos/{id:int}", async (int id, AppDbContext db) =>
{
    var produto = await db.Produtos.FindAsync(id);
    return produto is not null ? Results.Ok(produto) : Results.NotFound();
});

// CRIAR
app.MapPost("/api/produtos", async (Produto dto, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(dto.CodigoBarras))
        return Results.BadRequest("Código de barras é obrigatório.");
    if (string.IsNullOrWhiteSpace(dto.Descricao))
        return Results.BadRequest("Descrição é obrigatória.");
    if (dto.PrecoCompra <= 0)
        return Results.BadRequest("Preço de compra é obrigatório.");
    if (dto.PrecoVenda <= 0)
        return Results.BadRequest("Preço de venda é obrigatório.");
    if (string.IsNullOrWhiteSpace(dto.Generico))
        return Results.BadRequest("Campo 'Genérico' é obrigatório.");

    var agora = DateTime.Now;

    var produto = new Produto
    {
        CodigoBarras = dto.CodigoBarras.Trim(),
        Descricao = dto.Descricao.Trim(),
        UnidadeMedida = dto.UnidadeMedida,
        PrecoCompra = dto.PrecoCompra,
        PrecoVenda = dto.PrecoVenda,
        Localizacao = dto.Localizacao,
        Laboratorio = dto.Laboratorio,
        Principio = dto.Principio,
        Generico = dto.Generico,
        CodigoProduto = dto.CodigoProduto,
        Deletado = false,
        DataCadastro = agora,
        DataUltimoRegistro = agora
    };

    db.Produtos.Add(produto);
    await db.SaveChangesAsync();

    return Results.Created($"/api/produtos/{produto.ProdutosId}", produto);
});

// ATUALIZAR
app.MapPut("/api/produtos/{id:int}", async (int id, AppDbContext db, Produto dto) =>
{
    var produto = await db.Produtos.FindAsync(id);
    if (produto is null)
        return Results.NotFound();

    if (string.IsNullOrWhiteSpace(dto.CodigoBarras))
        return Results.BadRequest("Código de barras é obrigatório.");
    if (string.IsNullOrWhiteSpace(dto.Descricao))
        return Results.BadRequest("Descrição é obrigatória.");
    if (dto.PrecoCompra <= 0)
        return Results.BadRequest("Preço de compra é obrigatório.");
    if (dto.PrecoVenda <= 0)
        return Results.BadRequest("Preço de venda é obrigatório.");
    if (string.IsNullOrWhiteSpace(dto.Generico))
        return Results.BadRequest("Campo 'Genérico' é obrigatório.");

    produto.CodigoBarras = dto.CodigoBarras.Trim();
    produto.Descricao = dto.Descricao.Trim();
    produto.UnidadeMedida = dto.UnidadeMedida;
    produto.PrecoCompra = dto.PrecoCompra;
    produto.PrecoVenda = dto.PrecoVenda;
    produto.Localizacao = dto.Localizacao;
    produto.Laboratorio = dto.Laboratorio;
    produto.Principio = dto.Principio;
    produto.Generico = dto.Generico;
    produto.CodigoProduto = dto.CodigoProduto;
    produto.DataUltimoRegistro = DateTime.Now;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// DELETAR (soft)
app.MapDelete("/api/produtos/{id:int}", async (int id, AppDbContext db) =>
{
    var produto = await db.Produtos.FindAsync(id);
    if (produto is null)
        return Results.NotFound();

    produto.Deletado = true;
    produto.DataUltimoRegistro = DateTime.Now;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();
