// wwwroot/js/funcionarios.js
// Tela de funcionários usando o motor genérico CrudList.

(() => {
  if (!window.CrudList) {
    console.error('CrudList não encontrado. Certifique-se de carregar /js/crudList.js antes de /js/funcionarios.js');
    return;
  }

  // -------------------------
  // ELEMENTOS DOS MODAIS
  // -------------------------
  const els = {
    // modal visualizar
    viewBackdrop: document.getElementById('funcionario-modal-backdrop'),
    viewCloseBtn: document.getElementById('modal-close-btn'),

    v: {
      nome: document.getElementById('m-nome'),
    },

    // modal editar
    editBackdrop: document.getElementById('funcionario-edit-backdrop'),
    editCloseBtn: document.getElementById('edit-close-btn'),
    editCancelBtn: document.getElementById('edit-cancel-btn'),
    editForm: document.getElementById('edit-form'),

    e: {
      id:   document.getElementById('e-id'),
      nome: document.getElementById('e-nome'),
    },

    // modal novo
    newBackdrop: document.getElementById('funcionario-new-backdrop'),
    newCloseBtn: document.getElementById('new-close-btn'),
    newCancelBtn: document.getElementById('new-cancel-btn'),
    newForm: document.getElementById('new-form'),

    n: {
      nome: document.getElementById('n-nome'),
    },
  };

  // -------------------------
  // HELPERS
  // -------------------------
  async function fetchJson(url, options) {
    const resp = await fetch(url, options);
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || `Erro HTTP ${resp.status}`);
    }
    return await resp.json();
  }

  function openModal(el) {
    if (el) el.classList.add('show');
  }

  function closeModal(el) {
    if (el) el.classList.remove('show');
  }

  function fillViewModal(f) {
    if (!f) return;
    const nome = f.nome ?? f.Nome ?? '';
    if (els.v.nome) els.v.nome.textContent = nome;
  }

  function fillEditModal(f) {
    if (!f) return;
    const id   = f.funcionariosId ?? f.FuncionariosId ?? f.id ?? null;
    const nome = f.nome ?? f.Nome ?? '';

    if (els.e.id)   els.e.id.value = id ?? '';
    if (els.e.nome) els.e.nome.value = nome;
  }

  function clearNewForm() {
    if (els.n.nome) els.n.nome.value = '';
  }

  function buildEditPayload() {
    const nome = (els.e.nome?.value ?? '').trim();
    return {
      Nome: nome.toUpperCase(),
    };
  }

  function buildNewPayload() {
    const nome = (els.n.nome?.value ?? '').trim();
    return {
      Nome: nome.toUpperCase(),
    };
  }

  // -------------------------
  // INSTÂNCIA DO CrudList
  // -------------------------
  let list;

  const cfg = {
    endpoint: '/api/funcionarios',
    tableBodySelector: '#tb-funcionarios tbody',
    pagerInfoSelector: '#funcionarios-pg-info',
    pagerPrevSelector: '#funcionarios-pg-prev',
    pagerNextSelector: '#funcionarios-pg-next',
    filterColumnSelector: '#filter-column',
    filterTextSelector: '#filter-text',
    btnViewSelector: '#btn-view',
    btnEditSelector: '#btn-edit',
    btnNewSelector: '#btn-new',
    btnDeleteSelector: '#btn-delete',

    defaultColumn: 'nome',
    pageSize: 50,
    columnsCount: 1, // só a coluna Nome

    mapRow: (f) => {
      const id   = f.funcionariosId ?? f.FuncionariosId ?? f.id ?? 0;
      const nome = f.nome ?? f.Nome ?? '';
      return {
        id,
        cells: [nome],
      };
    },

    async onView(id) {
      try {
        const f = await fetchJson(`/api/funcionarios/${id}`);
        fillViewModal(f);
        openModal(els.viewBackdrop);
      } catch (err) {
        console.error(err);
        alert('Falha ao carregar detalhes do funcionário.');
      }
    },

    async onEdit(id) {
      try {
        const f = await fetchJson(`/api/funcionarios/${id}`);
        fillEditModal(f);
        openModal(els.editBackdrop);
      } catch (err) {
        console.error(err);
        alert('Falha ao carregar funcionário para edição.');
      }
    },

    async onDelete(id) {
      if (!confirm('Deseja realmente excluir este funcionário?')) return;
      try {
        const resp = await fetch(`/api/funcionarios/${id}`, { method: 'DELETE' });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || 'Erro ao excluir funcionário.');
        }
        await list.loadPage();
      } catch (err) {
        console.error(err);
        alert('Falha ao excluir funcionário.');
      }
    },

    onNew() {
      clearNewForm();
      openModal(els.newBackdrop);
    },
  };

  list = new CrudList(cfg);

  // -------------------------
  // EVENTOS DOS MODAIS
  // -------------------------

  // modal visualizar
  els.viewCloseBtn?.addEventListener('click', () => closeModal(els.viewBackdrop));
  els.viewBackdrop?.addEventListener('click', ev => {
    if (ev.target === els.viewBackdrop) closeModal(els.viewBackdrop);
  });

  // modal editar
  els.editCloseBtn?.addEventListener('click', () => closeModal(els.editBackdrop));
  els.editCancelBtn?.addEventListener('click', () => closeModal(els.editBackdrop));
  els.editBackdrop?.addEventListener('click', ev => {
    if (ev.target === els.editBackdrop) closeModal(els.editBackdrop);
  });

  els.editForm?.addEventListener('submit', async ev => {
    ev.preventDefault();

    const idRaw = els.e.id?.value ?? '';
    const id = parseInt(idRaw || '0', 10);
    if (!id) {
      alert('ID inválido para edição.');
      return;
    }

    const payload = buildEditPayload();
    if (!payload.Nome || !payload.Nome.trim()) {
      alert('Nome é obrigatório.');
      return;
    }

    try {
      const resp = await fetch(`/api/funcionarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Erro ao salvar alterações.');
      }
      closeModal(els.editBackdrop);
      await list.loadPage();
    } catch (err) {
      console.error(err);
      alert('Falha ao salvar alterações.');
    }
  });

  // modal novo
  els.newCloseBtn?.addEventListener('click', () => closeModal(els.newBackdrop));
  els.newCancelBtn?.addEventListener('click', () => closeModal(els.newBackdrop));
  els.newBackdrop?.addEventListener('click', ev => {
    if (ev.target === els.newBackdrop) closeModal(els.newBackdrop);
  });

  els.newForm?.addEventListener('submit', async ev => {
    ev.preventDefault();

    const payload = buildNewPayload();
    if (!payload.Nome || !payload.Nome.trim()) {
      alert('Nome é obrigatório.');
      return;
    }

    try {
      const resp = await fetch('/api/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Erro ao criar funcionário.');
      }
      closeModal(els.newBackdrop);
      list.state.page = 1;
      await list.loadPage();
    } catch (err) {
      console.error(err);
      alert('Falha ao criar funcionário.');
    }
  });
})();
