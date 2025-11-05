// /js/clientes.js

let clienteSelecionado = null;

// dataset completo vindo do back
let todosClientes = [];
let clientesFiltrados = [];

// paginação no front
let clientesPaginaAtual = 1;
const clientesPageSize = 50;

// inicial
carregarClientes();

/* ========== CARREGAR TODOS ========== */
async function carregarClientes() {
  // busca todos os clientes (pede uma página grande)
  const resp = await fetch('/api/clientes?pageSize=100000');
  const tbody = document.querySelector('#tb-clientes tbody');

  if (!resp.ok) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar clientes.</td></tr>`;
    }
    return;
  }

  const data = await resp.json();
  // a API retorna { items, total, ... } ou uma lista
  const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  // guarda tudo
  todosClientes = items;
  // aplica filtro atual
  aplicarFiltro();
  // botão novo pode
  document.getElementById('btn-new').disabled = false;
}

/* ========== FILTRO POR COLUNA ========== */
function aplicarFiltro() {
  const col = document.getElementById('filter-column')?.value || 'nome';
  const txt = (document.getElementById('filter-text')?.value || '').trim().toLowerCase();

  if (!txt) {
    clientesFiltrados = [...todosClientes];
  } else {
    clientesFiltrados = todosClientes.filter(c => {
      const valor = pegarValorColuna(c, col);
      return valor.toLowerCase().includes(txt);
    });
  }

  clientesPaginaAtual = 1;
  renderTabela();
  atualizarPaginacaoClientes();
}

function pegarValorColuna(c, col) {
  switch (col) {
    case 'endereco': return c.endereco || '';
    case 'telefone': return c.telefone || '';
    case 'celular': return c.celular || '';
    case 'cpf': return c.cpf || '';
    case 'rg': return c.rg || '';
    case 'nome':
    default: return c.nome || '';
  }
}

/* ========== RENDER TABELA (COM PAGINAÇÃO LOCAL) ========== */
function renderTabela() {
  const tbody = document.querySelector('#tb-clientes tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!clientesFiltrados || clientesFiltrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>`;
    clienteSelecionado = null;
    toggleBotoes(true);
    return;
  }

  const inicio = (clientesPaginaAtual - 1) * clientesPageSize;
  const fim = inicio + clientesPageSize;
  const pagina = clientesFiltrados.slice(inicio, fim);

  pagina.forEach(c => {
    const tr = document.createElement('tr');

    // montar dados
    const clienteData = {
      id: c.clientesId ?? c.clientesID ?? c.id ?? '',
      nome: c.nome ?? '',
      endereco: c.endereco ?? '',
      rg: c.rg ?? '',
      cpf: c.cpf ?? '',
      telefone: c.telefone ?? '',
      celular: c.celular ?? '',
      dataNascimentoIso: c.dataNascimento || '',
      codigoFichario: c.codigoFichario ?? '',
      deletadoBool: !!c.deletado
    };

    tr.innerHTML = `
      <td>${clienteData.nome}</td>
      <td>${clienteData.endereco}</td>
      <td>${clienteData.telefone}</td>
      <td>${clienteData.celular}</td>
    `;

    tr.addEventListener('click', () => {
      document.querySelectorAll('#tb-clientes tbody tr').forEach(row => {
        row.classList.remove('selected');
      });
      tr.classList.add('selected');
      clienteSelecionado = clienteData;
      toggleBotoes(false);
    });

    tbody.appendChild(tr);
  });

  // se não clicar, fica desabilitado
  clienteSelecionado = null;
  toggleBotoes(true);
}

/* ========== BOTÕES VISUALIZAR/EDITAR/EXCLUIR ========== */
function toggleBotoes(disabled) {
  ['btn-view', 'btn-edit', 'btn-delete'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

/* ========== PAGINAÇÃO (VOLTA / AVANÇA) ========== */
function atualizarPaginacaoClientes() {
  const info = document.getElementById('clientes-pg-info');
  const btnPrev = document.getElementById('clientes-pg-prev');
  const btnNext = document.getElementById('clientes-pg-next');

  const total = clientesFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / clientesPageSize));

  const inicio = total === 0 ? 0 : (clientesPaginaAtual - 1) * clientesPageSize + 1;
  const fim = total === 0 ? 0 : Math.min(clientesPaginaAtual * clientesPageSize, total);

  if (info) {
    if (total === 0) {
      info.textContent = 'Nenhum registro';
    } else {
      info.textContent = `Mostrando ${inicio}-${fim} de ${total} (pág. ${clientesPaginaAtual} de ${totalPaginas})`;
    }
  }

  if (btnPrev) {
    const disabled = clientesPaginaAtual <= 1;
    btnPrev.disabled = disabled;
    btnPrev.classList.toggle('is-disabled', disabled);
  }

  if (btnNext) {
    const disabled = clientesPaginaAtual >= totalPaginas;
    btnNext.disabled = disabled;
    btnNext.classList.toggle('is-disabled', disabled);
  }
}

