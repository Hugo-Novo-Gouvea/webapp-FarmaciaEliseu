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
            string lojaEndereco,
            string lojaFone,
            DateTime dataHora,
            string clienteNome,
            string vendedorNome,
            IEnumerable<Item> itens,
            bool isDinheiro,
            decimal totalDesconto,
            decimal totalFinal,
            string? codigoFichario
        )
        {
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

            string Money(decimal v) => v.ToString("N2", new CultureInfo("pt-BR"));

            var parts = new List<byte[]>();

            // cabeçalho
            parts.Add(boldOn);
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii(lojaNome)))));
            parts.Add(boldOff);

            // linha em branco
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii(lojaEndereco)))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii(lojaFone)))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center($"Data: {dataHora:dd/MM/yy HH:mm:ss}"))));
            parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

            parts.Add(Encoding.ASCII.GetBytes(Line("CLIENTE: " + ToAscii(clienteNome))));
            parts.Add(Encoding.ASCII.GetBytes(Line("VENDEDOR: " + ToAscii(vendedorNome))));
            parts.Add(Encoding.ASCII.GetBytes(Line("FORMA: " + (isDinheiro ? "DINHEIRO" : "MARCAR"))));
            parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

            var itensList = itens?.ToList() ?? new List<Item>();

            if (itensList.Count > 0)
            {
                if (isDinheiro)
                {
                    parts.Add(Encoding.ASCII.GetBytes(Line("QTD DESCRICAO        VALOR  DESC")));
                    parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

                    foreach (var it in itensList)
                    {
                        string desc = ToAscii(it.Desc);
                        if (desc.Length > 18) desc = desc[..18];

                        string linha =
                            $"{it.Qty,3} " +
                            $"{desc,-18}" +
                            $"{Money(it.Unit),8}" +
                            $"{Money(it.Discount),7}";

                        parts.Add(Encoding.ASCII.GetBytes(Line(linha)));
                    }

                    parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));
                    parts.Add(Encoding.ASCII.GetBytes(Line($"DESCONTO: {Money(totalDesconto)}")));
                    parts.Add(Encoding.ASCII.GetBytes(Line($"TOTAL:    {Money(totalFinal)}")));
                }
                else
                {
                    // MARCAR: só qtd + descrição
                    parts.Add(Encoding.ASCII.GetBytes(Line("QTD DESCRICAO")));
                    parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

                    foreach (var it in itensList)
                    {
                        string desc = ToAscii(it.Desc);
                        if (desc.Length > 36) desc = desc[..36];
                        string linha = $"{it.Qty,3} {desc}";
                        parts.Add(Encoding.ASCII.GetBytes(Line(linha)));
                    }
                }
            }
            else
            {
                parts.Add(Encoding.ASCII.GetBytes(Line("SEM ITENS")));
            }

            parts.Add(Encoding.ASCII.GetBytes("\r\n"));

            if (!string.IsNullOrWhiteSpace(codigoFichario))
                parts.Add(Encoding.ASCII.GetBytes(Line(Center("FICHARIO: " + ToAscii(codigoFichario)))));
            else
                parts.Add(Encoding.ASCII.GetBytes(Line(Center("FICHARIO: __________"))));

            parts.Add(Encoding.ASCII.GetBytes(Line(Center("O ELISEU AGRADECE A PREFERÊNCIA"))));

            parts.Add(Encoding.ASCII.GetBytes("\r\n\r\n\r\n\r\n\r\n"));

            int total = parts.Sum(p => p.Length);
            var buf = new byte[total];
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
            var arr = n.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray();
            var ascii = new string(arr);
            return new string(ascii.Select(c => c <= 0x7F ? c : '?').ToArray());
        }
    }
}
