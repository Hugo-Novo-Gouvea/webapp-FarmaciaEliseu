USE farmaciaEliseu;
GO

/* =========================================================
   PRODUTOS
   ========================================================= */

-- PRODUTOS: índice por Descricao (acelera busca por nome)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Produtos_Descricao' 
      AND object_id = OBJECT_ID('dbo.produtos')
)
BEGIN
    CREATE INDEX IX_Produtos_Descricao
        ON dbo.produtos(Descricao);
END
GO

-- PRODUTOS: índice por Código de Barras (igualdade/prefixo)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Produtos_CodigoBarras' 
      AND object_id = OBJECT_ID('dbo.produtos')
)
BEGIN
    CREATE INDEX IX_Produtos_CodigoBarras
        ON dbo.produtos(CodigoBarras);
END
GO

/* =========================================================
   CLIENTES
   ========================================================= */

-- CLIENTES: índice por Nome (usado nos filtros/pesquisa)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Clientes_Nome' 
      AND object_id = OBJECT_ID('dbo.clientes')
)
BEGIN
    CREATE INDEX IX_Clientes_Nome
        ON dbo.clientes(Nome);
END
GO

/* =========================================================
   FUNCIONÁRIOS
   ========================================================= */

-- FUNCIONÁRIOS: índice por Nome (usado nos filtros/pesquisa)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_Funcionarios_Nome' 
      AND object_id = OBJECT_ID('dbo.funcionarios')
)
BEGIN
    CREATE INDEX IX_Funcionarios_Nome
        ON dbo.funcionarios(Nome);
END
GO

/* =========================================================
   MANUTENÇÃO LEVE DE ESTATÍSTICAS
   ========================================================= */
EXEC sp_updatestats;
GO
