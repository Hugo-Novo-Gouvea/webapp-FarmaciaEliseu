using System.Collections.Concurrent;
using System.Threading.Channels;

namespace WebAppEstudo.Services;

public class PrintQueue
{
    // Usa System.Threading.Channels para criar uma fila assíncrona eficiente
    private readonly Channel<byte[]> _queue;

    public PrintQueue()
    {
        // Fila sem limite de capacidade (Unbounded)
        _queue = Channel.CreateUnbounded<byte[]>();
    }

    public void Enqueue(byte[] printData)
    {
        _queue.Writer.TryWrite(printData);
    }

    public IAsyncEnumerable<byte[]> ReadAllAsync(CancellationToken ct)
    {
        return _queue.Reader.ReadAllAsync(ct);
    }
}