document.getElementById('clientes-pg-prev')?.addEventListener('click', () => {
  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / clientesPageSize));
  if (clientesPaginaAtual > 1) {
    clientesPaginaAtual--;
    renderTabela();
    atualizarPaginacaoClientes();
  }
});

document.getElementById('clientes-pg-next')?.addEventListener('click', () => {
  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / clientesPageSize));
  if (clientesPaginaAtual < totalPaginas) {
    clientesPaginaAtual++;
    renderTabela();
    atualizarPaginacaoClientes();
  }
});

/* ========== FILTRO INPUT/LISTA ========== */
document.getElementById('filter-text')?.addEventListener('input', () => {
  aplicarFiltro();
});
document.getElementById('filter-column')?.addEventListener('change', () => {
  aplicarFiltro();
});

/* ========== VISUALIZAR ========== */
document.getElementById('btn-view')?.addEventListener('click', () => {
  if (!clienteSelecionado) return;
  abrirModalCliente(clienteSelecionado);
});

function abrirModalCliente(c) {
  const backdrop = document.getElementById('cliente-modal-backdrop');

  document.getElementById('m-nome').textContent = c.nome || '';
  document.getElementById('m-endereco').textContent = c.endereco || '';
  document.getElementById('m-rg').textContent = c.rg || '';
  document.getElementById('m-cpf').textContent = c.cpf || '';
  document.getElementById('m-telefone').textContent = c.telefone || '';
  document.getElementById('m-celular').textContent = c.celular || '';
  document.getElementById('m-data-nasc').textContent = c.dataNascimentoIso
    ? new Date(c.dataNascimentoIso).toLocaleDateString()
    : '';
  document.getElementById('m-cod-fichario').textContent = c.codigoFichario || '';

  backdrop.classList.add('show');

  document.getElementById('modal-close-btn').onclick = () => backdrop.classList.remove('show');
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.classList.remove('show'); };
}

/* ========== EDITAR ========== */
document.getElementById('btn-edit')?.addEventListener('click', () => {
  if (!clienteSelecionado) return;

  const editBackdrop = document.getElementById('cliente-edit-backdrop');

  // quebra endereço em 3
  const partes = (clienteSelecionado.endereco || '').split(',').map(p => p.trim());
  const logradouro = partes[0] || '';
  const numero = partes[1] || '';
  const bairro = partes[2] || '';

  document.getElementById('e-id').value = clienteSelecionado.id;
  document.getElementById('e-nome').value = clienteSelecionado.nome;
  document.getElementById('e-logradouro').value = logradouro;
  document.getElementById('e-numero').value = numero;
  document.getElementById('e-bairro').value = bairro;
  document.getElementById('e-rg').value = clienteSelecionado.rg;
  document.getElementById('e-cpf').value = clienteSelecionado.cpf;
  document.getElementById('e-telefone').value = clienteSelecionado.telefone;
  document.getElementById('e-celular').value = clienteSelecionado.celular;
  document.getElementById('e-cod-fichario').value = clienteSelecionado.codigoFichario;

  if (clienteSelecionado.dataNascimentoIso) {
    document.getElementById('e-data-nasc').value = clienteSelecionado.dataNascimentoIso.substring(0, 10);
  } else {
    document.getElementById('e-data-nasc').value = '';
  }

  editBackdrop.classList.add('show');

  document.getElementById('edit-close-btn').onclick = () => editBackdrop.classList.remove('show');
  document.getElementById('edit-cancel-btn').onclick = () => editBackdrop.classList.remove('show');
  editBackdrop.onclick = (e) => { if (e.target === editBackdrop) editBackdrop.classList.remove('show'); };
});

