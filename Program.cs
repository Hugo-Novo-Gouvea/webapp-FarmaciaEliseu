using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting; // <-- adicionado
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

var builder = WebApplication.CreateBuilder(args);

// permite rodar como serviço do Windows
builder.Host.UseWindowsService();

// =========================
// 1. MONTA A CONNECTION STRING (lê o que o TI salvou)
// =========================
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
var dbConfigPath = Path.Combine(AppContext.BaseDirectory, "dbconfig.json");
string finalConnectionString = defaultConn;

var cfgFromFile = DbConfig.Load(dbConfigPath);
if (cfgFromFile is not null && !string.IsNullOrWhiteSpace(cfgFromFile.server) && !string.IsNullOrWhiteSpace(cfgFromFile.database))
{
    finalConnectionString = BuildConnectionString(cfgFromFile);
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(finalConnectionString));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// ===================================================
// 2. ENDPOINTS DE CONFIGURAÇÃO
// ===================================================
app.MapGet("/api/config/db", () =>
{
    var cfg = DbConfig.Load(dbConfigPath) ?? new DbConfig();
    return Results.Ok(cfg);
});

app.MapPost("/api/config/db", async (HttpContext http) =>
{
    var cfg = await JsonSerializer.DeserializeAsync<DbConfig>(http.Request.Body);
    if (cfg is null) return Results.BadRequest("Config inválida.");

    DbConfig.Save(cfg, dbConfigPath);

    return Results.Ok(new { message = "Configurações de banco salvas. Reinicie o app pra aplicar." });
});

// ===================================================
// 3. CLIENTES
// ===================================================
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

app.MapGet("/api/clientes/{id:int}", async (int id, AppDbContext db) =>
{
    var cliente = await db.Clientes.FindAsync(id);
    return cliente is not null ? Results.Ok(cliente) : Results.NotFound();
});

