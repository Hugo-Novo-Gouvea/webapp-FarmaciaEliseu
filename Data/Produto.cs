using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAppEstudo.Data
{
    [Table("produtos")]
    public class Produto
    {
        [Key]
        [Column("produtosID")]
        public int ProdutosId { get; set; }

        [Column("descricao")]
        [Required]
        [MaxLength(200)]
        public string Descricao { get; set; } = "";

        [Column("unidadeMedida")]
        [MaxLength(200)]
        public string? UnidadeMedida { get; set; }

        [Column("precoCompra", TypeName = "decimal(19,4)")]
        [Required]
        public decimal PrecoCompra { get; set; }

        [Column("precoVenda", TypeName = "decimal(19,4)")]
        [Required]
        public decimal PrecoVenda { get; set; }

        [Column("localizacao")]
        [MaxLength(200)]
        public string? Localizacao { get; set; }

        [Column("laboratorio")]
        [MaxLength(200)]
        public string? Laboratorio { get; set; }

        [Column("principio")]
        [MaxLength(200)]
        public string? Principio { get; set; }

        [Column("generico")]
        [Required]
        [MaxLength(3)]
        public string Generico { get; set; } = "";

        [Column("codigoProduto")]
        [MaxLength(9)]
        public string? CodigoProduto { get; set; }

        [Column("codigoBarras")]
        [Required]
        [MaxLength(50)]
        public string CodigoBarras { get; set; } = "";

        [Column("dataCadastro")]
        public DateTime? DataCadastro { get; set; }

        [Column("dataUltimoRegistro")]
        public DateTime? DataUltimoRegistro { get; set; }

        [Column("deletado")]
        public bool? Deletado { get; set; }
    }
}
