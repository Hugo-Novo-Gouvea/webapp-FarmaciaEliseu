using System.Text.Json;

namespace WebAppEstudo.Data;

public class DbConfig
{
    public string mode { get; set; } = "windows";
    public string? target { get; set; }
    public string server { get; set; } = "";
    public string database { get; set; } = "";
    public string username { get; set; } = "";
    public string password { get; set; } = "";
    public bool encrypt { get; set; } = false;
    public bool trustServerCertificate { get; set; } = false;

    public static DbConfig? Load(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                var json = File.ReadAllText(path);
                return JsonSerializer.Deserialize<DbConfig>(json);
            }
        }
        catch { }
        return new DbConfig();
    }

    public static void Save(DbConfig cfg, string path)
    {
        var json = JsonSerializer.Serialize(cfg, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(path, json);
    }
}
