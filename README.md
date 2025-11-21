# Sistema de Gestão - Farmácia do Eliseu

Sistema web completo para gerenciamento de farmácia, desenvolvido em ASP.NET Core com arquitetura Minimal API e frontend responsivo.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Requisitos](#requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Funcionalidades](#funcionalidades)
- [Endpoints da API](#endpoints-da-api)
- [Banco de Dados](#banco-de-dados)
- [Execução como Serviço Windows](#execução-como-serviço-windows)
- [Desenvolvimento](#desenvolvimento)
- [Manutenção](#manutenção)

## 🎯 Visão Geral

O **Sistema de Gestão - Farmácia do Eliseu** é uma aplicação web completa que permite o gerenciamento de:

- **Clientes**: Cadastro completo com informações pessoais e endereço
- **Produtos**: Controle de estoque com preços, códigos de barras e localização
- **Funcionários**: Gerenciamento de vendedores
- **Vendas**: Registro de vendas à vista (dinheiro) ou a prazo (marcado)
- **Movimentos**: Histórico completo de transações
- **Contas a Pagar**: Controle de contas em aberto dos clientes

O sistema implementa **soft delete** em todas as entidades, mantendo histórico completo e integridade referencial.

## 🛠️ Tecnologias Utilizadas

### Backend
- **ASP.NET Core 6.0+** - Framework web
- **Entity Framework Core** - ORM para acesso ao banco de dados
- **SQL Server** - Banco de dados relacional
- **Minimal APIs** - Arquitetura de endpoints simplificada

### Frontend
- **HTML5** / **CSS3** / **JavaScript (ES6+)**
- **Bootstrap 5** - Framework CSS responsivo
- **Fetch API** - Comunicação com backend

### Infraestrutura
- **Windows Service** - Execução como serviço do Windows
- **Impressão Térmica** - Suporte para impressoras de cupom

## 🏗️ Arquitetura do Sistema

O sistema segue uma arquitetura modular e organizada:

```
webapp-FarmaciaEliseu/
│
├── Data/                      # Camada de dados
│   ├── AppDbContext.cs        # Contexto do Entity Framework
│   ├── Cliente.cs             # Modelo de Cliente
│   ├── Produto.cs             # Modelo de Produto
│   ├── Funcionario.cs         # Modelo de Funcionário
│   ├── Movimento.cs           # Modelo de Movimento
│   ├── DTOs.cs                # Data Transfer Objects
│   └── DbConfig.cs            # Configuração de banco
│
├── Endpoints/                 # Endpoints da API (modularizados)
│   ├── ClientesEndpoints.cs
│   ├── ProdutosEndpoints.cs
│   ├── FuncionariosEndpoints.cs
│   ├── MovimentosEndpoints.cs
│   ├── ContasPagarEndpoints.cs
│   ├── VendasEndpoints.cs
│   └── ConfigEndpoints.cs
│
├── Printing/                  # Sistema de impressão
│   ├── rawPrinterHelper.cs
│   └── receiptPrinter.cs
│
├── Wwwroot/                   # Frontend
│   ├── Css/                   # Estilos
│   ├── Js/                    # Scripts JavaScript
│   ├── Pages/                 # Páginas HTML
│   └── index.html             # Página inicial
│
├── Program.cs                 # Ponto de entrada da aplicação
├── appsettings.json           # Configurações da aplicação
└── README.md                  # Documentação
```

### Princípios Arquiteturais

1. **Separação de Responsabilidades**: Cada módulo tem uma responsabilidade clara
2. **Modularização**: Endpoints organizados por domínio de negócio
3. **Reutilização**: Lógica comum centralizada
4. **Manutenibilidade**: Código limpo e bem documentado
5. **Performance**: Consultas otimizadas com projeções e paginação

## 📁 Estrutura do Projeto

### Camada de Dados (Data/)

Contém os modelos de domínio e configuração do Entity Framework:

- **AppDbContext**: Contexto do banco de dados
- **Modelos**: Cliente, Produto, Funcionario, Movimento
- **DTOs**: Objetos de transferência de dados
- **DbConfig**: Gerenciamento de configuração de conexão

### Camada de API (Endpoints/)

Endpoints organizados por domínio, seguindo padrão RESTful:

- **ClientesEndpoints**: CRUD de clientes
- **ProdutosEndpoints**: CRUD de produtos
- **FuncionariosEndpoints**: CRUD de funcionários
- **MovimentosEndpoints**: Consulta e impressão de movimentos
- **ContasPagarEndpoints**: Gestão de contas a receber
- **VendasEndpoints**: Registro de vendas
- **ConfigEndpoints**: Configuração do sistema

### Camada de Apresentação (Wwwroot/)

Interface web responsiva com Bootstrap:

- **Pages/**: Páginas HTML de cada módulo
- **Js/**: Scripts JavaScript para interação
- **Css/**: Estilos customizados

## 📦 Requisitos

### Software Necessário

- **.NET 6.0 SDK** ou superior
- **SQL Server 2016** ou superior (Express, Standard ou Enterprise)
- **Windows Server 2012** ou superior (para execução como serviço)
- **Navegador moderno** (Chrome, Firefox, Edge)

### Hardware Recomendado

- **Processador**: 2 GHz ou superior
- **RAM**: 4 GB mínimo (8 GB recomendado)
- **Disco**: 500 MB para aplicação + espaço para banco de dados
- **Impressora Térmica** (opcional, para emissão de cupons)

## ⚙️ Instalação e Configuração

### 1. Clonar ou Extrair o Projeto

```bash
# Se usando Git
git clone <url-do-repositorio>

# Ou extrair o arquivo ZIP para uma pasta
```

### 2. Configurar o Banco de Dados

#### Opção A: Via Interface Web (Recomendado)

1. Execute a aplicação pela primeira vez
2. Acesse `http://localhost:5000`
3. Clique em "Configurações"
4. Preencha os dados de conexão:
   - **Servidor**: Nome ou IP do SQL Server
   - **Banco de Dados**: Nome do banco
   - **Modo**: Windows (autenticação integrada) ou SQL Server
   - **Usuário/Senha**: Se modo SQL Server

#### Opção B: Via Arquivo de Configuração

Edite `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=SERVIDOR;Database=FarmaciaEliseu;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

### 3. Criar o Banco de Dados

Execute o script SQL fornecido em `docs/database-schemas/` para criar as tabelas:

```sql
-- Criar banco
CREATE DATABASE FarmaciaEliseu;
GO

USE FarmaciaEliseu;
GO

-- Executar scripts de criação de tabelas
-- (Ver arquivo completo em docs/database-schemas/)
```

### 4. Compilar e Executar

```bash
# Navegar até a pasta do projeto
cd webapp-FarmaciaEliseu

# Restaurar dependências
dotnet restore

# Compilar
dotnet build

# Executar
dotnet run
```

A aplicação estará disponível em:
- **HTTP**: http://localhost:5000
- **HTTPS**: https://localhost:5001

## 🚀 Funcionalidades

### 1. Gestão de Clientes

- ✅ Cadastro completo (nome, CPF, RG, endereço, telefones)
- ✅ Pesquisa por nome, CPF, endereço ou código fichário
- ✅ Edição de dados cadastrais
- ✅ Soft delete (exclusão lógica)
- ✅ Validação de campos obrigatórios
- ✅ Conversão automática para maiúsculas
- ✅ Valores padrão para campos não informados

### 2. Gestão de Produtos

- ✅ Cadastro com código de barras, descrição e preços
- ✅ Controle de genérico (SIM/NÃO)
- ✅ Localização no estoque
- ✅ Informações de laboratório e princípio ativo
- ✅ Pesquisa inteligente (código de barras ou descrição)
- ✅ Atualização automática de preços em movimentos pendentes

### 3. Gestão de Funcionários

- ✅ Cadastro simplificado (nome)
- ✅ Pesquisa por nome
- ✅ Vinculação com vendas
- ✅ Soft delete

### 4. Sistema de Vendas

- ✅ Venda à vista (dinheiro) ou a prazo (marcado)
- ✅ Cliente registrado ou avulso
- ✅ Produto registrado ou avulso (outras vendas)
- ✅ Desconto por item
- ✅ Cálculo automático de totais
- ✅ Geração de código único de movimento
- ✅ Impressão de cupom fiscal

### 5. Movimentos

- ✅ Visualização agrupada por código de movimento
- ✅ Detalhamento de cada movimento
- ✅ Filtros de pesquisa
- ✅ Impressão seletiva (todos, pagos ou não pagos)
- ✅ Histórico completo de transações

### 6. Contas a Pagar

- ✅ Listagem de clientes com contas em aberto
- ✅ Visualização de débitos por cliente
- ✅ Marcação de contas como pagas
- ✅ Impressão de comprovante de pagamento
- ✅ Atualização automática de datas

## 🔌 Endpoints da API

### Clientes

```
GET    /api/clientes              # Listar com paginação
GET    /api/clientes/{id}         # Buscar por ID
POST   /api/clientes              # Criar novo
PUT    /api/clientes/{id}         # Atualizar
DELETE /api/clientes/{id}         # Excluir (soft delete)
```

### Produtos

```
GET    /api/produtos              # Listar com paginação
GET    /api/produtos/{id}         # Buscar por ID
POST   /api/produtos              # Criar novo
PUT    /api/produtos/{id}         # Atualizar
DELETE /api/produtos/{id}         # Excluir (soft delete)
```

### Funcionários

```
GET    /api/funcionarios          # Listar com paginação
GET    /api/funcionarios/{id}     # Buscar por ID
POST   /api/funcionarios          # Criar novo
PUT    /api/funcionarios/{id}     # Atualizar
DELETE /api/funcionarios/{id}     # Excluir (soft delete)
```

### Vendas

```
POST   /api/vendas                # Registrar venda
POST   /api/vendas/imprimir       # Imprimir cupom
```

### Movimentos

```
GET    /api/movimentos                        # Listar agrupados
GET    /api/movimentos/{codigoMovimento}      # Detalhes
POST   /api/movimentos/{codigoMovimento}/imprimir  # Imprimir
```

### Contas a Pagar

```
GET    /api/contas/clientes               # Listar clientes
GET    /api/contas/movimentos             # Movimentos do cliente
PUT    /api/contas/movimentos/pagar       # Marcar como pago
POST   /api/contas/movimentos/imprimir    # Imprimir comprovante
```

### Configuração

```
GET    /api/config/db             # Obter configuração
POST   /api/config/db             # Salvar configuração
```

## 🗄️ Banco de Dados

### Tabelas Principais

#### dbo.Clientes
- Armazena informações dos clientes
- Campos: Nome, Endereço, CPF, RG, Telefones, Data de Nascimento, Código Fichário
- Soft delete habilitado

#### dbo.Produtos
- Catálogo de produtos
- Campos: Código de Barras, Descrição, Preços, Localização, Laboratório, Genérico
- Soft delete habilitado

#### dbo.Funcionarios
- Cadastro de funcionários/vendedores
- Campos: Nome
- Soft delete habilitado

#### dbo.Movimentos
- Registro de todas as transações
- Campos: Produto, Cliente, Funcionário, Quantidades, Preços, Descontos, Datas
- Soft delete indica se foi pago (true) ou está pendente (false)

### Relacionamentos

- **Movimento → Cliente**: FK ClientesId
- **Movimento → Produto**: FK ProdutosId
- **Movimento → Funcionário**: FK FuncionariosId

### Índices Recomendados

```sql
-- Melhorar performance de consultas
CREATE INDEX IX_Movimentos_ClientesId ON dbo.Movimentos(ClientesId);
CREATE INDEX IX_Movimentos_CodigoMovimento ON dbo.Movimentos(CodigoMovimento);
CREATE INDEX IX_Movimentos_DataVenda ON dbo.Movimentos(DataVenda);
CREATE INDEX IX_Clientes_Nome ON dbo.Clientes(Nome);
CREATE INDEX IX_Produtos_CodigoBarras ON dbo.Produtos(CodigoBarras);
CREATE INDEX IX_Produtos_Descricao ON dbo.Produtos(Descricao);
```

## 🖥️ Execução como Serviço Windows

### Publicar a Aplicação

```bash
dotnet publish -c Release -o C:\FarmaciaEliseu
```

### Criar o Serviço

```powershell
# Executar como Administrador
sc create FarmaciaEliseuService binPath="C:\FarmaciaEliseu\webapp-FarmaciaEliseu.exe" start=auto
sc description FarmaciaEliseuService "Sistema de Gestão - Farmácia do Eliseu"
```

### Gerenciar o Serviço

```powershell
# Iniciar
sc start FarmaciaEliseuService

# Parar
sc stop FarmaciaEliseuService

# Remover
sc delete FarmaciaEliseuService
```

### Configurar Porta

Edite `appsettings.json` para definir a porta:

```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5000"
      }
    }
  }
}
```

## 💻 Desenvolvimento

### Padrões de Código

1. **Nomenclatura**
   - Classes: PascalCase
   - Métodos: PascalCase
   - Variáveis: camelCase
   - Constantes: UPPER_CASE

2. **Organização**
   - Um endpoint por arquivo
   - Separação clara de responsabilidades
   - Comentários em código complexo

3. **Validações**
   - Sempre validar entrada do usuário
   - Retornar mensagens de erro claras
   - Usar BadRequest para erros de validação

### Adicionar Novo Endpoint

1. Criar arquivo em `Endpoints/`
2. Implementar método de extensão `Map{Nome}Endpoints`
3. Registrar em `Program.cs`

Exemplo:

```csharp
// Endpoints/NovoEndpoint.cs
public static class NovoEndpoints
{
    public static void MapNovoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/novo").WithTags("Novo");
        
        group.MapGet("/", async (AppDbContext db) =>
        {
            // Implementação
        });
    }
}

// Program.cs
app.MapNovoEndpoints();
```

### Boas Práticas

- ✅ Usar `AsNoTracking()` em consultas somente leitura
- ✅ Implementar paginação em listagens
- ✅ Limitar tamanho de página (máximo 200)
- ✅ Usar projeções para reduzir dados trafegados
- ✅ Validar todos os inputs
- ✅ Manter logs de erros
- ✅ Usar transações para operações complexas

## 🔧 Manutenção

### Backup do Banco de Dados

```sql
BACKUP DATABASE FarmaciaEliseu 
TO DISK = 'C:\Backups\FarmaciaEliseu.bak'
WITH FORMAT, COMPRESSION;
```

### Logs

Os logs são gravados em:
- Console (durante desenvolvimento)
- Event Viewer do Windows (quando executado como serviço)

### Monitoramento

Verificar regularmente:
- Tamanho do banco de dados
- Performance de consultas lentas
- Espaço em disco
- Memória utilizada

### Atualizações

1. Fazer backup completo
2. Parar o serviço
3. Substituir arquivos
4. Executar scripts de migração (se houver)
5. Reiniciar o serviço
6. Testar funcionalidades críticas

## 📞 Suporte

Para questões técnicas ou sugestões de melhorias:

- **Documentação**: Consulte este README
- **Issues**: Abra uma issue no repositório
- **Email**: [email de suporte]

## 📄 Licença

Este projeto é proprietário da Farmácia do Eliseu.

---

**Desenvolvido com ❤️ para Farmácia do Eliseu**

*Última atualização: Novembro 2025*
