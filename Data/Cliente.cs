using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAppEstudo.Data
{
    [Table("clientes")]
    public class Cliente
    {
        [Key]
        [Column("clientesID")]
        public int ClientesId { get; set; }

        [Column("nome")]
        [Required]
        [MaxLength(200)]
        public string Nome { get; set; } = "";

        [Column("endereco")]
        [MaxLength(200)]
        public string? Endereco { get; set; }

        [Column("rg")]
        [MaxLength(50)]
        public string? Rg { get; set; }

        [Column("cpf")]
        [MaxLength(50)]
        public string? Cpf { get; set; }

        [Column("telefone")]
        [MaxLength(50)]
        public string? Telefone { get; set; }

        [Column("celular")]
        [MaxLength(50)]
        public string? Celular { get; set; }

        [Column("dataNascimento")]
        public DateTime? DataNascimento { get; set; }

        [Column("codigoFichario")]
        public int? CodigoFichario { get; set; }

        [Column("dataCadastro")]
        public DateTime? DataCadastro { get; set; }

        [Column("dataUltimoRegistro")]
        public DateTime? DataUltimoRegistro { get; set; }

        [Column("deletado")]
        public bool? Deletado { get; set; }
    }
}
