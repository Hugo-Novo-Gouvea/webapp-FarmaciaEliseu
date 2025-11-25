using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using WebAppEstudo.Data;
using WebAppEstudo.Endpoints;

var builder = WebApplication.CreateBuilder(args);

//
// =========================================================
// 1. HOST / EXECUÇÃO COMO SERVIÇO WINDOWS
// =========================================================
//
// UseWindowsService permite que o app rode como serviço do Windows.
// Em modo desenvolvimento (rodando via dotnet run) também funciona,
// só muda o comportamento de logging/shutdown.
//
builder.Host.UseWindowsService();

//
// =========================================================
// 2. CONFIGURAÇÃO DO BANCO DE DADOS
// =========================================================
//
// Estratégia:
// - Tenta usar a connection string "DefaultConnection" do appsettings.
// - Se existir arquivo dbconfig.json válido, ele SOBRESCREVE a string,
//   permitindo apontar para outro servidor/banco sem recompilar.
// - Suporte a dois modos: Windows Auth (Trusted_Connection) e SQL Auth.
//
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;

// Caminho físico do arquivo de configuração do banco (dbconfig.json)
var dbConfigPath = Path.Combine(AppContext.BaseDirectory, "dbconfig.json");

// Por padrão, usa a connection string do appsettings
string finalConnectionString = defaultConn;

// Tenta carregar o dbconfig.json; se for válido, monta a connection string por ele
var cfgFromFile = DbConfig.Load(dbConfigPath);
if (cfgFromFile is not null &&
    !string.IsNullOrWhiteSpace(cfgFromFile.server) &&
    !string.IsNullOrWhiteSpace(cfgFromFile.database))
{
    finalConnectionString = BuildConnectionString(cfgFromFile);
}

// Registra o AppDbContext usando a connection string final
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(finalConnectionString));

var app = builder.Build();

//
// =========================================================
// 3. ARQUIVOS ESTÁTICOS (FRONT-END)
// =========================================================
//
// UseDefaultFiles:
//   - Procura por index.html, default.html, etc. na raiz wwwroot.
// UseStaticFiles:
//   - Serve qualquer arquivo estático em wwwroot (CSS, JS, imagens, páginas).
//
app.UseDefaultFiles();
app.UseStaticFiles();

//
// =========================================================
// 4. MAPEAMENTO DE ENDPOINTS (API REST)
// =========================================================
//
// Cada grupo de endpoints foi extraído para uma classe estática
// de extensão, deixando o Program.cs focado apenas em composição.
//
// Ordem aqui é mais "organizacional" do que técnica.
//
app.MapConfigEndpoints(dbConfigPath);   // /api/config
app.MapClientesEndpoints();             // /api/clientes
app.MapProdutosEndpoints();             // /api/produtos
app.MapFuncionariosEndpoints();         // /api/funcionarios
app.MapMovimentosEndpoints();           // /api/movimentos
app.MapContasPagarEndpoints();          // /api/contas
app.MapVendasEndpoints();               // /api/vendas

//
// =========================================================
// 5. START DA APLICAÇÃO
// =========================================================
app.Run();

//
// =========================================================
// 6. HELPER: MONTAGEM DE CONNECTION STRING
// =========================================================
//
// Constrói a connection string a partir do DbConfig,
// respeitando modo (windows / sql) e flags de segurança.
//
static string BuildConnectionString(DbConfig cfg)
{
    var parts = new List<string>
    {
        $"Server={cfg.server};",
        $"Database={cfg.database};"
    };

    // Autenticação integrada (Windows)
    if (cfg.mode == "windows")
    {
        parts.Add("Trusted_Connection=True;");
    }
    else
    {
        // Autenticação SQL Server
        parts.Add($"User Id={cfg.username};");
        parts.Add($"Password={cfg.password};");
    }

    // Opções de segurança extras
    if (cfg.encrypt)
        parts.Add("Encrypt=True;");
    if (cfg.trustServerCertificate)
        parts.Add("TrustServerCertificate=True;");

    return string.Concat(parts);
}
