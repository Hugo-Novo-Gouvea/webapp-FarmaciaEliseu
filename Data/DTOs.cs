using System.Collections.Generic;

namespace WebAppEstudo.Data
{
    public record IdsPayload(List<int> ids);

    public record VendaItemDto(
        int produtoId,
        int quantidade,
        decimal desconto
    );

    public class VendaPayload
    {
        public string? TipoVenda { get; set; } // "marcar" | "dinheiro"
        public string? TipoCliente { get; set; } // "registrado" | "avulso"
        public int? ClienteId { get; set; }
        public string? ClienteNome { get; set; }
        public int VendedorId { get; set; }
        public List<VendaItemDto> Itens { get; set; } = new();
    }
}
