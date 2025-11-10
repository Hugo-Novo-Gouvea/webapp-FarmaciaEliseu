/*
  Script de migraÃ§Ã£o: MigracaoFarmacia2 -> farmaciaEliseu
  - Cria tabelas destino em [farmaciaEliseu]
  - Copia e transforma dados das tabelas de [MigracaoFarmacia2]
  - CompatÃ­vel com SQL Server (SSMS / sqlcmd)
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT 'Iniciando migraÃ§Ã£o para o banco [farmaciaEliseu]...';

IF DB_ID(N'farmaciaEliseu') IS NULL
BEGIN
    RAISERROR('Banco de dados [farmaciaEliseu] nÃ£o encontrado. Crie o banco antes de rodar este script.', 16, 1);
    RETURN;
END

USE [farmaciaEliseu];
GO

/* ==========================
   CriaÃ§Ã£o das Tabelas
   ========================== */

IF OBJECT_ID(N'dbo.clientes', N'U') IS NULL
BEGIN
    PRINT 'Criando tabela dbo.clientes...';
    CREATE TABLE dbo.clientes (
        clientesID         INT IDENTITY(1,1) NOT NULL PRIMARY KEY, -- mapeado do antigo codigo (float) quando IDENTITY_INSERT ON
        nome               NVARCHAR(200) NOT NULL,
        endereco           NVARCHAR(200) NULL,
        rg                 NVARCHAR(30)  NULL,
        cpf                NVARCHAR(30)  NULL,
        telefone           NVARCHAR(50)  NULL,
        celular            NVARCHAR(50)  NULL,
        dataNascimento     DATE          NULL,
        codigoFichario     INT           NULL,
        dataCadastro       DATETIME2(0)  NULL,
        dataUltimoRegistro DATETIME2(0)  NULL,
        deletado           BIT           NULL
    );
END
ELSE
BEGIN
    PRINT 'Tabela dbo.clientes jÃ¡ existe. Pulando criaÃ§Ã£o.';
END

IF OBJECT_ID(N'dbo.funcionarios', N'U') IS NULL
BEGIN
    PRINT 'Criando tabela dbo.funcionarios...';
    CREATE TABLE dbo.funcionarios (
        funcionariosID     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        nome               NVARCHAR(200) NOT NULL,
        dataCadastro       DATETIME2(0)  NOT NULL,
        dataUltimoRegistro DATETIME2(0)  NOT NULL,
        deletado           BIT           NOT NULL
    );
END
ELSE
BEGIN
    PRINT 'Tabela dbo.funcionarios jÃ¡ existe. Pulando criaÃ§Ã£o.';
END

IF OBJECT_ID(N'dbo.produtos', N'U') IS NULL
BEGIN
    PRINT 'Criando tabela dbo.produtos...';
    CREATE TABLE dbo.produtos (
        produtosID         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        descricao          NVARCHAR(200) NOT NULL,
        UnidadeMedida      NVARCHAR(200) NULL,
        precoCompra        DECIMAL(19,4) NOT NULL,
        precoVenda         DECIMAL(19,4) NOT NULL,
        localizacao        NVARCHAR(200) NULL,
        laboratorio        NVARCHAR(200) NULL,
        principio          NVARCHAR(200) NULL,
        generico           NVARCHAR(3)   NOT NULL,
        codigoProduto      NVARCHAR(9)   NULL,
        codigoBarras       NVARCHAR(50)  NOT NULL,
        dataCadastro       DATETIME2(0)  NULL,
        dataUltimoRegistro DATETIME2(0)  NULL,
        deletado           BIT           NULL
    );
END
ELSE
BEGIN
    PRINT 'Tabela dbo.produtos jÃ¡ existe. Pulando criaÃ§Ã£o.';
END

