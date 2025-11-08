using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAppEstudo.Data
{
    [Table("movimentos")]
    public class Movimento
    {
        [Key]
        [Column("movimentosID")]
        public int MovimentosId { get; set; }

        [Column("codigoMovimento")]
        public int CodigoMovimento { get; set; }

        [Column("produtosID")]
        public int ProdutosId { get; set; }

        [Column("produtosDescricao")]
        [Required]
        [MaxLength(200)]
        public string ProdutosDescricao { get; set; } = "";

        [Column("produtosCodigoProduto")]
        [Required]
        [MaxLength(9)]
        public string ProdutosCodigoProduto { get; set; } = "";

        [Column("clientesID")]
        public int ClientesId { get; set; }

        [Column("clientesNome")]
        [Required]
        [MaxLength(200)]
        public string ClientesNome { get; set; } = "";

        [Column("funcionariosID")]
        public int FuncionariosId { get; set; }

        [Column("funcionariosNome")]
        [Required]
        [MaxLength(200)]
        public string FuncionariosNome { get; set; } = "";

        [Column("quantidade")]
        public int Quantidade { get; set; }

        [Column("precoUnitarioDiaVenda", TypeName = "decimal(19,4)")]
        public decimal PrecoUnitarioDiaVenda { get; set; }

        [Column("precoTotalDiaVenda", TypeName = "decimal(19,4)")]
        public decimal PrecoTotalDiaVenda { get; set; }

        [Column("precoUnitarioAtual", TypeName = "decimal(19,4)")]
        public decimal PrecoUnitarioAtual { get; set; }

        [Column("precoTotalAtual", TypeName = "decimal(19,4)")]
        public decimal PrecoTotalAtual { get; set; }

        // existe na tabela: valorVenda
        [Column("valorVenda", TypeName = "decimal(19,4)")]
        public decimal ValorVenda { get; set; }

        [Column("valorPago", TypeName = "decimal(19,4)")]
        public decimal ValorPago { get; set; }

        [Column("desconto", TypeName = "decimal(19,4)")]
        public decimal Desconto { get; set; }

        [Column("DataVenda")]
        public DateTime? DataVenda { get; set; }

        [Column("DataPagamento")]
        public DateTime? DataPagamento { get; set; }

        [Column("dataCadastro")]
        public DateTime? DataCadastro { get; set; }

        [Column("dataUltimoRegistro")]
        public DateTime? DataUltimoRegistro { get; set; }

        [Column("deletado")]
        public bool? Deletado { get; set; }
    }
}
