using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using WebAppEstudo.Data;
using WebAppEstudo.Endpoints;
using WebAppEstudo.Services;

var builder = WebApplication.CreateBuilder(args);

// =========================================================
// 1. HOST / EXECUÇÃO COMO SERVIÇO WINDOWS
// =========================================================
builder.Host.UseWindowsService();

// =========================================================
// 2. INJEÇÃO DE DEPENDÊNCIAS
// =========================================================
// Serviço de regras de negócio de vendas
builder.Services.AddScoped<VendaService>();

// OBS: Removemos PrintQueue e PrintWorker pois a impressão agora é no cliente (JS).

// =========================================================
// 3. CONFIGURAÇÃO DO BANCO DE DADOS (COM RETRY)
// =========================================================
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;
var dbConfigPath = Path.Combine(AppContext.BaseDirectory, "dbconfig.json");
string finalConnectionString = defaultConn;

// Tenta carregar o dbconfig.json
var cfgFromFile = DbConfig.Load(dbConfigPath);
if (cfgFromFile is not null &&
    !string.IsNullOrWhiteSpace(cfgFromFile.server) &&
    !string.IsNullOrWhiteSpace(cfgFromFile.database))
{
    finalConnectionString = BuildConnectionString(cfgFromFile);
}

// Registra o AppDbContext com RESILIÊNCIA (Retry Pattern) para evitar queda de conexão
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(finalConnectionString, sqlOptions => 
    {
        // Tenta reconectar automaticamente até 5 vezes se o banco piscar
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null);
    }));

var app = builder.Build();

// =========================================================
// 4. ARQUIVOS ESTÁTICOS (FRONT-END)
// =========================================================
app.UseDefaultFiles();
app.UseStaticFiles();

// =========================================================
// 5. MAPEAMENTO DE ENDPOINTS (API REST)
// =========================================================
app.MapConfigEndpoints(dbConfigPath);
app.MapClientesEndpoints();
app.MapProdutosEndpoints();
app.MapFuncionariosEndpoints();
app.MapMovimentosEndpoints();
app.MapContasPagarEndpoints();
app.MapVendasEndpoints();

app.Run();

// =========================================================
// 6. HELPER: MONTAGEM DE CONNECTION STRING
// =========================================================
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

    if (cfg.encrypt) parts.Add("Encrypt=True;");
    if (cfg.trustServerCertificate) parts.Add("TrustServerCertificate=True;");

    return string.Concat(parts);
}