IF OBJECT_ID(N'dbo.movimentos', N'U') IS NULL
BEGIN
    PRINT 'Criando tabela dbo.movimentos...';
    CREATE TABLE dbo.movimentos (
        movimentosID          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        produtosID            INT           NOT NULL, -- manter 0 conforme regra
        produtosDescricao     NVARCHAR(200) NOT NULL,
        produtosCodigoProduto NVARCHAR(9)   NOT NULL,
        clientesID            INT           NOT NULL, -- mapeia de mov_cliente.cod_cli
        clientesNome          NVARCHAR(200) NOT NULL, -- 'NÃƒO INFORMADO'
        funcionariosID        INT           NOT NULL, -- padrao 0
        funcionariosNome      NVARCHAR(200) NOT NULL, -- 'NÃƒO INFORMADO'
        quantidade            INT           NOT NULL,
        precoUnitarioDiaVenda DECIMAL(19,4) NOT NULL,
        precoTotalDiaVenda    DECIMAL(19,4) NOT NULL,
        precoUnitarioAtual    DECIMAL(19,4) NOT NULL,
        precoTotalAtual       DECIMAL(19,4) NOT NULL,
        valorPago             DECIMAL(19,4) NOT NULL,
        desconto              DECIMAL(19,4) NOT NULL,
        DataVenda             DATETIME2(0)  NOT NULL,
        DataPagamento         DATETIME2(0)  NULL,
        codigoMovimento       INT           NOT NULL,
        dataCadastro          DATETIME2(0)  NOT NULL,
        dataUltimoRegistro    DATETIME2(0)  NOT NULL,
        deletado              BIT           NOT NULL
    );
END
ELSE
BEGIN
    PRINT 'Tabela dbo.movimentos jÃ¡ existe. Pulando criaÃ§Ã£o.';
END
GO

-- Garantir coluna codigoMovimento em dbo.movimentos
IF OBJECT_ID(N'dbo.movimentos', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.movimentos','codigoMovimento') IS NULL
    BEGIN
        PRINT 'Adicionando coluna dbo.movimentos.codigoMovimento...';
        ALTER TABLE dbo.movimentos ADD codigoMovimento INT NOT NULL CONSTRAINT DF_movimentos_codigoMovimento DEFAULT(0);
    END
END
GO

/* Garante colunas novas quando tabelas jÃ¡ existirem */
IF OBJECT_ID(N'dbo.clientes', N'U') IS NOT NULL
BEGIN
    PRINT 'Ajustando estrutura e dados de dbo.clientes...';
    -- Ajusta nullability (apenas Nome NOT NULL; demais NULL)
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN endereco NVARCHAR(200) NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN rg NVARCHAR(30) NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN cpf NVARCHAR(30) NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN telefone NVARCHAR(50) NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN celular NVARCHAR(50) NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN dataNascimento DATE NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN codigoFichario INT NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN dataCadastro DATETIME2(0) NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN dataUltimoRegistro DATETIME2(0) NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN deletado BIT NULL;
    END TRY
    BEGIN CATCH
    END CATCH;
    BEGIN TRY
        ALTER TABLE dbo.clientes ALTER COLUMN nome NVARCHAR(200) NOT NULL;
    END TRY
    BEGIN CATCH
    END CATCH;

    -- Migrar valores de situacao -> deletado (0 para ATIVOS, 1 para INATIVOS) e remover coluna situacao
    -- ObservaÃ§Ã£o: usar SQL dinÃ¢mico para evitar erro de compilaÃ§Ã£o quando a coluna nÃ£o existir
    IF COL_LENGTH('dbo.clientes','situacao') IS NOT NULL
    BEGIN
        PRINT 'Migrando coluna situacao para deletado em dbo.clientes...';
        IF COL_LENGTH('dbo.clientes','deletado') IS NULL
        BEGIN
            ALTER TABLE dbo.clientes ADD deletado BIT NULL;
        END
        DECLARE @sqlClientesSituacao NVARCHAR(MAX) = N'
            UPDATE dbo.clientes
            SET deletado = CASE 
                WHEN UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(100), [situacao])))) IN (N''ATIVO'', N''ATIVA'', N''SIM'', N''S'', N''1'', N''TRUE'', N''T'') THEN CAST(0 AS BIT)
                WHEN UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(100), [situacao])))) IN (N''INATIVO'', N''INATIVA'', N''NAO'', N''N'', N''0'', N''FALSE'', N''F'', N''NAO PAGO'') THEN CAST(1 AS BIT)
                ELSE CAST(0 AS BIT)
            END;';
        EXEC sp_executesql @sqlClientesSituacao;
        PRINT 'Removendo coluna situacao de dbo.clientes...';
        EXEC(N'ALTER TABLE dbo.clientes DROP COLUMN [situacao];');
    END
