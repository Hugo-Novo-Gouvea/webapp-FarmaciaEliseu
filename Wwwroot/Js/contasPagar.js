// /js/contasPagar.js
// Tela de Contas a Receber/Pagar
// Agora com AUTOCOMPLETE de clientes (apenas input) e mesma lógica de antes.

'use strict';

// ====== estado ======
let todosClientesCP = [];
let movimentosCliente = [];

let contasPgAtual = 1;
const contasPgPageSize = 50;
let clienteSelecionadoCP = null;

// inicialização
iniciarContasPagar();

async function iniciarContasPagar() {
  await carregarClientesContas();
  wiringEventosContas();
}

/* =========================================================
   1. CARREGAR LISTA DE CLIENTES (pro autocomplete)
   ========================================================= */
async function carregarClientesContas() {
  let carregado = false;

  // tenta endpoint específico
  try {
    const resp = await fetch('/api/contas/clientes');
    if (resp.ok) {
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : [];
      todosClientesCP = arr
        .map(c => ({
          id: c.id ?? c.clientesId ?? c.ClientesId,
          nome: c.nome ?? c.Nome
        }))
        .filter(c => c.id && c.nome);
      carregado = true;
    }
  } catch (_) { }

  // fallback pro /api/clientes
  if (!carregado) {
    try {
      const resp2 = await fetch('/api/clientes?pageSize=100000');
      if (resp2.ok) {
        const data2 = await resp2.json();
        const items = Array.isArray(data2)
          ? data2
          : Array.isArray(data2.items)
            ? data2.items
            : [];
        todosClientesCP = items
          .map(c => ({
            id: c.id ?? c.clientesId ?? c.ClientesId,
            nome: c.nome ?? c.Nome
          }))
          .filter(c => c.id && c.nome);
        carregado = true;
      }
    } catch (_) { }
  }

  // se não carregou, mostra mensagem na tabela
  if (!carregado) {
    limparTabelaContas('Erro ao carregar clientes');
  }
}

/* =========================================================
   2. EVENTOS DA TELA
   ========================================================= */
function wiringEventosContas() {
  const inp = document.getElementById('filter-person-input');
  const sug = document.getElementById('contas-clientes-suggest');

  // autocomplete de cliente
  inp?.addEventListener('input', () => {
    const txt = (inp.value || '').toLowerCase();
    if (!txt) {
      sug.style.display = 'none';
      clienteSelecionadoCP = null;
      limparTabelaContas('Digite o nome do cliente para carregar os movimentos...');
      togglePayButton(true);
      atualizarTotalContas(0);
      return;
    }
    const filtrados = todosClientesCP
      .filter(c => (c.nome || '').toLowerCase().includes(txt))
      .slice(0, 40);
    if (filtrados.length === 0) {
      sug.style.display = 'none';
      return;
    }
    sug.innerHTML = '';
    filtrados.forEach(c => {
      const div = document.createElement('div');
      div.className = 'suggest-item';
      div.textContent = c.nome;
      div.addEventListener('click', async () => {
        inp.value = c.nome;
        sug.style.display = 'none';
        clienteSelecionadoCP = c;
        await carregarMovimentosCliente(c.id);
      });
      sug.appendChild(div);
    });
    sug.style.display = 'block';
  });

  // fecha sugestões ao clicar fora
  document.addEventListener('click', (e) => {
    if (!sug) return;
    if (!sug.contains(e.target) && e.target !== inp) {
      sug.style.display = 'none';
    }
  });

  // checkbox de selecionar todos
  document.getElementById('select-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document
      .querySelectorAll('#tb-contas-pagar tbody input[type="checkbox"]')
      .forEach(cb => {
        cb.checked = checked;
      });
    togglePayButton(!haSelecionados());
  });

  // botão "marcar como pago"
  document.getElementById('btn-pay')?.addEventListener('click', async () => {
    const ids = coletarSelecionados();
    if (ids.length === 0) return;

    const ok = confirm(`Marcar ${ids.length} movimento(s) como pago?`);
    if (!ok) return;

    const resp = await fetch('/api/contas/movimentos/pagar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });

    if (resp.ok) {
      // imprimir cupom opcional
      let querImprimir = confirm('Pagamentos marcados.\nDeseja imprimir o cupom agora?');
      while (querImprimir) {
        const respPrint = await fetch('/api/contas/movimentos/imprimir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        if (!respPrint.ok) {
          const txt = await respPrint.text();
          alert('Erro ao imprimir cupom.' + (txt ? '\n' + txt : ''));
          break;
        }
        querImprimir = confirm('Imprimir novamente?');
      }

      // recarrega
      if (clienteSelecionadoCP?.id) {
        await carregarMovimentosCliente(clienteSelecionadoCP.id);
      }
    } else {
      const txt = await resp.text();
      alert('Erro ao marcar como pago' + (txt ? `\n${txt}` : ''));
    }
  });

  // paginação
  document.getElementById('contas-pg-prev')?.addEventListener('click', () => {
    const totalPaginas = Math.max(1, Math.ceil(movimentosCliente.length / contasPgPageSize));
    if (contasPgAtual > 1) {
      contasPgAtual--;
      renderTabelaContas();
      atualizarPaginacaoContas();
    }
  });

  document.getElementById('contas-pg-next')?.addEventListener('click', () => {
    const totalPaginas = Math.max(1, Math.ceil(movimentosCliente.length / contasPgPageSize));
    if (contasPgAtual < totalPaginas) {
      contasPgAtual++;
      renderTabelaContas();
      atualizarPaginacaoContas();
    }
  });
}