app.MapPut("/api/clientes/{id:int}", async (int id, AppDbContext db, Cliente dto) =>
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

    // reflete o nome nos movimentos
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

app.MapDelete("/api/clientes/{id:int}", async (int id, AppDbContext db) =>
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

app.MapPost("/api/clientes", async (Cliente dto, AppDbContext db) =>
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

// ===================================================
// 4. PRODUTOS
// ===================================================
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

app.MapGet("/api/produtos/{id:int}", async (int id, AppDbContext db) =>
{
    var produto = await db.Produtos.FindAsync(id);
    return produto is not null ? Results.Ok(produto) : Results.NotFound();
});

app.MapPost("/api/produtos", async (Produto dto, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(dto.CodigoBarras))
        return Results.BadRequest("Código de barras é obrigatório.");
    if (string.IsNullOrWhiteSpace(dto.Descricao))
        return Results.BadRequest("Descrição é obrigatória.");
    if (dto.PrecoCompra < 0)
        return Results.BadRequest("Preço de compra não pode ser negativo.");
    if (dto.PrecoVenda < 0)
        return Results.BadRequest("Preço de venda não pode ser negativo.");
    if (string.IsNullOrWhiteSpace(dto.Generico))
        return Results.BadRequest("Campo 'Genérico' é obrigatório.");

    string SomenteNumeros(string? v)
        => string.Concat((v ?? "").Where(char.IsDigit));

    var codigoBarras = SomenteNumeros(dto.CodigoBarras);
    var unidadeMedida = SomenteNumeros(dto.UnidadeMedida);

    var descricao = dto.Descricao.Trim().ToUpper();
    var localizacao = string.IsNullOrWhiteSpace(dto.Localizacao) ? "NAO INFORMADO" : dto.Localizacao.Trim().ToUpper();
    var laboratorio = string.IsNullOrWhiteSpace(dto.Laboratorio) ? "NAO INFORMADO" : dto.Laboratorio.Trim().ToUpper();
    var principio = string.IsNullOrWhiteSpace(dto.Principio) ? "NAO INFORMADO" : dto.Principio.Trim().ToUpper();
    var generico = (dto.Generico ?? "").Trim().ToUpper();
    if (generico != "SIM" && generico != "NAO")
        return Results.BadRequest("Campo 'Genérico' deve ser SIM ou NAO.");
    var codigoProduto = string.IsNullOrWhiteSpace(dto.CodigoProduto) ? "000000000" : dto.CodigoProduto.Trim().ToUpper();

    var agora = DateTime.Now;

    var produto = new Produto
    {
        CodigoBarras = codigoBarras,
        Descricao = descricao,
        UnidadeMedida = string.IsNullOrEmpty(unidadeMedida) ? "0" : unidadeMedida,
        PrecoCompra = dto.PrecoCompra,
        PrecoVenda = dto.PrecoVenda,
        Localizacao = localizacao,
        Laboratorio = laboratorio,
        Principio = principio,
        Generico = generico,
        CodigoProduto = codigoProduto,
        Deletado = false,
        DataCadastro = agora,
        DataUltimoRegistro = agora
    };

    db.Produtos.Add(produto);
    await db.SaveChangesAsync();

    return Results.Created($"/api/produtos/{produto.ProdutosId}", produto);
});

app.MapPut("/api/produtos/{id:int}", async (int id, AppDbContext db, Produto dto) =>
{
    var produto = await db.Produtos.FindAsync(id);
    if (produto is null)
        return Results.NotFound();

    if (string.IsNullOrWhiteSpace(dto.CodigoBarras))
        return Results.BadRequest("Código de barras é obrigatório.");
    if (string.IsNullOrWhiteSpace(dto.Descricao))
        return Results.BadRequest("Descrição é obrigatória.");
    if (dto.PrecoCompra < 0)
        return Results.BadRequest("Preço de compra não pode ser negativo.");
    if (dto.PrecoVenda < 0)
        return Results.BadRequest("Preço de venda não pode ser negativo.");
    if (string.IsNullOrWhiteSpace(dto.Generico))
        return Results.BadRequest("Campo 'Genérico' é obrigatório.");

    string SomenteNumeros(string? v)
        => string.Concat((v ?? "").Where(char.IsDigit));

    var codigoBarras = SomenteNumeros(dto.CodigoBarras);
    var unidadeMedida = SomenteNumeros(dto.UnidadeMedida);

    var descricao = dto.Descricao.Trim().ToUpper();
    var localizacao = string.IsNullOrWhiteSpace(dto.Localizacao) ? "NAO INFORMADO" : dto.Localizacao.Trim().ToUpper();
    var laboratorio = string.IsNullOrWhiteSpace(dto.Laboratorio) ? "NAO INFORMADO" : dto.Laboratorio.Trim().ToUpper();
    var principio = string.IsNullOrWhiteSpace(dto.Principio) ? "NAO INFORMADO" : dto.Principio.Trim().ToUpper();
    var generico = (dto.Generico ?? "").Trim().ToUpper();
    if (generico != "SIM" && generico != "NAO")
        return Results.BadRequest("Campo 'Genérico' deve ser SIM ou NAO.");
    var codigoProduto = string.IsNullOrWhiteSpace(dto.CodigoProduto) ? "000000000" : dto.CodigoProduto.Trim().ToUpper();

    var descricaoAntiga = produto.Descricao;
    var precoVendaAntigo = produto.PrecoVenda;

    produto.CodigoBarras = codigoBarras;
    produto.Descricao = descricao;
    produto.UnidadeMedida = string.IsNullOrEmpty(unidadeMedida) ? "0" : unidadeMedida;
    produto.PrecoCompra = dto.PrecoCompra;
    produto.PrecoVenda = dto.PrecoVenda;
    produto.Localizacao = localizacao;
    produto.Laboratorio = laboratorio;
    produto.Principio = principio;
    produto.Generico = generico;
    produto.CodigoProduto = codigoProduto;
    produto.DataUltimoRegistro = DateTime.Now;

    // se mudou descrição ou preço, reflete nos movimentos
    var descricaoMudou = !string.Equals(descricaoAntiga, descricao, StringComparison.Ordinal);
    var precoMudou = precoVendaAntigo != dto.PrecoVenda;
    if (descricaoMudou || precoMudou)
    {
        var agora = DateTime.Now;
        // só movimentos não deletados, pra manter histórico dos pagos
        var movimentosDoProduto = await db.Movimentos
            .Where(m => m.ProdutosId == produto.ProdutosId && m.Deletado == false)
            .ToListAsync();

        if (movimentosDoProduto.Count > 0)
        {
            foreach (var m in movimentosDoProduto)
            {
                if (descricaoMudou)
                {
                    m.ProdutosDescricao = produto.Descricao;
                    m.DataUltimoRegistro = agora;
                }
                if (precoMudou)
                {
                    m.PrecoUnitarioAtual = produto.PrecoVenda;
                    m.PrecoTotalAtual = m.PrecoUnitarioAtual * m.Quantidade;
                    m.DataUltimoRegistro = agora;
                }
            }
        }
    }

    await db.SaveChangesAsync();
    return Results.NoContent();
});

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

// ===================================================
// 5. FUNCIONÁRIOS
// ===================================================
app.MapGet("/api/funcionarios", async (
    AppDbContext db,
    int page = 1,
    int pageSize = 50,
    string? column = null,
    string? search = null
) =>
{
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 50;

    var query = db.Funcionarios
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

app.MapGet("/api/funcionarios/{id:int}", async (int id, AppDbContext db) =>
{
    var funcionario = await db.Funcionarios.FindAsync(id);
    return funcionario is not null ? Results.Ok(funcionario) : Results.NotFound();
});

app.MapPost("/api/funcionarios", async (Funcionario dto, AppDbContext db) =>
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

app.MapPut("/api/funcionarios/{id:int}", async (int id, AppDbContext db, Funcionario dto) =>
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

app.MapDelete("/api/funcionarios/{id:int}", async (int id, AppDbContext db) =>
{
    var funcionario = await db.Funcionarios.FindAsync(id);
    if (funcionario is null)
        return Results.NotFound();

    funcionario.Deletado = true;
    funcionario.DataUltimoRegistro = DateTime.Now;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ===================================================
// 6. CONTAS A PAGAR
// ===================================================
app.MapGet("/api/contas/clientes", async (AppDbContext db) =>
{
    var clientes = await db.Clientes
        .Where(c => (c.Deletado == null || c.Deletado == false) && c.ClientesId != 1)
        .OrderBy(c => c.Nome)
        .Select(c => new { c.ClientesId, c.Nome })
        .ToListAsync();
    return Results.Ok(clientes);
});

app.MapGet("/api/contas/movimentos", async (AppDbContext db, int clienteId) =>
{
    if (clienteId <= 0) return Results.BadRequest("clienteId inválido.");

    var movimentos = await db.Movimentos
        .Where(m => (m.Deletado == false) && m.ClientesId == clienteId)
        .OrderBy(m => m.DataVenda)
        .ToListAsync();

    return Results.Ok(movimentos);
});

app.MapPut("/api/contas/movimentos/pagar", async (AppDbContext db, IdsPayload payload) =>
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

// NOVO: imprimir cupom das contas pagas (modelo com valor)
app.MapPost("/api/contas/movimentos/imprimir", async (AppDbContext db, IdsPayload payload) =>
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

    // tentar pegar código do fichário
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
            lojaEndereco: "Rua xxxx, 000, Centro",
            lojaFone: "Fone (00) 00000-0000",
            dataHora: dataHora,
            clienteNome: clienteNome,
            vendedorNome: vendedorNome,
            itens: itens,
            isDinheiro: true,              // <-- modelo COM valor
            totalDesconto: totalDesconto,
            totalFinal: totalFinal,
            codigoFichario: codigoFichario
        );

        ReceiptPrinter.Print(cupomBytes, null);
    }
    catch (Exception ex)
    {
        Console.WriteLine("Falha ao imprimir contas pagas: " + ex.Message);
        return Results.Problem("Falha ao imprimir.");
    }

    return Results.Ok(new { message = "Cupom de contas pagas enviado para a impressora." });
});

// ===================================================
// 7. VENDAS
// ===================================================
app.MapPost("/api/vendas", async (AppDbContext db, VendaPayload payload) =>
{
    var agora = DateTime.Now;

    var tipoVenda = (payload.TipoVenda ?? "").Trim().ToLower();
    if (tipoVenda != "marcar" && tipoVenda != "dinheiro")
        return Results.BadRequest("Tipo de venda inválido.");

    var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();
    if (tipoCliente != "registrado" && tipoCliente != "avulso")
        return Results.BadRequest("Tipo de cliente inválido.");

    if (payload.Itens == null || payload.Itens.Count == 0)
        return Results.BadRequest("Lista de itens vazia.");

    var vendedor = await db.Funcionarios.FindAsync(payload.VendedorId);
    if (vendedor is null)
        return Results.BadRequest("Vendedor inválido.");

    int clienteId;
    string clienteNome;
    string? codigoFichario = null;

    if (tipoCliente == "registrado")
    {
        if (payload.ClienteId is null)
            return Results.BadRequest("Cliente é obrigatório para cliente registrado.");
        var cliente = await db.Clientes.FindAsync(payload.ClienteId.Value);
        if (cliente is null)
            return Results.BadRequest("Cliente não encontrado.");
        clienteId = cliente.ClientesId;
        clienteNome = cliente.Nome;
        codigoFichario = cliente.CodigoFichario?.ToString();
    }
    else
    {
        var nome = (payload.ClienteNome ?? "").Trim();
        if (string.IsNullOrWhiteSpace(nome))
            return Results.BadRequest("Nome do cliente é obrigatório para venda avulsa.");
        clienteId = 1;
        clienteNome = nome.ToUpper();
    }

    var maxCodigo = await db.Movimentos.MaxAsync(m => (int?)m.CodigoMovimento) ?? 0;
    var codigoMovimento = maxCodigo + 1;

    var gravados = new List<Movimento>();
    var isDinheiro = tipoVenda == "dinheiro";

    foreach (var it in payload.Itens)
    {
        if (it.quantidade <= 0)
            return Results.BadRequest("Quantidade inválida em um dos itens.");

        var produto = await db.Produtos.FindAsync(it.produtoId);
        if (produto is null)
            return Results.BadRequest($"Produto {it.produtoId} não encontrado.");

        var prodId = produto.ProdutosId;
        var prodDescricao = produto.Descricao;
        var prodCodigo = string.IsNullOrWhiteSpace(produto.CodigoProduto) ? "000000000" : produto.CodigoProduto;
        var precoUnit = produto.PrecoVenda;

        if (prodId == 1 || !string.IsNullOrWhiteSpace(it.descricao) || it.precoUnit is not null)
        {
            if (!string.IsNullOrWhiteSpace(it.descricao))
                prodDescricao = it.descricao!.ToUpper();
            prodCodigo = "000000000";
            if (it.precoUnit is not null)
                precoUnit = it.precoUnit.Value;
        }

        var qtd = it.quantidade;
        var desconto = it.desconto < 0 ? 0 : it.desconto;

        var totalDia = precoUnit * qtd;
        var totalFinal = totalDia - desconto;
        if (totalFinal < 0) totalFinal = 0;

        var valorPago = isDinheiro ? totalFinal : 0m;
        DateTime? dataPagamento = isDinheiro ? agora : null;

        var mov = new Movimento
        {
            CodigoMovimento = codigoMovimento,
            ProdutosId = prodId,
            ProdutosDescricao = prodDescricao,
            ProdutosCodigoProduto = prodCodigo,
            ClientesId = clienteId,
            ClientesNome = clienteNome,
            FuncionariosId = vendedor.FuncionariosId,
            FuncionariosNome = vendedor.Nome,
            Quantidade = qtd,

            PrecoUnitarioDiaVenda = precoUnit,
            PrecoTotalDiaVenda = totalDia,

            PrecoUnitarioAtual = precoUnit,
            PrecoTotalAtual = totalDia,

            ValorPago = valorPago,
            Desconto = desconto,
            DataVenda = agora,
            DataPagamento = dataPagamento,
            DataCadastro = agora,
            DataUltimoRegistro = agora,

            Deletado = isDinheiro
        };

        db.Movimentos.Add(mov);
        gravados.Add(mov);
    }

    await db.SaveChangesAsync();

    return Results.Created("/api/vendas", new { itens = gravados.Count, codigoMovimento });
});

// ===================================================
// 7.1. /api/vendas/imprimir
// ===================================================
app.MapPost("/api/vendas/imprimir", async (AppDbContext db, VendaPayload payload) =>
{
    var agora = DateTime.Now;

    var tipoVenda = (payload.TipoVenda ?? "").Trim().ToLower();
    if (tipoVenda != "marcar" && tipoVenda != "dinheiro")
        return Results.BadRequest("Tipo de venda inválido.");

    var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();
    if (tipoCliente != "registrado" && tipoCliente != "avulso")
        return Results.BadRequest("Tipo de cliente inválido.");

    if (payload.Itens == null || payload.Itens.Count == 0)
        return Results.BadRequest("Lista de itens vazia.");

    var vendedor = await db.Funcionarios.FindAsync(payload.VendedorId);
    if (vendedor is null)
        return Results.BadRequest("Vendedor inválido.");

    int clienteId;
    string clienteNome;
    string? codigoFichario = null;

    if (tipoCliente == "registrado")
    {
        if (payload.ClienteId is null)
            return Results.BadRequest("Cliente é obrigatório para cliente registrado.");
        var cliente = await db.Clientes.FindAsync(payload.ClienteId.Value);
        if (cliente is null)
            return Results.BadRequest("Cliente não encontrado.");
        clienteId = cliente.ClientesId;
        clienteNome = cliente.Nome;
        codigoFichario = cliente.CodigoFichario?.ToString();
    }
    else
    {
        var nome = (payload.ClienteNome ?? "").Trim();
        if (string.IsNullOrWhiteSpace(nome))
            return Results.BadRequest("Nome do cliente é obrigatório para venda avulsa.");
        clienteId = 1;
        clienteNome = nome.ToUpper();
    }

    var isDinheiro = tipoVenda == "dinheiro";

    var itensCupom = new List<ReceiptPrinter.Item>();
    decimal totalDesconto = 0;
    decimal totalFinal = 0;

    foreach (var it in payload.Itens)
    {
        var produto = await db.Produtos.FindAsync(it.produtoId);
        if (produto is null)
            return Results.BadRequest($"Produto {it.produtoId} não encontrado.");

        var prodDescricao = produto.Descricao;
        var precoUnit = produto.PrecoVenda;

        if (produto.ProdutosId == 1 || !string.IsNullOrWhiteSpace(it.descricao) || it.precoUnit is not null)
        {
            if (!string.IsNullOrWhiteSpace(it.descricao))
                prodDescricao = it.descricao!.ToUpper();
            if (it.precoUnit is not null)
                precoUnit = it.precoUnit.Value;
        }

        var qtd = it.quantidade;
        var desconto = it.desconto < 0 ? 0 : it.desconto;
        var totalDia = precoUnit * qtd;
        var totalItem = totalDia - desconto;
        if (totalItem < 0) totalItem = 0;

        itensCupom.Add(new ReceiptPrinter.Item(
            qtd,
            prodDescricao,
            precoUnit,
            desconto
        ));

        totalDesconto += desconto;
        totalFinal += totalItem;
    }

    try
    {
        var cupomBytes = ReceiptPrinter.BuildReceipt(
            lojaNome: "FARMACIA DO ELISEU",
            lojaEndereco: "Rua xxxx, 000, Centro",
            lojaFone: "Fone (00) 00000-0000",
            dataHora: agora,
            clienteNome: clienteNome,
            vendedorNome: vendedor.Nome,
            itens: itensCupom,
            isDinheiro: isDinheiro,
            totalDesconto: totalDesconto,
            totalFinal: totalFinal,
            codigoFichario: codigoFichario
        );

        ReceiptPrinter.Print(cupomBytes, null);
    }
    catch (Exception ex)
    {
        Console.WriteLine("Falha ao imprimir cupom: " + ex.Message);
        return Results.Problem("Falha ao imprimir.");
    }

    return Results.Ok(new { message = "Cupom enviado para a impressora." });
});

// ===================================================
// 8. MOVIMENTOS (lista + detalhes)
// ===================================================
app.MapGet("/api/movimentos", async (
    AppDbContext db,
    int page = 1,
    int pageSize = 50,
    string? search = null,
    string? column = null
) =>
{
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 50;

    var baseQuery = db.Movimentos
        .AsNoTracking()
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(search))
    {
        search = search.Trim();

        if (column == "cliente")
        {
            baseQuery = baseQuery.Where(m => m.ClientesNome != null && m.ClientesNome.Contains(search));
        }
        else if (column == "movimento")
        {
            baseQuery = baseQuery.Where(m => m.CodigoMovimento.ToString().Contains(search));
        }
        else
        {
            baseQuery = baseQuery.Where(m =>
                (m.ClientesNome != null && m.ClientesNome.Contains(search)) ||
                m.CodigoMovimento.ToString().Contains(search)
            );
        }
    }

    var linhas = await baseQuery
        .Select(m => new
        {
            m.CodigoMovimento,
            m.ClientesNome,
            m.DataVenda,
            valorCalculado = m.PrecoTotalAtual - m.Desconto
        })
        .ToListAsync();

    var agrupados = linhas
        .GroupBy(x => x.CodigoMovimento)
        .Select(g => new
        {
            codigoMovimento = g.Key,
            clienteNome = g.Max(x => x.ClientesNome),
            dataVenda = g.Max(x => x.DataVenda),
            valorTotal = g.Sum(x => x.valorCalculado)
        })
        .OrderByDescending(x => x.dataVenda)
        .ToList();

    var total = agrupados.Count;

    var itens = agrupados
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToList();

    return Results.Ok(new
    {
        total,
        page,
        pageSize,
        items = itens
    });
});

app.MapGet("/api/movimentos/{codigoMovimento:int}", async (int codigoMovimento, AppDbContext db) =>
{
    var itens = await db.Movimentos
        .AsNoTracking()
        .Where(m => m.CodigoMovimento == codigoMovimento)
        .OrderBy(m => m.MovimentosId)
        .ToListAsync();

    if (itens.Count == 0) return Results.NotFound();

    var header = new
    {
        codigoMovimento = codigoMovimento,
        clienteNome = itens.First().ClientesNome,
        dataVenda = itens.Max(x => x.DataVenda),
        valorTotal = itens.Sum(x => (x.PrecoTotalAtual - x.Desconto))
    };

    var itensDto = itens.Select(m => new
    {
        produtosDescricao = m.ProdutosDescricao,
        quantidade = m.Quantidade,
        precoUnitario = m.PrecoUnitarioAtual,
        desconto = m.Desconto,
        valorItem = m.PrecoTotalAtual - m.Desconto,
        pago = m.ValorPago,
        deletado = m.Deletado
    });

    return Results.Ok(new
    {
        header,
        itens = itensDto
    });
});

// ===================================================
// 8.1. IMPRIMIR MOVIMENTO (AJUSTADO)
// ===================================================
app.MapPost("/api/movimentos/{codigoMovimento:int}/imprimir", async (int codigoMovimento, AppDbContext db, MovimentoPrintRequest req) =>
{
    var filtro = (req?.filtro ?? "todos").Trim().ToLower();

    var movimentos = await db.Movimentos
        .Where(m => m.CodigoMovimento == codigoMovimento)
        .OrderBy(m => m.MovimentosId)
        .ToListAsync();

    if (movimentos.Count == 0)
        return Results.NotFound("Movimento não encontrado.");

    var clienteNome = movimentos.First().ClientesNome;
    var vendedorNome = movimentos.First().FuncionariosNome;
    var data = movimentos.Max(m => m.DataVenda);

    string? codigoFichario = null;
    var clienteId = movimentos.First().ClientesId;
    var cliente = await db.Clientes.FindAsync(clienteId);
    if (cliente is not null && cliente.CodigoFichario.HasValue)
        codigoFichario = cliente.CodigoFichario.Value.ToString();

    var pagos = movimentos.Where(m => m.Deletado == true).ToList();
    var naoPagos = movimentos.Where(m => m.Deletado == false).ToList();

    List<ReceiptPrinter.Item> ToItems(List<Movimento> list) =>
        list.Select(m => new ReceiptPrinter.Item(
            m.Quantidade,
            m.ProdutosDescricao,
            m.PrecoUnitarioDiaVenda,
            m.Desconto
        )).ToList();

    try
    {
        if (filtro == "pagos")
        {
            if (pagos.Count == 0)
                return Results.BadRequest("Nenhum item pago nesse movimento.");

            var itens = ToItems(pagos);
            var totalDesconto = pagos.Sum(m => m.Desconto);
            var totalFinal = pagos.Sum(m => m.PrecoTotalDiaVenda - m.Desconto);

            var bytes = ReceiptPrinter.BuildReceipt(
                lojaNome: "FARMACIA DO ELISEU",
                lojaEndereco: "Rua xxxx, 000, Centro",
                lojaFone: "Fone (00) 00000-0000",
                dataHora: data,
                clienteNome: clienteNome,
                vendedorNome: vendedorNome,
                itens: itens,
                isDinheiro: true,
                totalDesconto: totalDesconto,
                totalFinal: totalFinal,
                codigoFichario: codigoFichario
            );
            ReceiptPrinter.Print(bytes, null);
        }
        else if (filtro == "naopagos" || filtro == "não pagos" || filtro == "nao pagos")
        {
            if (naoPagos.Count == 0)
                return Results.BadRequest("Nenhum item em aberto nesse movimento.");

            var itens = ToItems(naoPagos);

            var bytes = ReceiptPrinter.BuildReceipt(
                lojaNome: "FARMACIA DO ELISEU",
                lojaEndereco: "Rua xxxx, 000, Centro",
                lojaFone: "Fone (00) 00000-0000",
                dataHora: data,
                clienteNome: clienteNome,
                vendedorNome: vendedorNome,
                itens: itens,
                isDinheiro: false,
                totalDesconto: 0,
                totalFinal: 0,
                codigoFichario: codigoFichario
            );
            ReceiptPrinter.Print(bytes, null);
        }
        else // TODOS -> usar modelo sem valor, com todos os itens
        {
            var itens = ToItems(movimentos);

            var bytes = ReceiptPrinter.BuildReceipt(
                lojaNome: "FARMACIA DO ELISEU",
                lojaEndereco: "Rua xxxx, 000, Centro",
                lojaFone: "Fone (00) 00000-0000",
                dataHora: data,
                clienteNome: clienteNome,
                vendedorNome: vendedorNome,
                itens: itens,
                isDinheiro: false,       // <--- modelo sem valores
                totalDesconto: 0,
                totalFinal: 0,
                codigoFichario: codigoFichario
            );
            ReceiptPrinter.Print(bytes, null);
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("Falha ao imprimir movimento: " + ex.Message);
        return Results.Problem("Falha ao imprimir.");
    }

    return Results.Ok(new { message = "Impressão enviada." });
});

app.Run();

// ===============================
// HELPERS / MODELOS DE CONFIG
// ===============================
static string BuildConnectionString(DbConfig cfg)
{
    var parts = new List<string>
    {
        $"Server={cfg.server};",
        $"Database={cfg.database};"
    };

    if (cfg.mode == "windows")
    {
        parts.Add("Trusted_Connection=True;");
    }
    else
    {
        parts.Add($"User Id={cfg.username};");
        parts.Add($"Password={cfg.password};");
    }

    if (cfg.encrypt)
        parts.Add("Encrypt=True;");
    if (cfg.trustServerCertificate)
        parts.Add("TrustServerCertificate=True;");

    return string.Concat(parts);
}

namespace WebAppEstudo.Data
{
    public class DbConfig
    {
        public string mode { get; set; } = "windows";
        public string? target { get; set; }
        public string server { get; set; } = "";
        public string database { get; set; } = "";
        public string username { get; set; } = "";
        public string password { get; set; } = "";
        public bool encrypt { get; set; } = false;
        public bool trustServerCertificate { get; set; } = false;

        public static DbConfig? Load(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    var json = File.ReadAllText(path);
                    return JsonSerializer.Deserialize<DbConfig>(json);
                }
            }
            catch { }
            return new DbConfig();
        }

        public static void Save(DbConfig cfg, string path)
        {
            var json = JsonSerializer.Serialize(cfg, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(path, json);
        }
    }

    public class MovimentoPrintRequest
    {
        public string? filtro { get; set; }
    }
}