END
IF OBJECT_ID(N'dbo.produtos', N'U') IS NOT NULL
BEGIN
    -- Ajusta nullability para Produtos: apenas os campos essenciais como NOT NULL
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN descricao NVARCHAR(200) NOT NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN UnidadeMedida NVARCHAR(200) NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN precoCompra DECIMAL(19,4) NOT NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN precoVenda DECIMAL(19,4) NOT NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN localizacao NVARCHAR(200) NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN laboratorio NVARCHAR(200) NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN principio NVARCHAR(200) NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN generico NVARCHAR(3) NOT NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN codigoProduto NVARCHAR(9) NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN codigoBarras NVARCHAR(50) NOT NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN dataCadastro DATETIME2(0) NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN dataUltimoRegistro DATETIME2(0) NULL; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY ALTER TABLE dbo.produtos ALTER COLUMN deletado BIT NULL; END TRY BEGIN CATCH END CATCH;

    -- Remover coluna porcentagemLucro caso exista
    IF COL_LENGTH('dbo.produtos','porcentagemLucro') IS NOT NULL
    BEGIN
        PRINT 'Removendo coluna dbo.produtos.porcentagemLucro...';
        ALTER TABLE dbo.produtos DROP COLUMN porcentagemLucro;
    END

    -- Garantir colunas essenciais
    IF COL_LENGTH('dbo.produtos','codigoProduto') IS NULL
    BEGIN
        PRINT 'Adicionando coluna dbo.produtos.codigoProduto...';
        ALTER TABLE dbo.produtos ADD codigoProduto NVARCHAR(9) NULL;
    END
    IF COL_LENGTH('dbo.produtos','codigoBarras') IS NULL
    BEGIN
        PRINT 'Adicionando coluna dbo.produtos.codigoBarras...';
        ALTER TABLE dbo.produtos ADD codigoBarras NVARCHAR(50) NOT NULL CONSTRAINT DF_produtos_codigoBarras DEFAULT(N'');
    END
END

IF OBJECT_ID(N'dbo.movimentos', N'U') IS NOT NULL
BEGIN
    -- Remover coluna 'pago' se ainda existir (nova regra usa apenas 'deletado')
    IF COL_LENGTH('dbo.movimentos','pago') IS NOT NULL
    BEGIN
        PRINT 'Removendo coluna dbo.movimentos.pago...';
        ALTER TABLE dbo.movimentos DROP COLUMN pago;
    END
    -- Remover coluna 'valorVenda' se ainda existir
    IF COL_LENGTH('dbo.movimentos','valorVenda') IS NOT NULL
    BEGIN
        PRINT 'Removendo coluna dbo.movimentos.valorVenda...';
        ALTER TABLE dbo.movimentos DROP COLUMN valorVenda;
    END
    -- Se a coluna correta nÃ£o existir, mas a antiga existir, renomeia
    IF COL_LENGTH('dbo.movimentos','produtosCodigoProduto') IS NULL
    BEGIN
        IF COL_LENGTH('dbo.movimentos','produtoCodigoProduto') IS NOT NULL
        BEGIN
            PRINT 'Renomeando coluna dbo.movimentos.produtoCodigoProduto -> produtosCodigoProduto...';
            EXEC sp_rename 'dbo.movimentos.produtoCodigoProduto', 'produtosCodigoProduto', 'COLUMN';
        END
        ELSE
        BEGIN
            PRINT 'Adicionando coluna dbo.movimentos.produtosCodigoProduto...';
            ALTER TABLE dbo.movimentos ADD produtosCodigoProduto NVARCHAR(9) NOT NULL CONSTRAINT DF_movimentos_produtosCodigoProduto DEFAULT(N'');
        END
    END
    IF COL_LENGTH('dbo.movimentos','funcionariosID') IS NULL
    BEGIN
        PRINT 'Adicionando coluna dbo.movimentos.funcionariosID...';
        ALTER TABLE dbo.movimentos ADD funcionariosID INT NOT NULL CONSTRAINT DF_movimentos_funcionariosID DEFAULT(0);
    END
    IF COL_LENGTH('dbo.movimentos','funcionariosNome') IS NULL
    BEGIN
        PRINT 'Adicionando coluna dbo.movimentos.funcionariosNome...';
        ALTER TABLE dbo.movimentos ADD funcionariosNome NVARCHAR(200) NOT NULL CONSTRAINT DF_movimentos_funcionariosNome DEFAULT(N'NÃƒO INFORMADO');
    END