document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('e-id').value;
  const nome = document.getElementById('e-nome').value.trim();
  if (!nome) {
    alert('Nome é obrigatório.');
    document.getElementById('e-nome').focus();
    return;
  }

  const endereco = montarEndereco(
    document.getElementById('e-logradouro').value,
    document.getElementById('e-numero').value,
    document.getElementById('e-bairro').value
  );

  // data default hoje
  let dataNasc = document.getElementById('e-data-nasc').value;
  if (!dataNasc) {
    dataNasc = new Date().toISOString().substring(0, 10);
  }

  const payload = {
    clientesId: parseInt(id, 10),
    nome: nome,
    endereco: endereco,
    rg: document.getElementById('e-rg').value,
    cpf: document.getElementById('e-cpf').value,
    telefone: document.getElementById('e-telefone').value,
    celular: document.getElementById('e-celular').value,
    dataNascimento: dataNasc,
    codigoFichario: document.getElementById('e-cod-fichario').value
      ? parseInt(document.getElementById('e-cod-fichario').value, 10)
      : 0,
    deletado: false
  };

  const resp = await fetch(`/api/clientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    document.getElementById('cliente-edit-backdrop').classList.remove('show');
    await carregarClientes();
  } else {
    const txt = await resp.text();
    alert('Erro ao atualizar cliente:\n' + txt);
  }
});

/* ========== DELETE ========== */
document.getElementById('btn-delete')?.addEventListener('click', async () => {
  if (!clienteSelecionado) return;

  const ok = confirm(`Confirma excluir o cliente "${clienteSelecionado.nome}"?`);
  if (!ok) return;

  const resp = await fetch(`/api/clientes/${clienteSelecionado.id}`, {
    method: 'DELETE'
  });

  if (resp.ok) {
    await carregarClientes();
    clienteSelecionado = null;
    toggleBotoes(true);
  } else {
    const txt = await resp.text();
    alert('Erro ao excluir:\n' + txt);
  }
});

/* ========== NOVO ========== */
document.getElementById('btn-new')?.addEventListener('click', () => {
  const b = document.getElementById('cliente-new-backdrop');
  if (!b) return;

  document.getElementById('n-nome').value = '';
  document.getElementById('n-logradouro').value = '';
  document.getElementById('n-numero').value = '';
  document.getElementById('n-bairro').value = '';
  document.getElementById('n-rg').value = '';
  document.getElementById('n-cpf').value = '';
  document.getElementById('n-telefone').value = '';
  document.getElementById('n-celular').value = '';
  document.getElementById('n-data-nasc').value = '';
  document.getElementById('n-cod-fichario').value = '';

  b.classList.add('show');
  document.getElementById('new-close-btn').onclick = () => b.classList.remove('show');
  document.getElementById('new-cancel-btn').onclick = () => b.classList.remove('show');
  b.onclick = (e) => { if (e.target === b) b.classList.remove('show'); };
});

document.getElementById('new-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('n-nome').value.trim();
  if (!nome) {
    alert('Nome é obrigatório.');
    document.getElementById('n-nome').focus();
    return;
  }

  const endereco = montarEndereco(
    document.getElementById('n-logradouro').value,
    document.getElementById('n-numero').value,
    document.getElementById('n-bairro').value
  );

  // data default hoje
  let dataNasc = document.getElementById('n-data-nasc').value;
  if (!dataNasc) {
    dataNasc = new Date().toISOString().substring(0, 10);
  }

  const payload = {
    nome: nome,
    endereco: endereco,
    rg: document.getElementById('n-rg').value,
    cpf: document.getElementById('n-cpf').value,
    telefone: document.getElementById('n-telefone').value,
    celular: document.getElementById('n-celular').value,
    dataNascimento: dataNasc,
    codigoFichario: document.getElementById('n-cod-fichario').value
      ? parseInt(document.getElementById('n-cod-fichario').value, 10)
      : 0,
    deletado: false
  };

  const resp = await fetch('/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    document.getElementById('cliente-new-backdrop').classList.remove('show');
    await carregarClientes();
  } else {
    const txt = await resp.text();
    alert('Erro ao criar cliente:\n' + txt);
  }
});

/* ========== UTIL ========== */
function montarEndereco(log, num, bairro) {
  const l = log && log.trim() ? log.trim() : 'Não Informado';
  const n = num && num.trim() ? num.trim() : '000';
  const b = bairro && bairro.trim() ? bairro.trim() : 'Não Informado';
  return `${l}, ${n}, ${b}`;
}

/* ========== MÁSCARAS (limitam tamanho) ========== */
function apenasNumeros(str) {
  return str.replace(/\D/g, '');
}

function aplicarMascaraCpf(el) {
  let v = apenasNumeros(el.value).slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
}

function aplicarMascaraRg(el) {
  let v = apenasNumeros(el.value).slice(0, 9);
  v = v.replace(/(\d{2})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1})$/, '$1-$2');
  el.value = v;
}

function aplicarMascaraTelefone(el) {
  let v = apenasNumeros(el.value).slice(0, 10);
  v = v.replace(/(\d{2})(\d)/, '($1)$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  el.value = v;
}

function aplicarMascaraCelular(el) {
  let v = apenasNumeros(el.value).slice(0, 11);
  v = v.replace(/(\d{2})(\d)/, '($1)$2');
  v = v.replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
}

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.classList.contains('mask-cpf')) {
    aplicarMascaraCpf(t);
  } else if (t.classList.contains('mask-rg')) {
    aplicarMascaraRg(t);
  } else if (t.id === 'n-telefone' || t.id === 'e-telefone') {
    aplicarMascaraTelefone(t);
  } else if (t.id === 'n-celular' || t.id === 'e-celular') {
    aplicarMascaraCelular(t);
  }
});