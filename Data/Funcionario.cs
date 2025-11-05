using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAppEstudo.Data
{
    [Table("funcionarios")]
    public class Funcionario
    {
        [Key]
        [Column("funcionariosID")]
        public int FuncionariosId { get; set; }

        [Column("nome")]
        [Required]
        [MaxLength(200)]
        public string Nome { get; set; } = "";

        [Column("dataCadastro")]
        public DateTime? DataCadastro { get; set; }

        [Column("dataUltimoRegistro")]
        public DateTime? DataUltimoRegistro { get; set; }

        [Column("deletado")]
        public bool? Deletado { get; set; }
    }
}