END
GO

/* ==========================
   MigraÃ§Ã£o: Clientes
   - MantÃ©m o ID antigo (cliente.codigo) como clientesID usando IDENTITY_INSERT
   - Normaliza campos NULL/Em branco
   ========================== */

BEGIN TRAN;

IF EXISTS (SELECT 1 FROM [MigracaoFarmacia].sys.tables t WHERE t.name = 'cliente' AND t.schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.clientes)
    BEGIN
        PRINT 'Inserindo dados em dbo.clientes...';
        SET IDENTITY_INSERT dbo.clientes ON;
        -- Sentinel ID 1
        INSERT INTO dbo.clientes (
            clientesID, nome, endereco, rg, cpf, telefone, celular,
            dataNascimento, codigoFichario, dataCadastro, dataUltimoRegistro, deletado
        ) VALUES (
            1, N'NÃƒO INFORMADO', N'NÃƒO INFORMADO', N'NÃƒO INFORMADO', N'NÃƒO INFORMADO', N'NÃƒO INFORMADO', N'NÃƒO INFORMADO',
            CAST(SYSDATETIME() AS DATE), 0, SYSDATETIME(), SYSDATETIME(), 0
        );
        INSERT INTO dbo.clientes (
            clientesID,
            nome, endereco, rg, cpf, telefone, celular,
            dataNascimento, codigoFichario,
            dataCadastro, dataUltimoRegistro, deletado
        )
        SELECT
            CAST(c.codigo AS INT) AS clientesID,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(c.nome)), ''), N'NÃƒO INFORMADO'), 200) AS nome,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(c.[endereco])), ''), N'NÃƒO INFORMADO'), 200) AS endereco,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(c.rg)), ''), N'NÃƒO INFORMADO'), 30) AS rg,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(c.cic)), ''), N'NÃƒO INFORMADO'), 30) AS cpf,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(c.fone)), ''), N'NÃƒO INFORMADO'), 50) AS telefone,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(c.celular)), ''), N'NÃƒO INFORMADO'), 50) AS celular,
            CAST(SYSDATETIME() AS DATE) AS dataNascimento,
            ISNULL(CAST(c.cod_fichario AS INT), 0) AS codigoFichario,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataCadastro,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataUltimoRegistro,
            CASE 
                WHEN UPPER(LTRIM(RTRIM(c.[situacao]))) IN (N'ATIVO', N'ATIVA', N'SIM', N'S', N'1', N'TRUE', N'T') THEN CAST(0 AS BIT)
                WHEN UPPER(LTRIM(RTRIM(c.[situacao]))) IN (N'INATIVO', N'INATIVA', N'NAO', N'N', N'0', N'FALSE', N'F', N'NAO PAGO') THEN CAST(1 AS BIT)
                ELSE CAST(0 AS BIT)
            END AS deletado
        FROM [MigracaoFarmacia].dbo.cliente AS c;
        DECLARE @rows_clientes INT = @@ROWCOUNT;
        SET IDENTITY_INSERT dbo.clientes OFF;
        PRINT CONCAT('Clientes inseridos: ', @rows_clientes);
    END
    ELSE
    BEGIN
        PRINT 'Tabela dbo.clientes jÃ¡ possui dados. Pulando inserÃ§Ã£o.';
    END
END
ELSE
BEGIN
    RAISERROR('Tabela fonte [MigracaoFarmacia].dbo.cliente nÃ£o encontrada.', 16, 1);
END

COMMIT TRAN;
GO

/* ==========================
   MigraÃ§Ã£o: FuncionÃ¡rios
   - Copia apenas NOME (ignora CODIGO/SENHA antigos)
   ========================== */

BEGIN TRAN;

IF EXISTS (SELECT 1 FROM [MigracaoFarmacia].sys.tables t WHERE t.name = 'FUNCIONARIOS' AND t.schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.funcionarios)
    BEGIN
        PRINT 'Inserindo dados em dbo.funcionarios...';
        INSERT INTO dbo.funcionarios (
            nome, dataCadastro, dataUltimoRegistro, deletado
        )
        SELECT
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(f.NOME)), ''), N'NÃƒO INFORMADO'), 200) AS nome,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataCadastro,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataUltimoRegistro,
            CAST(0 AS BIT) AS deletado
        FROM [MigracaoFarmacia].dbo.FUNCIONARIOS AS f;
        PRINT CONCAT('Funcionarios inseridos: ', @@ROWCOUNT);
    END
    ELSE
    BEGIN
        PRINT 'Tabela dbo.funcionarios jÃ¡ possui dados. Pulando inserÃ§Ã£o.';
    END
