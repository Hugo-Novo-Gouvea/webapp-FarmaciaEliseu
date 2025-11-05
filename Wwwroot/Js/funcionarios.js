// /js/funcionarios.js

let funcionarioSelecionado = null;

// dataset completo vindo do back
let todosFuncionarios = [];
let funcionariosFiltrados = [];

// paginação no front
let funcionariosPaginaAtual = 1;
const funcionariosPageSize = 50;

// inicial
carregarFuncionarios();

/* ========== CARREGAR TODOS ========== */
async function carregarFuncionarios() {
  const resp = await fetch('/api/funcionarios?pageSize=100000');
  const tbody = document.querySelector('#tb-funcionarios tbody');

  if (!resp.ok) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="1" class="text-center text-danger">Erro ao carregar funcionários.</td></tr>`;
    }
    return;
  }

  const data = await resp.json();
  const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  todosFuncionarios = items;
  aplicarFiltroFuncionarios();
  const btnNew = document.getElementById('btn-new');
  if (btnNew) btnNew.disabled = false;
}

/* ========== FILTRO POR COLUNA ========== */
function aplicarFiltroFuncionarios() {
  const col = document.getElementById('filter-column')?.value || 'nome';
  const txt = (document.getElementById('filter-text')?.value || '').trim().toLowerCase();

  if (!txt) {
    funcionariosFiltrados = [...todosFuncionarios];
  } else {
    funcionariosFiltrados = todosFuncionarios.filter(f => {
      const valor = pegarValorColunaFunc(f, col);
      return valor.toLowerCase().includes(txt);
    });
  }

  funcionariosPaginaAtual = 1;
  renderTabelaFuncionarios();
  atualizarPaginacaoFuncionarios();
}

function pegarValorColunaFunc(f, col) {
  switch (col) {
    case 'nome':
    default: return f.nome || '';
  }
}

/* ========== RENDER TABELA (COM PAGINAÇÃO LOCAL) ========== */
function renderTabelaFuncionarios() {
  const tbody = document.querySelector('#tb-funcionarios tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!funcionariosFiltrados || funcionariosFiltrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="1" class="text-center text-muted">Nenhum funcionário encontrado.</td></tr>`;
    funcionarioSelecionado = null;
    toggleBotoesFuncionarios(true);
    return;
  }

  const inicio = (funcionariosPaginaAtual - 1) * funcionariosPageSize;
  const fim = inicio + funcionariosPageSize;
  const pagina = funcionariosFiltrados.slice(inicio, fim);

  pagina.forEach(f => {
    const tr = document.createElement('tr');

    const fData = {
      id: f.funcionariosId ?? f.funcionariosID ?? f.id ?? '',
      nome: f.nome ?? ''
    };

    tr.innerHTML = `
      <td>${fData.nome}</td>
    `;

    tr.addEventListener('click', () => {
      document.querySelectorAll('#tb-funcionarios tbody tr').forEach(row => {
        row.classList.remove('selected');
      });
      tr.classList.add('selected');
      funcionarioSelecionado = fData;
      toggleBotoesFuncionarios(false);
    });

    tbody.appendChild(tr);
  });

  funcionarioSelecionado = null;
  toggleBotoesFuncionarios(true);
}

/* ========== BOTÕES VISUALIZAR/EDITAR/EXCLUIR ========== */
function toggleBotoesFuncionarios(disabled) {
  ['btn-view', 'btn-edit', 'btn-delete'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

/* ========== PAGINAÇÃO (VOLTA / AVANÇA) ========== */
function atualizarPaginacaoFuncionarios() {
  const info = document.getElementById('funcionarios-pg-info');
  const btnPrev = document.getElementById('funcionarios-pg-prev');
  const btnNext = document.getElementById('funcionarios-pg-next');

  const total = funcionariosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / funcionariosPageSize));

  const inicio = total === 0 ? 0 : (funcionariosPaginaAtual - 1) * funcionariosPageSize + 1;
  const fim = total === 0 ? 0 : Math.min(funcionariosPaginaAtual * funcionariosPageSize, total);

  if (info) {
    if (total === 0) {
      info.textContent = 'Nenhum registro';
    } else {
      info.textContent = `Mostrando ${inicio}-${fim} de ${total} (pág. ${funcionariosPaginaAtual} de ${totalPaginas})`;
    }
  }

  if (btnPrev) {
    const disabled = funcionariosPaginaAtual <= 1;
    btnPrev.disabled = disabled;
    btnPrev.classList.toggle('is-disabled', disabled);
  }

  if (btnNext) {
    const disabled = funcionariosPaginaAtual >= totalPaginas;
    btnNext.disabled = disabled;
    btnNext.classList.toggle('is-disabled', disabled);
  }
}

