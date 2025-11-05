// /js/contasPagar.js

let todosClientesCP = [];
let clientesFiltradosCP = [];
let movimentosCliente = [];

let contasPgAtual = 1;
const contasPgPageSize = 50;

iniciarContasPagar();

async function iniciarContasPagar() {
  await carregarClientesContas();
  wiringEventosContas();
}

async function carregarClientesContas() {
  const sel = document.getElementById('filter-person');
  if (!sel) return;

  sel.innerHTML = '<option value="">Selecione um cliente</option>';

  // tenta endpoint dedicado; se falhar, usa fallback via /api/clientes
  let carregado = false;
  try {
    const resp = await fetch('/api/contas/clientes');
    if (resp.ok) {
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : [];
      todosClientesCP = arr.map(c => ({
        id: c.id ?? c.clientesId ?? c.ClientesId,
        nome: c.nome ?? c.Nome
      })).filter(c => c.id && c.nome);
      carregado = true;
    }
  } catch (_) {}

  if (!carregado) {
    try {
      const resp2 = await fetch('/api/clientes?pageSize=100000');
      if (resp2.ok) {
        const data2 = await resp2.json();
        const items = Array.isArray(data2) ? data2 : (Array.isArray(data2.items) ? data2.items : []);
        todosClientesCP = items.map(c => ({
          id: c.id ?? c.clientesId ?? c.ClientesId,
          nome: c.nome ?? c.Nome
        })).filter(c => c.id && c.nome);
        carregado = true;
      }
    } catch (_) {}
  }

  if (!carregado) {
    sel.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    return;
  }

  clientesFiltradosCP = [...todosClientesCP];
  popularSelectClientes();
}

function popularSelectClientes() {
  const sel = document.getElementById('filter-person');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Selecione um cliente</option>';
  clientesFiltradosCP.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id ?? c.clientesId ?? c.ClientesId ?? c.clientesID;
    opt.textContent = c.nome ?? c.Nome ?? '';
    sel.appendChild(opt);
  });
  sel.value = current || '';
}

function wiringEventosContas() {
  document.getElementById('filter-text')?.addEventListener('input', () => {
    const txt = (document.getElementById('filter-text').value || '').toLowerCase();
    if (!txt) {
      clientesFiltradosCP = [...todosClientesCP];
    } else {
      clientesFiltradosCP = todosClientesCP.filter(c => (c.nome || '').toLowerCase().includes(txt));
    }
    popularSelectClientes();
  });

  document.getElementById('filter-person')?.addEventListener('change', async () => {
    const id = document.getElementById('filter-person').value;
    if (!id) {
      limparTabelaContas('Selecione um cliente para carregar os movimentos...');
      togglePayButton(true);
      return;
    }
    await carregarMovimentosCliente(parseInt(id, 10));
  });

  document.getElementById('select-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('#tb-contas-pagar tbody input[type="checkbox"]').forEach(cb => {
      cb.checked = checked;
    });
    togglePayButton(!haSelecionados());
  });

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
      const id = parseInt(document.getElementById('filter-person').value, 10);
      await carregarMovimentosCliente(id);
    } else {
      const txt = await resp.text();
      alert('Erro ao marcar como pago' + (txt ? `\n${txt}` : ''));
    }
  });

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

async function carregarMovimentosCliente(clienteId) {
  limparTabelaContas('Carregando...');
  const resp = await fetch(`/api/contas/movimentos?clienteId=${clienteId}`);
  if (!resp.ok) {
    limparTabelaContas('Erro ao carregar movimentos');
    return;
  }
  const data = await resp.json();
  movimentosCliente = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  contasPgAtual = 1;
  renderTabelaContas();
  atualizarPaginacaoContas();
}

function limparTabelaContas(msg) {
  const tbody = document.querySelector('#tb-contas-pagar tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${msg}</td></tr>`;
}

function renderTabelaContas() {
  const tbody = document.querySelector('#tb-contas-pagar tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!movimentosCliente || movimentosCliente.length === 0) {
    limparTabelaContas('Nenhum movimento em aberto.');
    togglePayButton(true);
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
      dataVendaIso: m.dataVenda ?? m.DataVenda ?? '',
      valor: m.valorVenda ?? m.precoTotalDiaVenda ?? m.ValorVenda ?? m.PrecoTotalDiaVenda ?? 0
    };

    const dataVendaFmt = dados.dataVendaIso ? new Date(dados.dataVendaIso).toLocaleDateString() : '';
    const valorFmt = (typeof dados.valor === 'number' ? dados.valor : parseFloat(dados.valor || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
}

function atualizarPaginacaoContas() {
  const info = document.getElementById('contas-pg-info');
  const btnPrev = document.getElementById('contas-pg-prev');
  const btnNext = document.getElementById('contas-pg-next');

  const total = movimentosCliente.length;
  const totalPaginas = Math.max(1, Math.ceil(total / contasPgPageSize));
  const inicio = total === 0 ? 0 : (contasPgAtual - 1) * contasPgPageSize + 1;
  const fim = total === 0 ? 0 : Math.min(contasPgAtual * contasPgPageSize, total);

  if (info) {
    info.textContent = total === 0 ? 'Nenhum registro' : `Mostrando ${inicio}-${fim} de ${total} (pág. ${contasPgAtual} de ${totalPaginas})`;
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

function coletarSelecionados() {
  const ids = [];
  document.querySelectorAll('#tb-contas-pagar tbody input.row-select:checked').forEach(cb => {
    const id = parseInt(cb.getAttribute('data-id'), 10);
    if (!isNaN(id)) ids.push(id);
  });
  return ids;
}

function haSelecionados() {
  return document.querySelector('#tb-contas-pagar tbody input.row-select:checked') !== null;
}

function togglePayButton(disabled) {
  const btn = document.getElementById('btn-pay');
  if (btn) btn.disabled = disabled;
}