END
ELSE
BEGIN
    RAISERROR('Tabela fonte [MigracaoFarmacia].dbo.FUNCIONARIOS nÃ£o encontrada.', 16, 1);
END

COMMIT TRAN;
GO

/* ==========================
   MigraÃ§Ã£o: Produtos
   - Calcula % lucro a partir de precoCompra/precoVenda
   - Converte MED_UNI (float) para texto
   ========================== */

BEGIN TRAN;

IF EXISTS (SELECT 1 FROM [MigracaoFarmacia].sys.tables t WHERE t.name = 'TABELA_MEDICAMENTOS' AND t.schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.produtos)
    BEGIN
        PRINT 'Inserindo dados em dbo.produtos...';
        -- Sentinel ID 1
        SET IDENTITY_INSERT dbo.produtos ON;
        INSERT INTO dbo.produtos (
            produtosID, descricao, UnidadeMedida, precoCompra, precoVenda, 
            localizacao, laboratorio, principio, generico, codigoProduto, codigoBarras,
            dataCadastro, dataUltimoRegistro, deletado
        ) VALUES (
            1, N'NÃƒO INFORMADO', N'NÃƒO INFORMADO', 0, 0, N'0', N'NÃƒO INFORMADO', N'NÃƒO INFORMADO', N'NAO', N'0000000', N'NÃƒO INFORMADO', SYSDATETIME(), SYSDATETIME(), 0
        );
        SET IDENTITY_INSERT dbo.produtos OFF;
        INSERT INTO dbo.produtos (
            descricao, UnidadeMedida, precoCompra, precoVenda, 
            localizacao, laboratorio, principio, generico,
            codigoProduto, codigoBarras,
            dataCadastro, dataUltimoRegistro, deletado
        )
        SELECT
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(t.MED_DES)), ''), N'NǟO INFORMADO'), 200) AS descricao,
            LEFT(ISNULL(NULLIF(CONVERT(NVARCHAR(200), t.MED_UNI), ''), N'UN'), 200) AS UnidadeMedida,
            CAST(ISNULL(t.MED_PLA1, 0) AS DECIMAL(19,4)) AS precoCompra,
            CAST(ISNULL(t.MED_PCO1, 0) AS DECIMAL(19,4)) AS precoVenda,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(t.LOCALIZACAO)), ''), N'NǟO INFORMADO'), 200) AS localizacao,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(t.LAB_NOM)), ''), N'NǟO INFORMADO'), 200) AS laboratorio,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(t.MED_PRINCI)), ''), N'NǟO INFORMADO'), 200) AS principio,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(t.MED_GENE)), ''), N'NA'), 3) AS generico,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(t.MED_ABC)), ''), N''), 9) AS codigoProduto,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(t.MED_BARRA)), ''), N''), 50) AS codigoBarras,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataCadastro,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataUltimoRegistro,
            CAST(0 AS BIT) AS deletado
        FROM [MigracaoFarmacia].dbo.TABELA_MEDICAMENTOS AS t
        WHERE ISNULL(t.ATIVO, N'1') <> N'0'; -- opcional: filtra inativos se ATIVO = '0'
        PRINT CONCAT('Produtos inseridos: ', @@ROWCOUNT);
    END
    ELSE
    BEGIN
        PRINT 'Tabela dbo.produtos jÃ¡ possui dados. Pulando inserÃ§Ã£o.';
    END
END
ELSE
BEGIN
    RAISERROR('Tabela fonte [MigracaoFarmacia].dbo.TABELA_MEDICAMENTOS nÃ£o encontrada.', 16, 1);
END

COMMIT TRAN;
GO

/* ==========================
   MigraÃ§Ã£o: Movimentos
   - produtosID = 0
   - clientesNome = 'SEM NÃƒO INFORMADO'
   - valorPago = total quando pago = SIM, senÃ£o 0
   - pago BIT conforme regra
   ========================== */

BEGIN TRAN;

