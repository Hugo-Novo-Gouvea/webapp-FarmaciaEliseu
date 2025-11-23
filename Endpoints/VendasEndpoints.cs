using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

namespace WebAppEstudo.Endpoints;

public static class VendasEndpoints
{
    public static void MapVendasEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/vendas").WithTags("Vendas");

        // POST /api/vendas - Registrar venda (grava em movimentos)
        group.MapPost("/", async (AppDbContext db, VendaPayload payload) =>
        {
            var agora = DateTime.Now;

            if (payload.Itens is null || payload.Itens.Count == 0)
                return Results.BadRequest("Nenhum item informado.");

            var tipoVenda = (payload.TipoVenda ?? "").Trim().ToLower();
            if (tipoVenda != "marcar" && tipoVenda != "dinheiro")
                return Results.BadRequest("Tipo de venda invalido.");

            var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();
            if (tipoCliente != "registrado" && tipoCliente != "avulso")
                return Results.BadRequest("Tipo de cliente invalido.");

            if (payload.VendedorId <= 0)
                return Results.BadRequest("Vendedor e obrigatorio.");

            var vendedor = await db.Funcionarios.FindAsync(payload.VendedorId);
            if (vendedor is null)
                return Results.BadRequest("Vendedor nao encontrado.");

            int clienteId;
            string clienteNome;
            string? codigoFichario = null;

            if (tipoCliente == "registrado")
            {
                if (payload.ClienteId is null)
                    return Results.BadRequest("Cliente e obrigatorio para cliente registrado.");

                var cliente = await db.Clientes.FindAsync(payload.ClienteId.Value);
                if (cliente is null)
                    return Results.BadRequest("Cliente nao encontrado.");

                clienteId = cliente.ClientesId;
                clienteNome = cliente.Nome;
                if (cliente.CodigoFichario.HasValue)
                    codigoFichario = cliente.CodigoFichario.Value.ToString();
            }
            else
            {
                var nome = (payload.ClienteNome ?? "").Trim();
                if (string.IsNullOrWhiteSpace(nome))
                    return Results.BadRequest("Nome do cliente e obrigatorio para venda avulsa.");

                clienteId = 1; // cliente generico avulso
                clienteNome = nome.ToUpper();
            }

            // codigo de movimento (agrupador da venda)
            int novoCodigoMovimento = 1;
            var maxCodigo = await db.Movimentos.MaxAsync(m => (int?)m.CodigoMovimento);
            if (maxCodigo is not null)
                novoCodigoMovimento = maxCodigo.Value + 1;

            var itensMovimento = new List<Movimento>();
            decimal totalGeral = 0;

            foreach (var it in payload.Itens)
            {
                var isAvulso = it.produtoId <= 0;
                Produto? prod = null;
                if (!isAvulso)
                {
                    prod = await db.Produtos.FindAsync(it.produtoId);
                    if (prod is null)
                        return Results.BadRequest($"Produto {it.produtoId} nao encontrado.");
                }

                var quantidade = it.quantidade <= 0 ? 1 : it.quantidade;
                var precoUnitInformado = it.precoUnit ?? (prod?.PrecoVenda ?? 0m);
                var desconto = it.desconto < 0 ? 0 : it.desconto;

                var valorBruto = quantidade * precoUnitInformado;
                if (desconto > valorBruto) desconto = valorBruto;
                var valorLiquido = valorBruto - desconto;

                var prodDescricao = !string.IsNullOrWhiteSpace(it.descricao)
                    ? it.descricao!.ToUpper()
                    : (isAvulso ? "PRODUTO AVULSO" : (prod?.Descricao ?? string.Empty));

                var codigoProduto = isAvulso ? "000000000" : (prod?.CodigoProduto ?? "000000000");
                var produtoIdPersistir = isAvulso ? 1 : prod!.ProdutosId;

                var precoUnitarioDia = precoUnitInformado;
                var precoTotalDia = valorBruto;
                var precoUnitarioAtual = isAvulso ? precoUnitInformado : prod!.PrecoVenda;
                var precoTotalAtual = quantidade * precoUnitarioAtual;

                bool deletado;
                decimal valorPago;
                DateTime? dataPagamento;

                if (tipoVenda == "dinheiro")
                {
                    deletado = true;            // pago
                    valorPago = valorLiquido;   // entra no caixa o liquido (ja com desconto)
                    dataPagamento = agora;
                }
                else
                {
                    deletado = false;           // fiado
                    valorPago = 0m;
                    dataPagamento = null;
                }

                totalGeral += valorLiquido;

                itensMovimento.Add(new Movimento
                {
                    CodigoMovimento = novoCodigoMovimento,
                    ProdutosId = produtoIdPersistir,
                    ProdutosDescricao = prodDescricao,
                    ProdutosCodigoProduto = codigoProduto,
                    ClientesId = clienteId,
                    ClientesNome = clienteNome,
                    FuncionariosId = vendedor.FuncionariosId,
                    FuncionariosNome = vendedor.Nome,
                    Quantidade = quantidade,
                    PrecoUnitarioDiaVenda = precoUnitarioDia,
                    PrecoTotalDiaVenda = precoTotalDia,
                    PrecoUnitarioAtual = precoUnitarioAtual,
                    PrecoTotalAtual = precoTotalAtual,
                    ValorPago = valorPago,
                    Desconto = desconto,
                    DataVenda = agora,
                    DataPagamento = dataPagamento,
                    DataCadastro = agora,
                    DataUltimoRegistro = agora,
                    Deletado = deletado
                });
            }

            db.Movimentos.AddRange(itensMovimento);
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Venda registrada com sucesso.",
                total = totalGeral,
                vendedor = vendedor.Nome,
                cliente = clienteNome,
                codigoMovimento = novoCodigoMovimento,
                codigoFichario
            });
        });

        // POST /api/vendas/imprimir - Gera o cupom em Base64 (sem gravar nada novo)
        group.MapPost("/imprimir", async (AppDbContext db, VendaPayload payload) =>
        {
            var agora = DateTime.Now;

            var tipoVenda = (payload.TipoVenda ?? "").Trim().ToLower();
            if (tipoVenda != "marcar" && tipoVenda != "dinheiro")
                return Results.BadRequest("Tipo de venda invalido.");

            var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();
            if (tipoCliente != "registrado" && tipoCliente != "avulso")
                return Results.BadRequest("Tipo de cliente invalido.");

            if (payload.Itens == null || payload.Itens.Count == 0)
                return Results.BadRequest("Lista de itens vazia.");

            var vendedor = await db.Funcionarios.FindAsync(payload.VendedorId);
            if (vendedor is null)
                return Results.BadRequest("Vendedor nao encontrado.");

            string clienteNome;
            string? codigoFichario = null;

            if (tipoCliente == "registrado")
            {
                if (payload.ClienteId is null)
                    return Results.BadRequest("Cliente e obrigatorio para cliente registrado.");

                var cliente = await db.Clientes.FindAsync(payload.ClienteId.Value);
                if (cliente is null)
                    return Results.BadRequest("Cliente nao encontrado.");

                clienteNome = cliente.Nome;
                if (cliente.CodigoFichario.HasValue)
                    codigoFichario = cliente.CodigoFichario.Value.ToString();
            }
            else
            {
                var nome = (payload.ClienteNome ?? "").Trim();
                if (string.IsNullOrWhiteSpace(nome))
                    return Results.BadRequest("Nome do cliente e obrigatorio para venda avulsa.");

                clienteNome = nome.ToUpper();
            }

            var isDinheiro = tipoVenda == "dinheiro";

            var itensCupom = new List<ReceiptPrinter.Item>();
            decimal totalDesconto = 0;
            decimal totalFinal = 0;

            foreach (var it in payload.Itens)
            {
                var isAvulso = it.produtoId <= 0;
                Produto? prod = null;
                if (!isAvulso)
                {
                    prod = await db.Produtos.FindAsync(it.produtoId);
                    if (prod is null)
                        return Results.BadRequest($"Produto {it.produtoId} nao encontrado.");
                }

                var quantidade = it.quantidade <= 0 ? 1 : it.quantidade;
                var precoUnit = it.precoUnit ?? (prod?.PrecoVenda ?? 0m);
                var desconto = it.desconto < 0 ? 0 : it.desconto;
                var valorBruto = quantidade * precoUnit;
                if (desconto > valorBruto) desconto = valorBruto;
                var valorLiquido = valorBruto - desconto;

                totalFinal += valorLiquido;
                totalDesconto += desconto;

                var prodDescricao = !string.IsNullOrWhiteSpace(it.descricao)
                    ? it.descricao!.ToUpper()
                    : (isAvulso ? "PRODUTO AVULSO" : (prod?.Descricao ?? string.Empty));

                itensCupom.Add(new ReceiptPrinter.Item(
                    Qty: quantidade,
                    Desc: prodDescricao,
                    Unit: precoUnit,
                    Discount: desconto
                ));
            }

            try
            {
                var cupomBytes = ReceiptPrinter.BuildReceipt(
                    lojaNome: "FARMACIA DO ELISEU",
                    dataHora: agora,
                    clienteNome: clienteNome,
                    vendedorNome: vendedor!.Nome,
                    itens: itensCupom,
                    isDinheiro: isDinheiro,
                    totalDesconto: totalDesconto,
                    totalFinal: totalFinal,
                    codigoFichario: codigoFichario,
                    codigoMovimento: null
                );

                var cupomBase64 = Convert.ToBase64String(cupomBytes);
                return Results.Ok(new { cupomBase64 });
            }
            catch (Exception ex)
            {
                Console.WriteLine("Falha ao gerar cupom: " + ex.Message);
                return Results.Problem("Falha ao gerar o cupom.");
            }
        });
    }
}
