using Microsoft.EntityFrameworkCore;

namespace WebAppEstudo.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Cliente> Clientes => Set<Cliente>();
    }

    public class Cliente
    {
        public int Id { get; set; }
        public string Nome { get; set; } = "";
        public string? Cpf { get; set; }
        public string? Telefone { get; set; }
    }
}
