using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;
using WebAppEstudo.Printing;

namespace WebAppEstudo.Services;

public class VendaService
{
    private readonly AppDbContext _db;

    // Constantes para evitar números mágicos espalhados
    private const int ID_CLIENTE_AVULSO = 1;
    private const int ID_PRODUTO_AVULSO = 1;
    private const string CODIGO_PRODUTO_AVULSO = "000000000";

    public VendaService(AppDbContext db)
    {
        _db = db;
    }

    // Resultado devolvido para o Endpoint
    public record ResultadoVenda(string Message, decimal Total, string Vendedor, string Cliente, int CodigoMovimento, string? CodigoFichario);

    public async Task<ResultadoVenda> RegistrarVendaAsync(VendaPayload payload)
    {
        var agora = DateTime.Now;

        // Validações Básicas
        if (payload.Itens is null || payload.Itens.Count == 0)
            throw new ArgumentException("Nenhum item informado.");

        var tipoVenda = (payload.TipoVenda ?? "").Trim().ToLower();
        if (tipoVenda != "marcar" && tipoVenda != "dinheiro")
            throw new ArgumentException("Tipo de venda inválido.");

        var tipoCliente = (payload.TipoCliente ?? "").Trim().ToLower();
        if (tipoCliente != "registrado" && tipoCliente != "avulso")
            throw new ArgumentException("Tipo de cliente inválido.");

        if (payload.VendedorId <= 0)
            throw new ArgumentException("Vendedor é obrigatório.");

        var vendedor = await _db.Funcionarios.FindAsync(payload.VendedorId);
        if (vendedor is null)
            throw new ArgumentException("Vendedor não encontrado.");

        // Identificação do Cliente
        int clienteId;
        string clienteNome;
        string? codigoFichario = null;

        if (tipoCliente == "registrado")
        {
            if (payload.ClienteId is null)
                throw new ArgumentException("ID do Cliente é obrigatório.");

            var cliente = await _db.Clientes.FindAsync(payload.ClienteId.Value);
            if (cliente is null)
                throw new ArgumentException("Cliente não encontrado.");

            clienteId = cliente.ClientesId;
            clienteNome = cliente.Nome;
            codigoFichario = cliente.CodigoFichario?.ToString();
        }
        else
        {
            var nome = (payload.ClienteNome ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nome))
                throw new ArgumentException("Nome é obrigatório para venda avulsa.");

            clienteId = ID_CLIENTE_AVULSO;
            clienteNome = nome.ToUpper();
        }

        // Gerar Novo Código de Movimento
        int novoCodigoMovimento = 1;
        var maxCodigo = await _db.Movimentos.MaxAsync(m => (int?)m.CodigoMovimento);
        if (maxCodigo is not null)
            novoCodigoMovimento = maxCodigo.Value + 1;

        var itensMovimento = new List<Movimento>();
        decimal totalGeral = 0;

        // Processar Itens
        foreach (var it in payload.Itens)
        {
            var isAvulso = it.produtoId <= 0;
            Produto? prod = null;

            if (!isAvulso)
            {
                prod = await _db.Produtos.FindAsync(it.produtoId);
                if (prod is null) throw new ArgumentException($"Produto {it.produtoId} não encontrado.");
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

            var codigoProduto = isAvulso ? CODIGO_PRODUTO_AVULSO : (prod?.CodigoProduto ?? CODIGO_PRODUTO_AVULSO);
            var produtoIdPersistir = isAvulso ? ID_PRODUTO_AVULSO : prod!.ProdutosId;

            var precoUnitarioAtual = isAvulso ? precoUnitInformado : prod!.PrecoVenda;
            var precoTotalAtual = quantidade * precoUnitarioAtual;

            bool deletado;
            decimal valorPago;
            DateTime? dataPagamento;

            if (tipoVenda == "dinheiro")
            {
                deletado = true; // Pago (Regra legada)
                valorPago = valorLiquido;
                dataPagamento = agora;
            }
            else
            {
                deletado = false; // Em aberto / Fiado
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
                PrecoUnitarioDiaVenda = precoUnitInformado,
                PrecoTotalDiaVenda = valorBruto,
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

        _db.Movimentos.AddRange(itensMovimento);
        await _db.SaveChangesAsync();

        return new ResultadoVenda(
            "Venda registrada com sucesso.",
            totalGeral,
            vendedor.Nome,
            clienteNome,
            novoCodigoMovimento,
            codigoFichario
        );
    }

    public async Task<byte[]> GerarCupomBytesAsync(VendaPayload payload, int? codigoMovimento)
    {
        var agora = DateTime.Now;
        var vendedor = await _db.Funcionarios.FindAsync(payload.VendedorId);
        
        // Logica simplificada de recuperação de cliente para impressão
        string clienteNome;
        string? codigoFichario = null;
        var tipoCliente = (payload.TipoCliente ?? "").ToLower();

        if (tipoCliente == "registrado" && payload.ClienteId.HasValue)
        {
            var cliente = await _db.Clientes.FindAsync(payload.ClienteId.Value);
            clienteNome = cliente?.Nome ?? "CLIENTE NAO ENCONTRADO";
            codigoFichario = cliente?.CodigoFichario?.ToString();
        }
        else
        {
            clienteNome = (payload.ClienteNome ?? "CONSUMIDOR").ToUpper();
        }

        var isDinheiro = (payload.TipoVenda ?? "").ToLower() == "dinheiro";
        var itensCupom = new List<ReceiptPrinter.Item>();
        decimal totalDesconto = 0;
        decimal totalFinal = 0;

        foreach (var it in payload.Itens ?? new List<ItemPayload>())
        {
            var isAvulso = it.produtoId <= 0;
            Produto? prod = null;
            if (!isAvulso) prod = await _db.Produtos.FindAsync(it.produtoId);

            var quantidade = it.quantidade <= 0 ? 1 : it.quantidade;
            var precoUnit = it.precoUnit ?? (prod?.PrecoVenda ?? 0m);
            var desconto = it.desconto < 0 ? 0 : it.desconto;
            var valorBruto = quantidade * precoUnit;
            if (desconto > valorBruto) desconto = valorBruto;
            
            totalFinal += (valorBruto - desconto);
            totalDesconto += desconto;

            var prodDescricao = !string.IsNullOrWhiteSpace(it.descricao)
               ? it.descricao!.ToUpper()
               : (isAvulso ? "PRODUTO AVULSO" : (prod?.Descricao ?? ""));

            itensCupom.Add(new ReceiptPrinter.Item(quantidade, prodDescricao, precoUnit, desconto));
        }

        return ReceiptPrinter.BuildReceipt(
            lojaNome: "FARMACIA DO ELISEU",
            dataHora: agora,
            clienteNome: clienteNome,
            vendedorNome: vendedor?.Nome ?? "VENDEDOR",
            itens: itensCupom,
            isDinheiro: isDinheiro,
            totalDesconto: totalDesconto,
            totalFinal: totalFinal,
            codigoFichario: codigoFichario,
            codigoMovimento: codigoMovimento
        );
    }
}