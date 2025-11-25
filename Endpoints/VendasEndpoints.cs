using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

namespace WebAppEstudo.Endpoints;

/// <summary>
/// Endpoints responsáveis pelo fluxo de vendas:
/// - Registrar venda (gravando em Movimentos)
/// - Gerar cupom de impressão em memória (sem gravar no banco)
/// </summary>
public static class VendasEndpoints
{
    /// <summary>
    /// Registra os endpoints de Vendas na aplicação.
    /// </summary>
    public static void MapVendasEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/vendas").WithTags("Vendas");

        // --------------------------------------------------------------------
        // POST /api/vendas
        // Registra uma venda completa gravando os itens na tabela Movimentos.
        // Essa rota é chamada pelo front de "Realizar venda".
        // --------------------------------------------------------------------
        group.MapPost("/", async (AppDbContext db, VendaPayload payload) =>
        {
            var agora = DateTime.Now;

            // Não faz sentido registrar venda sem itens.
            if (payload.Itens is null || payload.Itens.Count == 0)
                return Results.BadRequest("Nenhum item informado.");

            // Normaliza e valida tipo de venda.
            var tipoVenda = (payload.TipoVenda ?? "").Trim().ToLower();
            if (tipoVenda != "marcar" && tipoVenda != "dinheiro")
                return Results.BadRequest("Tipo de venda invalido.");

            // Normaliza e valida tipo de cliente.
            var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();
            if (tipoCliente != "registrado" && tipoCliente != "avulso")
                return Results.BadRequest("Tipo de cliente invalido.");

            // Vendedor é obrigatório em qualquer venda.
            if (payload.VendedorId <= 0)
                return Results.BadRequest("Vendedor e obrigatorio.");

            var vendedor = await db.Funcionarios.FindAsync(payload.VendedorId);
            if (vendedor is null)
                return Results.BadRequest("Vendedor nao encontrado.");

            int clienteId;
            string clienteNome;
            string? codigoFichario = null;

            // ----------------------------------------------------------------
            // Cliente REGISTRADO:
            // - Usa ID do cliente da tabela Clientes
            // - Traz Nome e, se existir, o Código de Fichário
            // ----------------------------------------------------------------
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
            // ----------------------------------------------------------------
            // Cliente AVULSO:
            // - Usa um "cliente genérico" (ID = 1) na base
            // - Nome digitado entra apenas no campo ClientesNome do Movimento
            // ----------------------------------------------------------------
            else
            {
                var nome = (payload.ClienteNome ?? "").Trim();
                if (string.IsNullOrWhiteSpace(nome))
                    return Results.BadRequest("Nome do cliente e obrigatorio para venda avulsa.");

                // ATENÇÃO: aqui existe um "número mágico".
                // clienteId = 1 representa o "cliente avulso genérico".
                // Isso está acoplado à base (precisa ter esse registro criado).
                clienteId = 1;
                clienteNome = nome.ToUpper();
            }

            // ----------------------------------------------------------------
            // Código de movimento (agrupador da venda).
            // Cada venda recebe um novo CódigoMovimento (sequencial).
            // ----------------------------------------------------------------
            int novoCodigoMovimento = 1;
            var maxCodigo = await db.Movimentos.MaxAsync(m => (int?)m.CodigoMovimento);
            if (maxCodigo is not null)
                novoCodigoMovimento = maxCodigo.Value + 1;

            var itensMovimento = new List<Movimento>();
            decimal totalGeral = 0;

            // ----------------------------------------------------------------
            // Monta cada item de venda em memória antes de persistir.
            // ----------------------------------------------------------------
            foreach (var it in payload.Itens)
            {
                var isAvulso = it.produtoId <= 0;
                Produto? prod = null;

                // Se não é avulso, precisa achar o produto na base.
                if (!isAvulso)
                {
                    prod = await db.Produtos.FindAsync(it.produtoId);
                    if (prod is null)
                        return Results.BadRequest($"Produto {it.produtoId} nao encontrado.");
                }

                // Quantidade padrão = 1 se vier 0 ou negativo.
                var quantidade = it.quantidade <= 0 ? 1 : it.quantidade;

                // Preço unitário informado pelo front OU preço de venda do produto.
                var precoUnitInformado = it.precoUnit ?? (prod?.PrecoVenda ?? 0m);

                // Desconto não pode ser negativo.
                var desconto = it.desconto < 0 ? 0 : it.desconto;

                var valorBruto = quantidade * precoUnitInformado;

                // Se desconto maior que o valor, limita ao valor (não deixa dar negativo).
                if (desconto > valorBruto) desconto = valorBruto;

                var valorLiquido = valorBruto - desconto;

                // Descrição do produto: se vier do payload usa essa,
                // senão usa descrição da base (ou "PRODUTO AVULSO" para item solto).
                var prodDescricao = !string.IsNullOrWhiteSpace(it.descricao)
                    ? it.descricao!.ToUpper()
                    : (isAvulso ? "PRODUTO AVULSO" : (prod?.Descricao ?? string.Empty));

                // Código do produto: se avulso, usa "000000000".
                // Se cadastrado, puxa da base.
                var codigoProduto = isAvulso ? "000000000" : (prod?.CodigoProduto ?? "000000000");

                // ATENÇÃO: mais um número mágico.
                // ProdutosId = 1 representa o "produto avulso genérico" no banco.
                var produtoIdPersistir = isAvulso ? 1 : prod!.ProdutosId;

                // Preços "do dia" (na data da venda) e "atuais".
                // Isso permite preservar o histórico mesmo se o preço for reajustado depois.
                var precoUnitarioDia = precoUnitInformado;
                var precoTotalDia = valorBruto;
                var precoUnitarioAtual = isAvulso ? precoUnitInformado : prod!.PrecoVenda;
                var precoTotalAtual = quantidade * precoUnitarioAtual;

                bool deletado;
                decimal valorPago;
                DateTime? dataPagamento;

                // ----------------------------------------------------------------
                // Regra de negócio financeira:
                //
                // - Se venda "DINHEIRO":
                //   - Deletado = true  => interpretado como "CONTA PAGA"
                //   - ValorPago = valorLiquido (já descontado)
                //   - DataPagamento = agora
                //
                // - Se venda "MARCAR":
                //   - Deletado = false => interpretado como "EM ABERTO"
                //   - ValorPago = 0
                //   - DataPagamento = null
                //
                // Isso conecta direto com Contas a Receber.
                // ----------------------------------------------------------------
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

                // Monta o registro de Movimento para este item.
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

            // Persiste todos os itens da venda de uma vez.
            db.Movimentos.AddRange(itensMovimento);
            await db.SaveChangesAsync();

            // Retorno amigável para o front.
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

        // --------------------------------------------------------------------
        // POST /api/vendas/imprimir
        // Gera o cupom em memória (Base64) SEM gravar nada novo no banco.
        // Útil para reimpressão / pré-visualização.
        // --------------------------------------------------------------------
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

            // Mesmo conceito de cliente registrado x avulso do endpoint anterior.
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

            // Montagem dos itens do cupom (sem gravar nada).
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
                // Usa a ReceiptPrinter para montar o cupom em bytes
                // e devolve em Base64 para o agente de impressão.
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
                    codigoMovimento: null   // aqui não há movimento persistido
                );

                var cupomBase64 = Convert.ToBase64String(cupomBytes);
                return Results.Ok(new { cupomBase64 });
            }
            catch (Exception ex)
            {
                // Log simples no console. Em produção, ideal seria ter logging estruturado.
                Console.WriteLine("Falha ao gerar cupom: " + ex.Message);
                return Results.Problem("Falha ao gerar o cupom.");
            }
        });
    }
}
