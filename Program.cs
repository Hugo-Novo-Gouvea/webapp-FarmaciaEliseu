using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using WebAppEstudo.Data;
using WebAppEstudo.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Permite rodar como serviço do Windows
builder.Host.UseWindowsService();

// =========================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =========================
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
var dbConfigPath = Path.Combine(AppContext.BaseDirectory, "dbconfig.json");
string finalConnectionString = defaultConn;

var cfgFromFile = DbConfig.Load(dbConfigPath);
if (cfgFromFile is not null && !string.IsNullOrWhiteSpace(cfgFromFile.server) && !string.IsNullOrWhiteSpace(cfgFromFile.database))
{
    finalConnectionString = BuildConnectionString(cfgFromFile);
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(finalConnectionString));

var app = builder.Build();

// =========================
// ARQUIVOS ESTÁTICOS
// =========================
app.UseDefaultFiles();
app.UseStaticFiles();

// =========================
// MAPEAMENTO DE ENDPOINTS
// =========================
app.MapConfigEndpoints(dbConfigPath);
app.MapClientesEndpoints();
app.MapProdutosEndpoints();
app.MapFuncionariosEndpoints();
app.MapMovimentosEndpoints();
app.MapContasPagarEndpoints();
app.MapVendasEndpoints();

app.Run();

// =========================
// HELPER PARA CONNECTION STRING
// =========================
static string BuildConnectionString(DbConfig cfg)
{
    var parts = new List<string>
    {
        $"Server={cfg.server};",
        $"Database={cfg.database};"
    };

    if (cfg.mode == "windows")
    {
        parts.Add("Trusted_Connection=True;");
    }
    else
    {
        parts.Add($"User Id={cfg.username};");
        parts.Add($"Password={cfg.password};");
    }

    if (cfg.encrypt)
        parts.Add("Encrypt=True;");
    if (cfg.trustServerCertificate)
        parts.Add("TrustServerCertificate=True;");

    return string.Concat(parts);
}