/* =========================================================
   3. CARREGAR MOVIMENTOS DO CLIENTE
   ========================================================= */
async function carregarMovimentosCliente(clienteId) {
  limparTabelaContas('Carregando...');

  const resp = await fetch(`/api/contas/movimentos?clienteId=${clienteId}`);
  if (!resp.ok) {
    limparTabelaContas('Erro ao carregar movimentos');
    atualizarTotalContas(0);
    return;
  }

  const data = await resp.json();
  movimentosCliente = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
      ? data.items
      : [];

  contasPgAtual = 1;
  renderTabelaContas();
  atualizarPaginacaoContas();
  atualizarTotalContas();
}

/* limpa o corpo da tabela com uma mensagem */
function limparTabelaContas(msg) {
  const tbody = document.querySelector('#tb-contas-pagar tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${msg}</td></tr>`;
}

/* =========================================================
   4. RENDER DA TABELA
   ========================================================= */
function renderTabelaContas() {
  const tbody = document.querySelector('#tb-contas-pagar tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!movimentosCliente || movimentosCliente.length === 0) {
    limparTabelaContas('Nenhum movimento em aberto.');
    togglePayButton(true);
    atualizarTotalContas(0);
    return;
  }

  const inicio = (contasPgAtual - 1) * contasPgPageSize;
  const fim = inicio + contasPgPageSize;
  const pagina = movimentosCliente.slice(inicio, fim);

  pagina.forEach(m => {
    const tr = document.createElement('tr');

    const dados = {
      id: m.id ?? m.movimentosId ?? m.MovimentosId ?? m.movimentosID,
      descricao: m.produtosDescricao ?? m.ProdutosDescricao ?? '',
      quantidade: m.quantidade ?? m.Quantidade ?? 0,
      dataVendaIso: m.dataVenda ?? m.DataVenda ?? ''
    };

    const valorNum = extrairValorMovimento(m);

    const dataVendaFmt = dados.dataVendaIso
      ? new Date(dados.dataVendaIso).toLocaleDateString()
      : '';
    const valorFmt = valorNum.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    tr.innerHTML = `
      <td><input type="checkbox" class="row-select" data-id="${dados.id}" /></td>
      <td>${dados.descricao}</td>
      <td>${dados.quantidade}</td>
      <td>${dataVendaFmt}</td>
      <td>${valorFmt}</td>
    `;

    tr.addEventListener('change', (e) => {
      if (e.target && e.target.matches('input.row-select')) {
        togglePayButton(!haSelecionados());
      }
    });

    tbody.appendChild(tr);
  });

  togglePayButton(!haSelecionados());
  atualizarTotalContas();
}

/* =========================================================
   5. PAGINAÇÃO
   ========================================================= */
function atualizarPaginacaoContas() {
  const info = document.getElementById('contas-pg-info');
  const btnPrev = document.getElementById('contas-pg-prev');
  const btnNext = document.getElementById('contas-pg-next');

  const total = movimentosCliente.length;
  const totalPaginas = Math.max(1, Math.ceil(total / contasPgPageSize));
  const inicio = total === 0 ? 0 : (contasPgAtual - 1) * contasPgPageSize + 1;
  const fim = total === 0 ? 0 : Math.min(contasPgAtual * contasPgPageSize, total);

  if (info) {
    info.textContent =
      total === 0
        ? 'Nenhum registro'
        : `Mostrando ${inicio}-${fim} de ${total} (pág. ${contasPgAtual} de ${totalPaginas})`;
  }

  if (btnPrev) {
    const disabled = contasPgAtual <= 1;
    btnPrev.disabled = disabled;
    btnPrev.classList.toggle('is-disabled', disabled);
  }

  if (btnNext) {
    const disabled = contasPgAtual >= totalPaginas;
    btnNext.disabled = disabled;
    btnNext.classList.toggle('is-disabled', disabled);
  }
}

/* =========================================================
   6. SELEÇÃO / BOTÃO PAGAR
   ========================================================= */
function coletarSelecionados() {
  const ids = [];
  document
    .querySelectorAll('#tb-contas-pagar tbody input.row-select:checked')
    .forEach(cb => {
      const id = parseInt(cb.getAttribute('data-id'), 10);
      if (!isNaN(id)) ids.push(id);
    });
  return ids;
}

function haSelecionados() {
  return (
    document.querySelector('#tb-contas-pagar tbody input.row-select:checked') !==
    null
  );
}

function togglePayButton(disabled) {
  const btn = document.getElementById('btn-pay');
  if (btn) btn.disabled = disabled;
}

/* =========================================================
   7. TOTALIZADOR
   ========================================================= */
function extrairValorMovimento(m) {
  let v =
    m.precoTotalAtual ??
    m.PrecoTotalAtual ??
    m.precoTotalDiaVenda ??
    m.PrecoTotalDiaVenda ??
    m.valorVenda ??
    m.ValorVenda ??
    0;

  const num = typeof v === 'number' ? v : parseFloat(v || 0);
  return isNaN(num) ? 0 : num;
}

function atualizarTotalContas(forceValor) {
  const el = document.getElementById('contas-total-info');
  if (!el) return;

  let total = 0;

  if (typeof forceValor === 'number') {
    total = forceValor;
  } else {
    total = (movimentosCliente || []).reduce(
      (acc, m) => acc + extrairValorMovimento(m),
      0
    );
  }

  el.textContent =
    'Total: ' +
    total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
