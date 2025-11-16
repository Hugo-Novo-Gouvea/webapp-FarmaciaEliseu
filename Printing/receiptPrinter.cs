using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

namespace WebAppEstudo.Printing
{
    public static class ReceiptPrinter
    {
        // Largura típica de bobina 40 colunas
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
            byte[] boldOn = new byte[] { 0x1B, 0x45, 0x01 };
            byte[] boldOff = new byte[] { 0x1B, 0x45, 0x00 };

            string Line(string s)
            {
                if (s.Length > Cols) s = s[..Cols];
                return s + "\r\n";
            }

            string Center(string s)
            {
                s ??= "";
                if (s.Length >= Cols) return s[..Cols];
                int left = (Cols - s.Length) / 2;
                return new string(' ', left) + s;
            }

            string Money(decimal v) => v.ToString("N2", new CultureInfo("pt-BR"));

            string FitLeft(string s, int width)
            {
                s ??= "";
                if (s.Length > width) return s[..width];
                return s.PadRight(width);
            }

            string FitRight(string s, int width)
            {
                s ??= "";
                if (s.Length > width) return s[^width..];
                return s.PadLeft(width);
            }

            string RightLine(string s)
            {
                s ??= "";
                if (s.Length > Cols) s = s[^Cols..];
                return new string(' ', Math.Max(0, Cols - s.Length)) + s;
            }

            var parts = new List<byte[]>();

            // =========================
            // CABEÇALHO
            // =========================
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            parts.Add(boldOn);
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii(lojaNome)))));
            parts.Add(boldOff);

            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii("Amaro Franco de Oliveira,560,Jardim Sol")))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii("(19) 98121-6227")))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center($"Data: {dataHora:dd/MM/yy HH:mm:ss}"))));
            parts.Add(Encoding.ASCII.GetBytes(Line("")));

            // CLIENTE: NOME - CODFICH
            string clienteLinha = "CLIENTE: " + ToAscii(clienteNome);
            if (!string.IsNullOrWhiteSpace(codigoFichario))
            {
                clienteLinha += " - " + ToAscii(codigoFichario);
            }
            parts.Add(Encoding.ASCII.GetBytes(Line(clienteLinha)));

            parts.Add(Encoding.ASCII.GetBytes(Line("")));
            parts.Add(Encoding.ASCII.GetBytes(Line("VENDEDOR: " + ToAscii(vendedorNome))));
            parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

            // =========================
            // ITENS
            // =========================
            var itensList = itens?.ToList() ?? new List<Item>();

            if (itensList.Count > 0)
            {
                if (isDinheiro)
                {
                    // Cabeçalho: QTD DESCRICAO DESC UNIT TOTAL
                    string header = string.Concat(
                        FitLeft("QTD", 3), " ",
                        FitLeft("DESCRICAO", 10), " ",
                        FitLeft("DESC", 6), " ",
                        FitLeft("UNIT", 8), " ",
                        FitLeft("TOTAL", 9)
                    );
                    parts.Add(Encoding.ASCII.GetBytes(Line(header)));

                    foreach (var it in itensList)
                    {
                        string desc = ToAscii(it.Desc);
                        if (desc.Length > 10) desc = desc[..10];

                        decimal totalItem = (it.Unit * it.Qty) - it.Discount;
                        if (totalItem < 0) totalItem = 0;

                        string linha = string.Concat(
                            FitRight(it.Qty.ToString(), 3), " ",
                            FitLeft(desc, 10), " ",
                            FitRight(Money(it.Discount), 6), " ",
                            FitRight(Money(it.Unit), 8), " ",
                            FitRight(Money(totalItem), 9)
                        );

                        parts.Add(Encoding.ASCII.GetBytes(Line(linha)));
                    }

                    parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));
                    parts.Add(Encoding.ASCII.GetBytes(Line(RightLine("DESCONTO: " + Money(totalDesconto)))));
                    parts.Add(Encoding.ASCII.GetBytes(Line(RightLine("VALOR TOTAL: " + Money(totalFinal)))));
                }
                else
                {
                    // MARCAR: apenas quantidade + descrição
                    string header = string.Concat(
                        FitRight("QTD", 3), " ",
                        FitLeft("DESCRICAO", Cols - 4) // 3 + 1 + 36 = 40
                    );
                    parts.Add(Encoding.ASCII.GetBytes(Line(header)));
                    parts.Add(Encoding.ASCII.GetBytes(Line(new string('-', Cols))));

                    foreach (var it in itensList)
                    {
                        string desc = ToAscii(it.Desc);
                        if (desc.Length > (Cols - 4)) desc = desc[..(Cols - 4)];

                        string linha = string.Concat(
                            FitRight(it.Qty.ToString(), 3), " ",
                            FitLeft(desc, Cols - 4)
                        );

                        parts.Add(Encoding.ASCII.GetBytes(Line(linha)));
                    }
                }
            }
            else
            {
                parts.Add(Encoding.ASCII.GetBytes(Line("SEM ITENS")));
            }

            parts.Add(Encoding.ASCII.GetBytes("\r\n"));

            // =========================
            // RODAPÉ / ASSINATURA
            // =========================
            parts.Add(Encoding.ASCII.GetBytes(Line(Center("____________________"))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center(ToAscii(clienteNome)))));

            if (codigoMovimento.HasValue)
            {
                string doc = $"DOC: {codigoMovimento.Value:D6}";
                parts.Add(Encoding.ASCII.GetBytes(Line(Center(doc))));
            }

            parts.Add(Encoding.ASCII.GetBytes(Line("")));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center("O ELISEU AGRADECE A PREFERENCIA!!!"))));
            parts.Add(Encoding.ASCII.GetBytes(Line(Center("VOLTE SEMPRE"))));

            // espaço final pra guilhotina
            parts.Add(Encoding.ASCII.GetBytes("\r\n\r\n\r\n\r\n"));

            // Junta tudo num único buffer
            int totalBytes = parts.Sum(p => p.Length);
            var buf = new byte[totalBytes];
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
