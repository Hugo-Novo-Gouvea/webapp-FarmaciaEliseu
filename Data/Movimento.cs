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

        [Required]
        [MaxLength(200)]
        [Column("produtosDescricao")]
        public string ProdutosDescricao { get; set; } = string.Empty;

        [Required]
        [MaxLength(9)]
        [Column("produtosCodigoProduto")]
        public string ProdutosCodigoProduto { get; set; } = string.Empty;

        [Column("clientesID")]
        public int ClientesId { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("clientesNome")]
        public string ClientesNome { get; set; } = string.Empty;

        [Column("funcionariosID")]
        public int FuncionariosId { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("funcionariosNome")]
        public string FuncionariosNome { get; set; } = string.Empty;

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

        // não existe valorVenda na tabela, então não colocamos

        [Column("valorPago", TypeName = "decimal(19,4)")]
        public decimal ValorPago { get; set; }

        [Column("desconto", TypeName = "decimal(19,4)")]
        public decimal Desconto { get; set; }

        // no script do banco isso é NOT NULL
        [Column("DataVenda")]
        public DateTime DataVenda { get; set; }

        [Column("DataPagamento")]
        public DateTime? DataPagamento { get; set; }

        [Column("dataCadastro")]
        public DateTime DataCadastro { get; set; }

        [Column("dataUltimoRegistro")]
        public DateTime DataUltimoRegistro { get; set; }

        [Column("deletado")]
        public bool Deletado { get; set; }
    }
}