IF EXISTS (SELECT 1 FROM [MigracaoFarmacia].sys.tables t WHERE t.name = 'mov_cliente' AND t.schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.movimentos)
    BEGIN
        PRINT 'Inserindo dados em dbo.movimentos...';
        INSERT INTO dbo.movimentos (
            produtosID, produtosDescricao, produtosCodigoProduto, clientesID, clientesNome,
            funcionariosID, funcionariosNome,
            quantidade, precoUnitarioDiaVenda, precoTotalDiaVenda,
            precoUnitarioAtual, precoTotalAtual, valorPago,
            desconto, DataVenda, DataPagamento, codigoMovimento,
            dataCadastro, dataUltimoRegistro, deletado
        )
        SELECT
            0 AS produtosID,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(m.descricao_produto)), ''), N'NÃƒO INFORMADO'), 200) AS produtosDescricao,
            LEFT(ISNULL(NULLIF(LTRIM(RTRIM(m.material)), ''), N''), 9) AS produtosCodigoProduto,
            CAST(m.cod_cli AS INT) AS clientesID,
            N'NÃƒO INFORMADO' AS clientesNome,
            0 AS funcionariosID,
            N'NÃƒO INFORMADO' AS funcionariosNome,
            ISNULL(m.qtde_movimentada, 0) AS quantidade,
            CAST(ISNULL(m.valor_unitario, 0) AS DECIMAL(19,4)) AS precoUnitarioDiaVenda,
            CAST(ISNULL(m.valor_unitario, 0) * ISNULL(m.qtde_movimentada, 0) AS DECIMAL(19,4)) AS precoTotalDiaVenda,
            CAST(ISNULL(m.valor_unitario, 0) AS DECIMAL(19,4)) AS precoUnitarioAtual,
            CAST(ISNULL(m.valor_unitario, 0) * ISNULL(m.qtde_movimentada, 0) AS DECIMAL(19,4)) AS precoTotalAtual,
            CAST(CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(m.pago, N'NAO')))) IN (N'SIM', N'S', N'1', N'TRUE', N'T')
                      THEN ISNULL(m.valor_unitario, 0) * ISNULL(m.qtde_movimentada, 0)
                      ELSE 0 END AS DECIMAL(19,4)) AS valorPago,
            CAST(ISNULL(m.desconto, 0) AS DECIMAL(19,4)) AS desconto,
            CAST(m.data_venda AS DATETIME2(0)) AS DataVenda,
            CAST(m.data_pagto AS DATETIME2(0)) AS DataPagamento,
            CAST(ISNULL(m.codigo_movimento, 0) AS INT) AS codigoMovimento,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataCadastro,
            CAST(SYSDATETIME() AS DATETIME2(0)) AS dataUltimoRegistro,
            CAST(CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(m.pago, N'NAO')))) IN (N'SIM', N'S', N'1', N'TRUE', N'T') THEN 1 ELSE 0 END AS BIT) AS deletado
        FROM [MigracaoFarmacia].dbo.mov_cliente AS m;
        PRINT CONCAT('Movimentos inseridos: ', @@ROWCOUNT);

        -- Ajusta produtosID com base no codigoProduto informado no movimento
        UPDATE m
        SET m.produtosID = ISNULL(p.produtosID, 0)
        FROM dbo.movimentos AS m
        LEFT JOIN (
            SELECT codigoProduto, MIN(produtosID) AS produtosID
            FROM dbo.produtos
            GROUP BY codigoProduto
        ) AS p
            ON p.codigoProduto = m.produtosCodigoProduto
        WHERE m.produtosID = 0;

        -- Preenche clientesNome a partir do clientesID
        UPDATE m
        SET m.clientesNome = LEFT(ISNULL(NULLIF(LTRIM(RTRIM(c.nome)), ''), N'NÃƒO INFORMADO'), 200)
        FROM dbo.movimentos AS m
        LEFT JOIN dbo.clientes AS c
            ON c.clientesID = m.clientesID;
    END
    ELSE
    BEGIN
        PRINT 'Tabela dbo.movimentos jÃ¡ possui dados. Pulando inserÃ§Ã£o.';
    END
END
ELSE
BEGIN
    RAISERROR('Tabela fonte [MigracaoFarmacia].dbo.mov_cliente nÃ£o encontrada.', 16, 1);
END

COMMIT TRAN;
GO

PRINT 'MigraÃ§Ã£o concluÃ­da.';
