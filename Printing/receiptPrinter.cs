using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

namespace WebAppEstudo.Printing
{
    public static class ReceiptPrinter
    {
        public const int Cols = 40;

        public record Item(int Qty, string Desc, decimal Unit, decimal Discount);

        public static void Print(byte[] data, string? preferredPrinter = null)
        {
            if (!string.IsNullOrWhiteSpace(preferredPrinter))
            {
                RawPrinterHelper.SendBytes(preferredPrinter, data, "Cupom Venda");
                return;
            }

            string[] candidatos =
            {
                "Cupom Térmico RAW",
                "Cupom Termico RAW",
                "CUPOM TÉRMICO RAW",
                "CUPOM TERMICO RAW"
            };

            foreach (var nome in candidatos)
            {
                try
                {
                    RawPrinterHelper.SendBytes(nome, data, "Cupom Venda");
                    return;
                }
                catch
                {
                    // tenta o próximo
                }
            }

            Console.WriteLine("Nenhuma impressora térmica padrão encontrada.");
        }

        public static byte[] BuildReceipt(
            string lojaNome,
            DateTime dataHora,
            string clienteNome,
            string vendedorNome,
            IEnumerable<Item> itens,
            bool isDinheiro,
            decimal totalDesconto,
            decimal totalFinal,
            string? codigoFichario,
            int? codigoMovimento = null
        )
        {
            // ESC/POS bold on/off
            byte[] boldOn = new byte[] { 0x1B, 0x45, 0x01 };
            byte[] boldOff = new byte[] { 0x1B, 0x45, 0x00 };

            string Line(string s) => (s.Length > Cols ? s[..Cols] : s) + "\r\n";

            string Center(string s)
            {
                s ??= "";
                if (s.Length >= Cols) return s[..Cols];
                int left = (Cols - s.Length) / 2;
                return new string(' ', left) + s;
            }

            // sem separador de milhar pra caber melhor na linha
            string Money(decimal v) => v.ToString("0.00", new CultureInfo("pt-BR"));

            var parts = new List<byte[]>();

            // ========= CABEÇALHO =========

            // Espaço em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // Nome da loja (centralizado, em negrito)
            parts.Add(boldOn);
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii(lojaNome)))));
            parts.Add(boldOff);

            // Espaço em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // Endereço, telefone, data/hora (todos centralizados)
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii("Amaro Franco de Oliveira,560,Jardim Sol")))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii("(19) 98121-6227")))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center($"Data: {dataHora:dd/MM/yy HH:mm:ss}"))));

            // Espaço em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // CLIENTE: (NOME) - (CODIGO FICHARIO)
            string clienteLinha = "CLIENTE: " + ToAscii(clienteNome);
            if (!string.IsNullOrWhiteSpace(codigoFichario))
            {
                clienteLinha += " - " + ToAscii(codigoFichario);
            }
            parts.Add(Encoding.ASCII.GetBytes(Line(clienteLinha)));

            // Espaço em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // VENDEDOR:
            parts.Add(Encoding.ASCII.GetBytes(Line("VENDEDOR: " + ToAscii(vendedorNome))));

            // Linha de separação
            parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

            // ========= ITENS =========

            var itensList = itens?.ToList() ?? new List<Item>();

            if (itensList.Count == 0)
            {
                parts.Add(Encoding.ASCII.GetBytes(Line("SEM ITENS")));
            }
            else
            {
                if (isDinheiro)
                {
                    // Cabeçalho dos itens (dinheiro)
                    // Qtde Descricao         Desc  Vlt Unit  Vlr Total
                    parts.Add(Encoding.ASCII.GetBytes(Line("Qtde Descricao         Desc  Vlt Unit  Vlr Total")));

                    foreach (var it in itensList)
                    {
                        string desc = ToAscii(it.Desc ?? "");
                        if (desc.Length > 14) desc = desc[..14];

                        var totalItem = it.Unit * it.Qty - it.Discount;
                        if (totalItem < 0) totalItem = 0;

                        // Colunas:
                        // 3 dígitos qtd, 1 espaço,
                        // 14 desc (esq),
                        // 6 desconto, espaço,
                        // 6 unit, espaço,
                        // 8 total  -> soma ~ 40 colunas
                        string linha =
                            $"{it.Qty,3} " +
                            $"{desc,-14}" +
                            $"{Money(it.Discount),6} " +
                            $"{Money(it.Unit),6} " +
                            $"{Money(totalItem),8}";

                        parts.Add(Encoding.ASCII.GetBytes(Line(linha)));
                    }
                }
                else
                {
                    // MARCAR: só quantidade + descrição
                    parts.Add(Encoding.ASCII.GetBytes(Line("Qtde Descricao")));
                    parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

                    foreach (var it in itensList)
                    {
                        string desc = ToAscii(it.Desc ?? "");
                        if (desc.Length > 36) desc = desc[..36];

                        string linha = $"{it.Qty,3} {desc}";
                        parts.Add(Encoding.ASCII.GetBytes(Line(linha)));
                    }
                }
            }

            // Linha de separação depois dos itens
            parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));
            // Espaço em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // ========= TOTAIS (APENAS DINHEIRO) =========

            if (isDinheiro)
            {
                // alinhando mais pra direita
                string linhaDesc = $"           DESCONTO: {Money(totalDesconto)}";
                string linhaTot  = $"        VALOR TOTAL: {Money(totalFinal)}";

                parts.Add(Encoding.ASCII.GetBytes(Line(linhaDesc)));
                parts.Add(Encoding.ASCII.GetBytes(Line(linhaTot)));
                parts.Add(Encoding.ASCII.GetBytes(Line("")));
            }

            // ========= RODAPÉ / ASSINATURA =========

            // Linha em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // ____________________(CENTRALIZADO)
            string linhaAss = "____________________";
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(linhaAss))));

            // Nome do cliente (centralizado)
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii(clienteNome)))));

            // DOC: (codigoMovimento) (centralizado)
            string docText = "DOC:";
            if (codigoMovimento.HasValue)
            {
                docText = $"DOC: {codigoMovimento.Value}";
            }
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(docText))));

            // Espaço em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // Mensagens finais (centralizadas)
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii("O ELISEU AGRADECE A PREFERENCIA!!!")))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii("VOLTE SEMPRE")))));

            // Espaços em branco finais (pra impressora destacar o papel)
            parts.Add(Encoding.ASCII.GetBytes("\r\n\r\n\r\n\r\n\r\n"));

            // Junta tudo num único buffer
            int totalLen = parts.Sum(p => p.Length);
            var buf = new byte[totalLen];
            int pos = 0;
            foreach (var p in parts)
            {
                Buffer.BlockCopy(p, 0, buf, pos, p.Length);
                pos += p.Length;
            }

            return buf;
        }

        private static string ToAscii(string s)
        {
            s ??= "";
            string n = s.Normalize(NormalizationForm.FormD);
            var arr = n
                .Where(c => System.Globalization.CharUnicodeInfo
                    .GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                .ToArray();
            var ascii = new string(arr);
            return new string(ascii.Select(c => c <= 0x7F ? c : '?').ToArray());
        }
    }
}
