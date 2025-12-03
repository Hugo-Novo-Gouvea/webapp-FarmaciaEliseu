using WebAppEstudo.Printing;

namespace WebAppEstudo.Services;

public class PrintWorker : BackgroundService
{
    private readonly PrintQueue _queue;
    private readonly ILogger<PrintWorker> _logger;

    public PrintWorker(PrintQueue queue, ILogger<PrintWorker> logger)
    {
        _queue = queue;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Serviço de Impressão em Background Iniciado.");

        // Loop infinito enquanto a aplicação estiver rodando
        await foreach (var printData in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                // Chama a classe estática original de impressão
                ReceiptPrinter.Print(printData);
                _logger.LogInformation("Impressão enviada com sucesso.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao enviar dados para a impressora.");
            }
        }
    }
}