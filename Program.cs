using Microsoft.EntityFrameworkCore;
using WebAppEstudo.Data;

var builder = WebApplication.CreateBuilder(args);

// pega a connection string do appsettings
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// registra o DbContext usando SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

var app = builder.Build();

app.UseDefaultFiles(); // procura index.html
app.UseStaticFiles();  // permite servir arquivos de wwwroot

app.MapGet("/api/clientes", async (AppDbContext db) =>
    await db.Clientes.ToListAsync());

app.Run();
