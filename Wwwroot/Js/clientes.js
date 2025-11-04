// /js/clientes.js

let clienteSelecionado = null;
let clientesCache = []; // pra filtrar sem bater no back

carregarClientes();

function carregarClientes() {
  fetch('/api/clientes')
    .then(r => r.json())
    .then(clientes => {
      clientesCache = clientes;
      renderTabela(clientes);
      document.getElementById('btn-new').disabled = false;
    })
    .catch(err => {
      console.error(err);
      const tbody = document.querySelector('#tb-clientes tbody');
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar clientes</td></tr>`;
    });
}

function renderTabela(clientes) {
  const tbody = document.querySelector('#tb-clientes tbody');
  tbody.innerHTML = '';

  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>`;
    return;
  }

  clientes.forEach(c => {
    const tr = document.createElement('tr');

    const clienteData = {
      id: c.clientesId ?? c.clientesID ?? '',
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
      <td class="col-hidden">${clienteData.id}</td>
      <td>${clienteData.nome}</td>
      <td>${clienteData.endereco}</td>
      <td>${clienteData.telefone}</td>
      <td>${clienteData.celular}</td>
    `;

    tr.addEventListener('click', () => {
      selecionarLinha(tr, clienteData);
    });

    tbody.appendChild(tr);
  });

  // reset seleção
  clienteSelecionado = null;
  document.getElementById('btn-view').disabled = true;
  document.getElementById('btn-edit').disabled = true;
  document.getElementById('btn-delete').disabled = true;
}

function selecionarLinha(tr, clienteData) {
  document.querySelectorAll('#tb-clientes tbody tr').forEach(row => {
    row.classList.remove('selected');
  });

  tr.classList.add('selected');
  clienteSelecionado = clienteData;

  document.getElementById('btn-view').disabled = false;
  document.getElementById('btn-edit').disabled = false;
  document.getElementById('btn-delete').disabled = false;
}

/* ========== VISUALIZAR ========== */
document.getElementById('btn-view').addEventListener('click', () => {
  if (!clienteSelecionado) return;
  const b = document.getElementById('cliente-modal-backdrop');

  document.getElementById('m-nome').textContent = clienteSelecionado.nome;
  document.getElementById('m-endereco').textContent = clienteSelecionado.endereco;
  document.getElementById('m-rg').textContent = clienteSelecionado.rg;
  document.getElementById('m-cpf').textContent = clienteSelecionado.cpf;
  document.getElementById('m-telefone').textContent = clienteSelecionado.telefone;
  document.getElementById('m-celular').textContent = clienteSelecionado.celular;
  document.getElementById('m-data-nasc').textContent = clienteSelecionado.dataNascimentoIso
    ? new Date(clienteSelecionado.dataNascimentoIso).toLocaleDateString()
    : '';
  document.getElementById('m-cod-fichario').textContent = clienteSelecionado.codigoFichario || '';

  b.classList.add('show');
  document.getElementById('modal-close-btn').onclick = () => b.classList.remove('show');
  b.onclick = (e) => { if (e.target === b) b.classList.remove('show'); };
});

/* ========== EDITAR ========== */
document.getElementById('btn-edit').addEventListener('click', () => {
  if (!clienteSelecionado) return;
  const b = document.getElementById('cliente-edit-backdrop');

  document.getElementById('e-id').value = clienteSelecionado.id;
  document.getElementById('e-nome').value = clienteSelecionado.nome;

  // tentar quebrar o endereço que veio do banco
  const partes = (clienteSelecionado.endereco || '').split(',').map(p => p.trim());
  document.getElementById('e-logradouro').value = partes[0] && partes[0] !== 'Não Informado' ? partes[0] : '';
  document.getElementById('e-numero').value = partes[1] && partes[1] !== '000' ? partes[1] : '';
  document.getElementById('e-bairro').value = partes[2] && partes[2] !== 'Não Informado' ? partes[2] : '';

  document.getElementById('e-rg').value = clienteSelecionado.rg || '';
  document.getElementById('e-cpf').value = clienteSelecionado.cpf || '';
  document.getElementById('e-telefone').value = clienteSelecionado.telefone || '';
  document.getElementById('e-celular').value = clienteSelecionado.celular || '';
  document.getElementById('e-cod-fichario').value = clienteSelecionado.codigoFichario || '';

  if (clienteSelecionado.dataNascimentoIso) {
    document.getElementById('e-data-nasc').value = clienteSelecionado.dataNascimentoIso.substring(0, 10);
  } else {
    document.getElementById('e-data-nasc').value = '';
  }

  b.classList.add('show');
  document.getElementById('edit-close-btn').onclick = () => b.classList.remove('show');
  document.getElementById('edit-cancel-btn').onclick = () => b.classList.remove('show');
  b.onclick = (e) => { if (e.target === b) b.classList.remove('show'); };
});

document.getElementById('edit-form').addEventListener('submit', async (e) => {
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

  const payload = {
    clientesId: parseInt(id, 10),
    nome: nome,
    endereco: endereco,
    rg: document.getElementById('e-rg').value,
    cpf: document.getElementById('e-cpf').value,
    telefone: document.getElementById('e-telefone').value,
    celular: document.getElementById('e-celular').value,
    dataNascimento: document.getElementById('e-data-nasc').value || null,
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
    carregarClientes();
  } else {
    alert('Erro ao atualizar cliente');
  }
});

/* ========== NOVO ========== */
document.getElementById('btn-new').addEventListener('click', () => {
  const b = document.getElementById('cliente-new-backdrop');

  document.getElementById('n-nome').value = '';
  document.getElementById('n-logradouro').value = '';
  document.getElementById('n-numero').value = '';
  document.getElementById('n-bairro').value = '';
  document.getElementById('n-rg').value = '';
  document.getElementById('n-cpf').value = '';
  document.getElementById('n-telefone').value = '';
  document.getElementById('n-celular').value = '';
  document.getElementById('n-data-nasc').valueAsDate = new Date();
  document.getElementById('n-cod-fichario').value = '';

  b.classList.add('show');
  document.getElementById('new-close-btn').onclick = () => b.classList.remove('show');
  document.getElementById('new-cancel-btn').onclick = () => b.classList.remove('show');
  b.onclick = (e) => { if (e.target === b) b.classList.remove('show'); };
});

document.getElementById('new-form').addEventListener('submit', async (e) => {
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

  const payload = {
    nome: nome,
    endereco: endereco,
    rg: document.getElementById('n-rg').value,
    cpf: document.getElementById('n-cpf').value,
    telefone: document.getElementById('n-telefone').value,
    celular: document.getElementById('n-celular').value,
    dataNascimento: document.getElementById('n-data-nasc').value || new Date().toISOString(),
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
    carregarClientes();
  } else {
    const txt = await resp.text();
    alert('Erro ao criar cliente:\n' + txt);
  }
});

/* ========== DELETE ========== */
document.getElementById('btn-delete').addEventListener('click', async () => {
  if (!clienteSelecionado) return;
  const ok = confirm(`Confirma excluir o cliente "${clienteSelecionado.nome}"?`);
  if (!ok) return;

  const resp = await fetch(`/api/clientes/${clienteSelecionado.id}`, {
    method: 'DELETE'
  });

  if (resp.ok) {
    carregarClientes();
  } else {
    alert('Erro ao excluir');
  }
});

/* ========== BUSCA ========== */
document.getElementById('filter-text').addEventListener('input', filtrarTabela);
document.getElementById('filter-column').addEventListener('change', filtrarTabela);

function filtrarTabela() {
  const col = document.getElementById('filter-column').value;
  const txt = document.getElementById('filter-text').value.toLowerCase();

  const filtrados = clientesCache.filter(c => {
    const valor = (c[col] || '').toString().toLowerCase();
    return valor.includes(txt);
  });

  renderTabela(filtrados);
}

/* ========== UTIL ========== */
function montarEndereco(log, num, bairro) {
  const l = log && log.trim() ? log.trim() : 'Não Informado';
  const n = num && num.trim() ? num.trim() : '000';
  const b = bairro && bairro.trim() ? bairro.trim() : 'Não Informado';
  return `${l}, ${n}, ${b}`;
}

/* ========== MÁSCARAS ========== */

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
  let v = apenasNumeros(el.value).slice(0, 9); // 9 dígitos
  // 00.000.000-0
  v = v.replace(/(\d{2})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1})$/, '$1-$2');
  el.value = v;
}

function aplicarMascaraTelefone(el) {
  // telefone fixo: (00)0000-0000 -> 10 dígitos
  let v = apenasNumeros(el.value).slice(0, 10);
  v = v.replace(/(\d{2})(\d)/, '($1)$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  el.value = v;
}

function aplicarMascaraCelular(el) {
  // celular: (00)00000-0000 -> 11 dígitos
  let v = apenasNumeros(el.value).slice(0, 11);
  v = v.replace(/(\d{2})(\d)/, '($1)$2');
  v = v.replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
}

// delega máscaras
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
