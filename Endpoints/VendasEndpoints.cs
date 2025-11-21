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
                return Results.BadRequest("Tipo de venda inválido.");

            var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();
            if (tipoCliente != "registrado" && tipoCliente != "avulso")
                return Results.BadRequest("Tipo de cliente inválido.");

            if (payload.VendedorId <= 0)
                return Results.BadRequest("Vendedor é obrigatório.");

            var vendedor = await db.Funcionarios.FindAsync(payload.VendedorId);
            if (vendedor is null)
                return Results.BadRequest("Vendedor não encontrado.");

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

                // assumindo que existe um "CLIENTE AVULSO" no ID 1
                // se for outro ID na sua base, você ajusta aqui
                clienteId = 1;
                clienteNome = nome.ToUpper();
            }

            // código de movimento (agrupador da venda)
            int novoCodigoMovimento = 1;
            var maxCodigo = await db.Movimentos.MaxAsync(m => (int?)m.CodigoMovimento);
            if (maxCodigo is not null)
                novoCodigoMovimento = maxCodigo.Value + 1;

            var itensMovimento = new List<Movimento>();
            decimal totalGeral = 0;

            foreach (var it in payload.Itens)
            {
                var prod = await db.Produtos.FindAsync(it.produtoId);
                if (prod is null)
                    return Results.BadRequest($"Produto {it.produtoId} não encontrado.");

                var quantidade = it.quantidade <= 0 ? 1 : it.quantidade;
                var precoUnit = it.precoUnit ?? prod.PrecoVenda;
                var desconto = it.desconto;
                var valorBruto = quantidade * precoUnit;
                var valorLiquido = valorBruto - desconto;

                if (valorLiquido < 0) valorLiquido = 0;
                if (desconto < 0) desconto = 0;

                totalGeral += valorLiquido;

                var prodDescricao = string.IsNullOrWhiteSpace(it.descricao)
                    ? (prod.Descricao ?? string.Empty)
                    : it.descricao!.ToUpper();

                // regras de situação da conta
                bool deletado;          // true = pago, false = em aberto
                decimal valorPago;
                DateTime? dataPagamento;

                if (tipoVenda == "dinheiro")
                {
                    deletado = true;            // já nasce como pago -> não entra em Contas a Receber
                    valorPago = valorLiquido;   // o que entrou em caixa
                    dataPagamento = agora;
                }
                else
                {
                    deletado = false;           // fiado / marcar -> em aberto
                    valorPago = 0m;
                    dataPagamento = null;
                }

                var mov = new Movimento
                {
                    CodigoMovimento = novoCodigoMovimento,
                    ProdutosId = prod.ProdutosId,
                    ProdutosDescricao = prodDescricao,
                    ProdutosCodigoProduto = prod.CodigoProduto ?? string.Empty,
                    ClientesId = clienteId,
                    ClientesNome = clienteNome,
                    FuncionariosId = vendedor.FuncionariosId,
                    FuncionariosNome = vendedor!.Nome,
                    Quantidade = quantidade,
                    PrecoUnitarioDiaVenda = precoUnit,
                    PrecoTotalDiaVenda = valorLiquido,
                    PrecoUnitarioAtual = prod.PrecoVenda,
                    PrecoTotalAtual = quantidade * prod.PrecoVenda,
                    ValorPago = valorPago,
                    Desconto = desconto,
                    DataVenda = agora,
                    DataPagamento = dataPagamento,
                    DataCadastro = agora,
                    DataUltimoRegistro = agora,
                    // REGRA IMPORTANTE:
                    // - dinheiro  -> já nasce como "pago" (não aparece em Contas a Receber)
                    // - marcar    -> em aberto (vai para Contas a Receber)
                    Deletado = deletado
                };

                itensMovimento.Add(mov);
            }

            db.Movimentos.AddRange(itensMovimento);
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Venda registrado com sucesso.",
                total = totalGeral,
                vendedor = vendedor!.Nome,
                cliente = clienteNome,
                codigoMovimento = novoCodigoMovimento
            });
        });

        // POST /api/vendas/imprimir - Gera o cupom em Base64 (sem gravar nada novo)
        group.MapPost("/imprimir", async (AppDbContext db, VendaPayload payload) =>
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
                return Results.BadRequest("Vendedor não encontrado.");

            string clienteNome;
            string? codigoFichario = null;

            if (tipoCliente == "registrado")
            {
                if (payload.ClienteId is null)
                    return Results.BadRequest("Cliente é obrigatório para cliente registrado.");

                var cliente = await db.Clientes.FindAsync(payload.ClienteId.Value);
                if (cliente is null)
                    return Results.BadRequest("Cliente não encontrado.");

                clienteNome = cliente.Nome;
                codigoFichario = cliente.CodigoFichario?.ToString();
            }
            else
            {
                var nome = (payload.ClienteNome ?? "").Trim();
                if (string.IsNullOrWhiteSpace(nome))
                    return Results.BadRequest("Nome do cliente é obrigatório para venda avulsa.");

                clienteNome = nome.ToUpper();
            }

            var isDinheiro = tipoVenda == "dinheiro";

            var itensCupom = new List<ReceiptPrinter.Item>();
            decimal totalDesconto = 0;
            decimal totalFinal = 0;

            foreach (var it in payload.Itens)
            {
                var prod = await db.Produtos.FindAsync(it.produtoId);
                if (prod is null)
                    return Results.BadRequest($"Produto {it.produtoId} não encontrado.");

                var quantidade = it.quantidade <= 0 ? 1 : it.quantidade;
                var precoUnit = it.precoUnit ?? prod.PrecoVenda;
                var desconto = it.desconto;
                var valorBruto = quantidade * precoUnit;
                var valorLiquido = valorBruto - desconto;

                if (valorLiquido < 0) valorLiquido = 0;
                if (desconto < 0) desconto = 0;

                totalFinal += valorLiquido;
                totalDesconto += desconto;

                var prodDescricao = string.IsNullOrWhiteSpace(it.descricao)
                    ? (prod.Descricao ?? string.Empty)
                    : it.descricao!.ToUpper();

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
