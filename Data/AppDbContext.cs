using Microsoft.EntityFrameworkCore;

namespace WebAppEstudo.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Cliente> Clientes => Set<Cliente>();
        public DbSet<Produto> Produtos => Set<Produto>();
        public DbSet<Funcionario> Funcionarios => Set<Funcionario>();
        public DbSet<Movimento> Movimentos => Set<Movimento>();
    }
}
