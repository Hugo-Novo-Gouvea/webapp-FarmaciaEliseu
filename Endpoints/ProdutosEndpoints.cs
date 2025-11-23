using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;

namespace WebAppEstudo.Endpoints;

public static class ProdutosEndpoints
{
    public static void MapProdutosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/produtos").WithTags("Produtos");

        // GET /api/produtos - Listar com paginação e pesquisa
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

            var query = db.Produtos
                .AsNoTracking()
                .Where(p => (p.Deletado == null || p.Deletado == false) && p.ProdutosId != 1)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                if (string.IsNullOrWhiteSpace(column) || column == "auto")
                {
                    // Busca "inteligente": código de barras OU descrição OU genérico
                    query = query.Where(p =>
                        (p.CodigoBarras != null && p.CodigoBarras.Contains(search)) ||
                        (p.Descricao != null && p.Descricao.Contains(search)) ||
                        (p.Generico != null && p.Generico.Contains(search))
                    );
                }
                else
                {
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
            }

            var total = await query.CountAsync();

            // Projeção leve (apenas colunas exibidas na grid)
            var itens = await query
                .OrderBy(p => p.Descricao)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new {
                    p.ProdutosId,
                    p.CodigoBarras,
                    p.Descricao,
                    p.PrecoCompra,
                    p.PrecoVenda,
                    p.Generico
                })
                .ToListAsync();

            return Results.Ok(new
            {
                total,
                page,
                pageSize,
                items = itens
            });
        });

        // GET /api/produtos/{id} - Buscar por ID
        group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var produto = await db.Produtos.FindAsync(id);
            return produto is not null ? Results.Ok(produto) : Results.NotFound();
        });

        // GET /api/produtos/busca-por-codigo/{valor} - Busca por c��digo de barras, c��digo interno ou ID
        group.MapGet("/busca-por-codigo/{valor}", async (string valor, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(valor))
                return Results.BadRequest("Valor Ǹ obrigat��rio.");

            valor = valor.Trim();

            var produto = await db.Produtos
                .AsNoTracking()
                .Where(p => (p.Deletado == null || p.Deletado == false) && p.ProdutosId != 1)
                .Where(p =>
                    p.CodigoBarras == valor ||
                    p.CodigoProduto == valor ||
                    p.ProdutosId.ToString() == valor
                )
                .Select(p => new
                {
                    p.ProdutosId,
                    p.CodigoProduto,
                    p.CodigoBarras,
                    p.Descricao,
                    p.PrecoVenda,
                    tipo = p.Generico
                })
                .FirstOrDefaultAsync();

            return produto is not null ? Results.Ok(produto) : Results.NotFound();
        });

        // GET /api/produtos/busca-por-descricao?filtro= - Lista produtos pelo texto da descri��ǜo
        group.MapGet("/busca-por-descricao", async (string? filtro, AppDbContext db, int take = 30) =>
        {
            if (take < 1) take = 10;
            if (take > 200) take = 200;

            var query = db.Produtos
                .AsNoTracking()
                .Where(p => (p.Deletado == null || p.Deletado == false) && p.ProdutosId != 1);

            if (!string.IsNullOrWhiteSpace(filtro))
            {
                filtro = filtro.Trim().ToUpper();
                query = query.Where(p => p.Descricao != null && p.Descricao.Contains(filtro));
            }

            var itens = await query
                .OrderBy(p => p.Descricao)
                .Take(take)
                .Select(p => new
                {
                    p.ProdutosId,
                    p.CodigoProduto,
                    p.CodigoBarras,
                    p.Descricao,
                    p.PrecoVenda,
                    tipo = p.Generico
                })
                .ToListAsync();

            return Results.Ok(itens);
        });

        // GET /api/produtos/lista-basica - Lista curta para o modal de busca de produtos
        group.MapGet("/lista-basica", async (AppDbContext db, int take = 100) =>
        {
            if (take < 1) take = 10;
            if (take > 300) take = 300;

            var itens = await db.Produtos
                .AsNoTracking()
                .Where(p => (p.Deletado == null || p.Deletado == false) && p.ProdutosId != 1)
                .OrderBy(p => p.Descricao)
                .Take(take)
                .Select(p => new
                {
                    p.ProdutosId,
                    p.CodigoProduto,
                    p.CodigoBarras,
                    p.Descricao,
                    p.PrecoVenda,
                    tipo = p.Generico
                })
                .ToListAsync();

            return Results.Ok(itens);
        });

        // POST /api/produtos - Criar novo produto
        group.MapPost("/", async (Produto dto, AppDbContext db) =>
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

        // PUT /api/produtos/{id} - Atualizar produto
        group.MapPut("/{id:int}", async (int id, AppDbContext db, Produto dto) =>
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

            // Se mudou descrição ou preço, reflete nos movimentos
            var descricaoMudou = !string.Equals(descricaoAntiga, descricao, StringComparison.Ordinal);
            var precoMudou = precoVendaAntigo != dto.PrecoVenda;
            if (descricaoMudou || precoMudou)
            {
                var agora = DateTime.Now;
                // Só movimentos não deletados, pra manter histórico dos pagos
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

        // DELETE /api/produtos/{id} - Soft delete
        group.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var produto = await db.Produtos.FindAsync(id);
            if (produto is null)
                return Results.NotFound();

            produto.Deletado = true;
            produto.DataUltimoRegistro = DateTime.Now;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
