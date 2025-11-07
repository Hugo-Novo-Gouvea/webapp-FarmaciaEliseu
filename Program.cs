using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

var builder = WebApplication.CreateBuilder(args);

// conexão principal (aqui ainda está fixa no appsettings)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

/* ===================== CONFIG DB (NOVO) ===================== */
/* isso aqui só salva/pega um json com as configs do PC */

app.MapGet("/api/config/db", () =>
{
    var cfg = DbConfig.Load();
    return Results.Ok(cfg);
});

app.MapPost("/api/config/db", async (HttpContext http) =>
{
    var cfg = await JsonSerializer.DeserializeAsync<DbConfig>(http.Request.Body);
    if (cfg is null) return Results.BadRequest("Config inválida.");
    DbConfig.Save(cfg);
    return Results.Ok();
});

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

app.MapPost("/api/clientes", async (Cliente dto, AppDbContext db) =>
{
    var nome = (dto.Nome ?? "").Trim();
    if (string.IsNullOrWhiteSpace(nome))
        return Results.BadRequest("Nome é obrigatório.");

    var agora = DateTime.Now;

    string enderecoFinal;
    if (string.IsNullOrWhiteSpace(dto.Endereco))
    {
        enderecoFinal = "NÃO INFORMADO, 000, NÃO INFORMADO";
    }
    else
    {
        var partes = dto.Endereco.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var log = (partes.Length > 0 ? partes[0] : null);
        var num = (partes.Length > 1 ? partes[1] : null);
        var bai = (partes.Length > 2 ? partes[2] : null);
        log = string.IsNullOrWhiteSpace(log) ? "NÃO INFORMADO" : log.ToUpper();
        num = string.IsNullOrWhiteSpace(num) ? "000" : num.ToUpper();
        bai = string.IsNullOrWhiteSpace(bai) ? "NÃO INFORMADO" : bai.ToUpper();
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

app.MapPut("/api/clientes/{id:int}", async (int id, AppDbContext db, Cliente dto) =>
{
    var cliente = await db.Clientes.FindAsync(id);
    if (cliente is null)
        return Results.NotFound();

    var nome = (dto.Nome ?? "").Trim();
    if (string.IsNullOrWhiteSpace(nome))
        return Results.BadRequest("Nome é obrigatório.");

    string enderecoFinal;
    if (string.IsNullOrWhiteSpace(dto.Endereco))
    {
        enderecoFinal = "NÃO INFORMADO, 000, NÃO INFORMADO";
    }
    else
    {
        var partes = dto.Endereco.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var log = (partes.Length > 0 ? partes[0] : null);
        var num = (partes.Length > 1 ? partes[1] : null);
        var bai = (partes.Length > 2 ? partes[2] : null);
        log = string.IsNullOrWhiteSpace(log) ? "NÃO INFORMADO" : log.ToUpper();
        num = string.IsNullOrWhiteSpace(num) ? "000" : num.ToUpper();
        bai = string.IsNullOrWhiteSpace(bai) ? "NÃO INFORMADO" : bai.ToUpper();
        enderecoFinal = $"{log}, {num}, {bai}";
    }

    cliente.Nome = nome.ToUpper();
    cliente.Endereco = enderecoFinal;
    cliente.Rg = string.IsNullOrWhiteSpace(dto.Rg) ? "00.000.000-0" : dto.Rg;
    cliente.Cpf = string.IsNullOrWhiteSpace(dto.Cpf) ? "000.000.000-00" : dto.Cpf;
    cliente.Telefone = string.IsNullOrWhiteSpace(dto.Telefone) ? "(00)0000-0000" : dto.Telefone;
    cliente.Celular = string.IsNullOrWhiteSpace(dto.Celular) ? "(00)00000-0000" : dto.Celular;
    cliente.CodigoFichario = dto.CodigoFichario ?? 0;
    cliente.DataNascimento = dto.DataNascimento ?? DateTime.Today;
    cliente.DataUltimoRegistro = DateTime.Now;

    var movimentosDoCliente = await db.Movimentos
        .Where(m => m.ClientesId == cliente.ClientesId)
        .ToListAsync();
    if (movimentosDoCliente.Count > 0)
    {
        var agora2 = DateTime.Now;
        foreach (var m in movimentosDoCliente)
        {
            m.ClientesNome = cliente.Nome;
            m.DataUltimoRegistro = agora2;
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

/* ===================== PRODUTOS ===================== */

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
    var localizacao = string.IsNullOrWhiteSpace(dto.Localizacao) ? "NÃO INFORMADO" : dto.Localizacao.Trim().ToUpper();
    var laboratorio = string.IsNullOrWhiteSpace(dto.Laboratorio) ? "NÃO INFORMADO" : dto.Laboratorio.Trim().ToUpper();
    var principio = string.IsNullOrWhiteSpace(dto.Principio) ? "NÃO INFORMADO" : dto.Principio.Trim().ToUpper();
    var generico = (dto.Generico ?? "").Trim().ToUpper();
    if (generico != "SIM" && generico != "NAO")
        return Results.BadRequest("Campo 'Genérico' deve ser SIM ou NAO.");
    var codigoProduto = string.IsNullOrWhiteSpace(dto.CodigoProduto) ? "000000000" : dto.CodigoProduto.Trim();

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
    var localizacao = string.IsNullOrWhiteSpace(dto.Localizacao) ? "NÃO INFORMADO" : dto.Localizacao.Trim().ToUpper();
    var laboratorio = string.IsNullOrWhiteSpace(dto.Laboratorio) ? "NÃO INFORMADO" : dto.Laboratorio.Trim().ToUpper();
    var principio = string.IsNullOrWhiteSpace(dto.Principio) ? "NÃO INFORMADO" : dto.Principio.Trim().ToUpper();
    var generico = (dto.Generico ?? "").Trim().ToUpper();
    if (generico != "SIM" && generico != "NAO")
        return Results.BadRequest("Campo 'Genérico' deve ser SIM ou NAO.");
    var codigoProduto = string.IsNullOrWhiteSpace(dto.CodigoProduto) ? "000000000" : dto.CodigoProduto.Trim();

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

    var descricaoMudou = !string.Equals(descricaoAntiga, descricao, StringComparison.Ordinal);
    var precoMudou = precoVendaAntigo != dto.PrecoVenda;
    if (descricaoMudou || precoMudou)
    {
        var agora2 = DateTime.Now;
        var movimentosDoProduto = await db.Movimentos
            .Where(m => m.ProdutosId == produto.ProdutosId)
            .ToListAsync();

        if (movimentosDoProduto.Count > 0)
        {
            foreach (var m in movimentosDoProduto)
            {
                if (descricaoMudou)
                {
                    m.ProdutosDescricao = produto.Descricao;
                    m.DataUltimoRegistro = agora2;
                }
                if (precoMudou)
                {
                    m.PrecoUnitarioAtual = produto.PrecoVenda;
                    m.PrecoTotalAtual = m.PrecoUnitarioAtual * m.Quantidade;
                    m.DataUltimoRegistro = agora2;
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

/* ===================== FUNCIONÁRIOS ===================== */

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
        .Where(f => (f.Deletado == null || f.Deletado == false) && f.FuncionariosId != 1)
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

    funcionario.Nome = dto.Nome.Trim().ToUpper();
    funcionario.DataUltimoRegistro = DateTime.Now;

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

/* ===================== CONTAS A PAGAR ===================== */

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
        .Where(m => (m.Deletado == null || m.Deletado == false) && m.ClientesId == clienteId)
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

/* ===================== VENDAS ===================== */

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

    if (tipoCliente == "registrado")
    {
        if (payload.ClienteId is null)
            return Results.BadRequest("Cliente é obrigatório para cliente registrado.");
        var cliente = await db.Clientes.FindAsync(payload.ClienteId.Value);
        if (cliente is null)
            return Results.BadRequest("Cliente não encontrado.");
        clienteId = cliente.ClientesId;
        clienteNome = cliente.Nome;
    }
    else
    {
        var nome = (payload.ClienteNome ?? "").Trim();
        if (string.IsNullOrWhiteSpace(nome))
            return Results.BadRequest("Nome do cliente é obrigatório para venda avulsa.");
        clienteId = 1;
        clienteNome = nome.ToUpper();
    }

    var ultimoCodigo = await db.Movimentos.MaxAsync(m => (int?)m.CodigoMovimento) ?? 0;
    var codigoMovimento = ultimoCodigo + 1;

    var gravados = new List<Movimento>();
    var isDinheiro = tipoVenda == "dinheiro";

    foreach (var it in payload.Itens)
    {
        if (it.quantidade <= 0)
            return Results.BadRequest("Quantidade inválida em um dos itens.");
        var produto = await db.Produtos.FindAsync(it.produtoId);
        if (produto is null)
            return Results.BadRequest($"Produto {it.produtoId} não encontrado.");

        var precoUnit = produto.PrecoVenda;
        var qtd = it.quantidade;
        var desconto = it.desconto < 0 ? 0 : it.desconto;
        var totalBruto = precoUnit * qtd;
        var total = totalBruto - desconto;
        if (total < 0) total = 0;

        var valorPago = isDinheiro ? total : 0m;
        DateTime? dataPagamento = isDinheiro ? agora : null;

        var mov = new Movimento
        {
            CodigoMovimento = codigoMovimento,
            ProdutosId = produto.ProdutosId,
            ProdutosDescricao = produto.Descricao,
            ProdutosCodigoProduto = string.IsNullOrWhiteSpace(produto.CodigoProduto) ? "000000000" : produto.CodigoProduto,
            ClientesId = clienteId,
            ClientesNome = clienteNome,
            FuncionariosId = vendedor.FuncionariosId,
            FuncionariosNome = vendedor.Nome,
            Quantidade = qtd,
            PrecoUnitarioDiaVenda = precoUnit,
            PrecoTotalDiaVenda = totalBruto,
            PrecoUnitarioAtual = produto.PrecoVenda,
            PrecoTotalAtual = produto.PrecoVenda * qtd,
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

// impressão separada
app.MapPost("/api/vendas/imprimir", async (AppDbContext db, VendaPayload payload) =>
{
    var agora = DateTime.Now;

    var tipoVenda = (payload.TipoVenda ?? "").Trim().ToLower();
    var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();

    var vendedor = await db.Funcionarios.FindAsync(payload.VendedorId);
    string vendedorNome = vendedor?.Nome ?? "ATENDENTE";

    string clienteNome;
    string? codigoFichario = null;

    if (tipoCliente == "registrado" && payload.ClienteId is not null)
    {
        var cliente = await db.Clientes.FindAsync(payload.ClienteId.Value);
        if (cliente is not null)
        {
            clienteNome = cliente.Nome;
            if (cliente.CodigoFichario > 0)
                codigoFichario = cliente.CodigoFichario.ToString();
        }
        else
        {
            clienteNome = "CLIENTE";
        }
    }
    else
    {
        clienteNome = string.IsNullOrWhiteSpace(payload.ClienteNome)
            ? "CLIENTE"
            : payload.ClienteNome.ToUpper();
    }

    var itensCupom = new List<ReceiptPrinter.Item>();
    decimal totalDesconto = 0m;
    decimal totalFinal = 0m;

    if (payload.Itens is not null)
    {
        foreach (var it in payload.Itens)
        {
            var produto = await db.Produtos.FindAsync(it.produtoId);
            if (produto is null)
                continue;

            decimal preco = produto.PrecoVenda;
            decimal linha = (preco * it.quantidade) - it.desconto;
            if (linha < 0) linha = 0;

            itensCupom.Add(new ReceiptPrinter.Item(
                it.quantidade,
                produto.Descricao,
                preco,
                it.desconto
            ));

            totalDesconto += it.desconto;
            totalFinal += linha;
        }
    }

    bool isDinheiro = tipoVenda == "dinheiro";

    var cupomBytes = ReceiptPrinter.BuildReceipt(
        lojaNome: "FARMÁCIA DO ELISEU",
        lojaEndereco: "Rua xxxx, 000, Centro",
        lojaFone: "Fone (00) 00000-0000",
        dataHora: agora,
        clienteNome: clienteNome,
        vendedorNome: vendedorNome,
        itens: itensCupom,
        isDinheiro: isDinheiro,
        totalDesconto: totalDesconto,
        totalFinal: totalFinal,
        codigoFichario: codigoFichario
    );

    try
    {
        ReceiptPrinter.Print(cupomBytes, null);
        return Results.Ok(new { impresso = true });
    }
    catch (Exception ex)
    {
        Console.WriteLine("Falha ao imprimir cupom: " + ex.Message);
        return Results.Problem("Falha ao imprimir cupom.");
    }
});

/* ===================== MOVIMENTOS ===================== */

app.MapGet("/api/movimentos", async (
    AppDbContext db,
    int page = 1,
    int pageSize = 50,
    string? column = null,
    string? search = null
) =>
{
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 50;

    var query = db.Movimentos.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(search))
    {
        search = search.Trim();
        switch (column)
        {
            case "cliente":
                query = query.Where(m => m.ClientesNome != null && m.ClientesNome.Contains(search));
                break;

            case "movimento":
                // contém
                query = query.Where(m =>
                    EF.Functions.Like(m.CodigoMovimento.ToString(), $"%{search}%"));
                break;

            default:
                query = query.Where(m => m.ClientesNome != null && m.ClientesNome.Contains(search));
                break;
        }
    }

    var grouped = query
        .GroupBy(m => m.CodigoMovimento)
        .Select(g => new
        {
            codigoMovimento = g.Key,
            clienteNome = g.Select(x => x.ClientesNome).FirstOrDefault() ?? "CLIENTE",
            dataVenda = g.Max(x => x.DataVenda),
            valorTotal = g.Sum(x => x.PrecoTotalDiaVenda - x.Desconto),
            temDinheiro = g.Any(x => x.Deletado == true)
        });

    var total = await grouped.CountAsync();

    var items = await grouped
        .OrderByDescending(x => x.dataVenda)
        .ThenByDescending(x => x.codigoMovimento)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return Results.Ok(new
    {
        total,
        page,
        pageSize,
        items
    });
});

app.MapGet("/api/movimentos/{codigo:int}", async (int codigo, AppDbContext db) =>
{
    var itens = await db.Movimentos
        .AsNoTracking()
        .Where(m => m.CodigoMovimento == codigo)
        .OrderBy(m => m.MovimentosId)
        .ToListAsync();

    if (itens.Count == 0)
        return Results.NotFound();

    var header = new
    {
        codigoMovimento = codigo,
        clienteNome = itens.Select(i => i.ClientesNome).FirstOrDefault() ?? "CLIENTE",
        dataVenda = itens.Max(i => i.DataVenda),
        valorTotal = itens.Sum(i => i.PrecoTotalDiaVenda - i.Desconto)
    };

    var itensDto = itens.Select(i => new
    {
        i.MovimentosId,
        i.ProdutosId,
        i.ProdutosDescricao,
        i.Quantidade,
        precoUnitario = i.PrecoUnitarioDiaVenda,
        desconto = i.Desconto,
        valorItem = i.PrecoTotalDiaVenda - i.Desconto,
        deletado = i.Deletado
    });

    return Results.Ok(new { header, itens = itensDto });
});

app.Run();

/* ===================== SUPORTE ===================== */

public record IdsPayload(List<int> ids);

public class VendaPayload
{
    public string? TipoVenda { get; set; }
    public string? TipoCliente { get; set; }
    public int? ClienteId { get; set; }
    public string? ClienteNome { get; set; }
    public int VendedorId { get; set; }
    public List<VendaItemPayload> Itens { get; set; } = new();
}

public class VendaItemPayload
{
    public int produtoId { get; set; }
    public int quantidade { get; set; }
    public decimal desconto { get; set; }
}

// config que vamos salvar em disco
public class DbConfig
{
    public string mode { get; set; } = "windows"; // windows | sql
    public string target { get; set; } = "local"; // local | remoto
    public string server { get; set; } = "";
    public string database { get; set; } = "";
    public string username { get; set; } = "";
    public string password { get; set; } = "";
    public bool encrypt { get; set; } = false;
    public bool trustServerCertificate { get; set; } = false;

    private static string FilePath => Path.Combine(AppContext.BaseDirectory, "dbconfig.json");

    public static DbConfig Load()
    {
        try
        {
            if (File.Exists(FilePath))
            {
                var json = File.ReadAllText(FilePath);
                var cfg = JsonSerializer.Deserialize<DbConfig>(json);
                if (cfg != null) return cfg;
            }
        }
        catch { }
        return new DbConfig();
    }

    public static void Save(DbConfig cfg)
    {
        var json = JsonSerializer.Serialize(cfg, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(FilePath, json);
    }
}