document.getElementById('funcionarios-pg-prev')?.addEventListener('click', () => {
  const totalPaginas = Math.max(1, Math.ceil(funcionariosFiltrados.length / funcionariosPageSize));
  if (funcionariosPaginaAtual > 1) {
    funcionariosPaginaAtual--;
    renderTabelaFuncionarios();
    atualizarPaginacaoFuncionarios();
  }
});

document.getElementById('funcionarios-pg-next')?.addEventListener('click', () => {
  const totalPaginas = Math.max(1, Math.ceil(funcionariosFiltrados.length / funcionariosPageSize));
  if (funcionariosPaginaAtual < totalPaginas) {
    funcionariosPaginaAtual++;
    renderTabelaFuncionarios();
    atualizarPaginacaoFuncionarios();
  }
});

/* ========== FILTRO INPUT/LISTA ========== */
document.getElementById('filter-text')?.addEventListener('input', () => {
  aplicarFiltroFuncionarios();
});
document.getElementById('filter-column')?.addEventListener('change', () => {
  aplicarFiltroFuncionarios();
});

/* ========== VISUALIZAR ========== */
document.getElementById('btn-view')?.addEventListener('click', () => {
  if (!funcionarioSelecionado) return;
  abrirModalFuncionario(funcionarioSelecionado);
});

function abrirModalFuncionario(f) {
  const backdrop = document.getElementById('funcionario-modal-backdrop');
  document.getElementById('m-nome').textContent = f.nome || '';
  backdrop.classList.add('show');
  document.getElementById('modal-close-btn').onclick = () => backdrop.classList.remove('show');
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.classList.remove('show'); };
}

/* ========== EDITAR ========== */
document.getElementById('btn-edit')?.addEventListener('click', () => {
  if (!funcionarioSelecionado) return;
  const editBackdrop = document.getElementById('funcionario-edit-backdrop');
  document.getElementById('e-id').value = funcionarioSelecionado.id;
  document.getElementById('e-nome').value = funcionarioSelecionado.nome;
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

  const payload = {
    funcionariosId: parseInt(id, 10),
    nome: nome,
    deletado: false
  };

  const resp = await fetch(`/api/funcionarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    document.getElementById('funcionario-edit-backdrop').classList.remove('show');
    await carregarFuncionarios();
  } else {
    const txt = await resp.text();
    alert('Erro ao atualizar funcionário:\n' + txt);
  }
});

/* ========== DELETE ========== */
document.getElementById('btn-delete')?.addEventListener('click', async () => {
  if (!funcionarioSelecionado) return;
  const ok = confirm(`Confirma excluir o funcionário "${funcionarioSelecionado.nome}"?`);
  if (!ok) return;

  const resp = await fetch(`/api/funcionarios/${funcionarioSelecionado.id}`, {
    method: 'DELETE'
  });

  if (resp.ok) {
    await carregarFuncionarios();
    funcionarioSelecionado = null;
    toggleBotoesFuncionarios(true);
  } else {
    const txt = await resp.text();
    alert('Erro ao excluir:\n' + txt);
  }
});

/* ========== NOVO ========== */
document.getElementById('btn-new')?.addEventListener('click', () => {
  const b = document.getElementById('funcionario-new-backdrop');
  if (!b) return;
  document.getElementById('n-nome').value = '';
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

  const payload = {
    nome: nome,
    deletado: false
  };

  const resp = await fetch('/api/funcionarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    document.getElementById('funcionario-new-backdrop').classList.remove('show');
    await carregarFuncionarios();
  } else {
    const txt = await resp.text();
    alert('Erro ao criar funcionário:\n' + txt);
  }
});
