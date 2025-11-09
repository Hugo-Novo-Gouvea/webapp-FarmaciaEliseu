// /js/funcionarios.js
// CRUD de funcionários no mesmo padrão dos demais.

(() => {
  // -------------------------------------------------------------
  // ESTADO
  // -------------------------------------------------------------
  const state = {
    all: [],
    filtered: [],
    selected: null,
    page: 1,
    pageSize: 50
  };

  // -------------------------------------------------------------
  // ELEMENTOS
  // -------------------------------------------------------------
  const els = {
    tableBody: document.querySelector('#tb-funcionarios tbody'),
    filterColumn: document.getElementById('filter-column'),
    filterText: document.getElementById('filter-text'),
    btnView: document.getElementById('btn-view'),
    btnEdit: document.getElementById('btn-edit'),
    btnNew: document.getElementById('btn-new'),
    btnDelete: document.getElementById('btn-delete'),
    pagerInfo: document.getElementById('funcionarios-pg-info'),
    pagerPrev: document.getElementById('funcionarios-pg-prev'),
    pagerNext: document.getElementById('funcionarios-pg-next'),

    viewBackdrop: document.getElementById('funcionario-modal-backdrop'),
    editBackdrop: document.getElementById('funcionario-edit-backdrop'),
    newBackdrop: document.getElementById('funcionario-new-backdrop')
  };

  // -------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------
  init();

  async function init() {
    await loadData();
    wireEvents();
  }

  // -------------------------------------------------------------
  // LOAD
  // -------------------------------------------------------------
  async function loadData() {
    const resp = await fetch('/api/funcionarios?pageSize=100000');
    if (!resp.ok) {
      renderEmpty('Erro ao carregar funcionários.');
      return;
    }
    const data = await resp.json();
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    state.all = items;
    applyFilter();

    // liberar novo
    if (els.btnNew) els.btnNew.disabled = false;
  }

  // -------------------------------------------------------------
  // EVENTS
  // -------------------------------------------------------------
  function wireEvents() {
    els.filterText?.addEventListener('input', applyFilter);
    els.filterColumn?.addEventListener('change', applyFilter);

    els.pagerPrev?.addEventListener('click', () => changePage(-1));
    els.pagerNext?.addEventListener('click', () => changePage(1));

    els.btnView?.addEventListener('click', onView);
    els.btnEdit?.addEventListener('click', onEdit);
    els.btnDelete?.addEventListener('click', onDelete);
    els.btnNew?.addEventListener('click', onNew);
  }

  // -------------------------------------------------------------
  // FILTER
  // -------------------------------------------------------------
  function applyFilter() {
    const col = els.filterColumn?.value || 'nome';
    const txt = (els.filterText?.value || '').trim().toLowerCase();

    if (!txt) {
      state.filtered = [...state.all];
    } else {
      state.filtered = state.all.filter(f => {
        const val = getColumnValue(f, col);
        return val.toLowerCase().includes(txt);
      });
    }

    state.page = 1;
    renderTable();
    updatePager();
  }

  function getColumnValue(f, col) {
    switch (col) {
      case 'nome':
      default:
        return f.nome || '';
    }
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  function renderTable() {
    if (!els.tableBody) return;
    els.tableBody.innerHTML = '';

    if (!state.filtered.length) {
      renderEmpty('Nenhum funcionário encontrado.');
      setSelection(null);
      toggleActions(true);
      return;
    }

    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.filtered.slice(start, end);

    pageItems.forEach(f => {
      const data = {
        id: f.funcionariosId ?? f.funcionariosID ?? f.id ?? '',
        nome: f.nome ?? ''
      };

      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${data.nome}</td>`;
      tr.addEventListener('click', () => onRowClick(tr, data));
      els.tableBody.appendChild(tr);
    });

    setSelection(null);
    toggleActions(true);
  }

  function renderEmpty(msg) {
    if (!els.tableBody) return;
    els.tableBody.innerHTML = `<tr><td colspan="1" class="text-center text-muted">${msg}</td></tr>`;
  }

  // -------------------------------------------------------------
  // PAGINATION
  // -------------------------------------------------------------
  function changePage(delta) {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    const newPage = state.page + delta;
    if (newPage < 1 || newPage > totalPages) return;
    state.page = newPage;
    renderTable();
    updatePager();
  }

  function updatePager() {
    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    const start = total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    const end = total === 0 ? 0 : Math.min(state.page * state.pageSize, total);

    if (els.pagerInfo) {
      els.pagerInfo.textContent = total === 0
        ? 'Nenhum registro'
        : `Mostrando ${start}-${end} de ${total} (pág. ${state.page} de ${totalPages})`;
    }

    if (els.pagerPrev) {
      const disabled = state.page <= 1;
      els.pagerPrev.disabled = disabled;
      els.pagerPrev.classList.toggle('is-disabled', disabled);
    }
    if (els.pagerNext) {
      const disabled = state.page >= totalPages;
      els.pagerNext.disabled = disabled;
      els.pagerNext.classList.toggle('is-disabled', disabled);
    }
  }

  // -------------------------------------------------------------
  // SELECTION
  // -------------------------------------------------------------
  function onRowClick(tr, data) {
    document.querySelectorAll('#tb-funcionarios tbody tr').forEach(row => row.classList.remove('selected'));
    tr.classList.add('selected');
    setSelection(data);
    toggleActions(false);
  }

  function setSelection(func) {
    state.selected = func;
  }

  function toggleActions(disabled) {
    [els.btnView, els.btnEdit, els.btnDelete].forEach(btn => {
      if (btn) btn.disabled = disabled;
    });
  }

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------
  function onView() {
    if (!state.selected) return;
    const b = els.viewBackdrop;
    if (!b) return;
    document.getElementById('m-nome').textContent = state.selected.nome || '';
    b.classList.add('show');
    document.getElementById('modal-close-btn').onclick = () => b.classList.remove('show');
    b.onclick = e => { if (e.target === b) b.classList.remove('show'); };
  }

  function onEdit() {
    if (!state.selected) return;
    const b = els.editBackdrop;
    if (!b) return;

    document.getElementById('e-id').value = state.selected.id;
    document.getElementById('e-nome').value = state.selected.nome;

    b.classList.add('show');
    document.getElementById('edit-close-btn').onclick = () => b.classList.remove('show');
    document.getElementById('edit-cancel-btn').onclick = () => b.classList.remove('show');
    b.onclick = e => { if (e.target === b) b.classList.remove('show'); };

    document.getElementById('edit-form').onsubmit = async (ev) => {
      ev.preventDefault();
      await submitEdit();
    };
  }

  async function submitEdit() {
    const id = document.getElementById('e-id').value;
    const nome = document.getElementById('e-nome').value.trim();
    if (!nome) {
      alert('Nome é obrigatório.');
      document.getElementById('e-nome').focus();
      return;
    }

    const payload = {
      funcionariosId: parseInt(id, 10),
      nome: nome.toUpperCase(),
      deletado: false
    };

    const resp = await fetch(`/api/funcionarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      els.editBackdrop.classList.remove('show');
      await loadData();
    } else {
      const txt = await resp.text();
      alert('Erro ao atualizar funcionário:\n' + txt);
    }
  }

  function onNew() {
    const b = els.newBackdrop;
    if (!b) return;
    document.getElementById('n-nome').value = '';
    b.classList.add('show');
    document.getElementById('new-close-btn').onclick = () => b.classList.remove('show');
    document.getElementById('new-cancel-btn').onclick = () => b.classList.remove('show');
    b.onclick = e => { if (e.target === b) b.classList.remove('show'); };

    document.getElementById('new-form').onsubmit = async (ev) => {
      ev.preventDefault();
      await submitNew();
    };
  }

  async function submitNew() {
    const nome = document.getElementById('n-nome').value.trim();
    if (!nome) {
      alert('Nome é obrigatório.');
      document.getElementById('n-nome').focus();
      return;
    }

    const payload = {
      nome: nome.toUpperCase(),
      deletado: false
    };

    const resp = await fetch('/api/funcionarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      els.newBackdrop.classList.remove('show');
      await loadData();
    } else {
      const txt = await resp.text();
      alert('Erro ao criar funcionário:\n' + txt);
    }
  }

  async function onDelete() {
    if (!state.selected) return;
    const ok = confirm(`Confirma excluir o funcionário "${state.selected.nome}"?`);
    if (!ok) return;

    const resp = await fetch(`/api/funcionarios/${state.selected.id}`, {
      method: 'DELETE'
    });

    if (resp.ok) {
      await loadData();
      setSelection(null);
      toggleActions(true);
    } else {
      const txt = await resp.text();
      alert('Erro ao excluir:\n' + txt);
    }
  }
})();
