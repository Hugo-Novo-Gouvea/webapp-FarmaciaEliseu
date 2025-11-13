USE farmaciaEliseu;
GO

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

-- CLIENTES: índice por Nome (usado nos seus filtros)
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

EXEC sp_updatestats;