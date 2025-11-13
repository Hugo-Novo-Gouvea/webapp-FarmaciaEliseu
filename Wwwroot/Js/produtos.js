// wwwroot/js/produtos.js
// Lista paginada (servidor) + detalhe sob demanda (GET /api/produtos/{id})

(() => {
  // -------------------------
  // Elementos
  // -------------------------
  const els = {
    tbody: document.querySelector('#tb-produtos tbody'),
    pagerInfo: document.getElementById('produtos-pg-info'),
    pagerPrev: document.getElementById('produtos-pg-prev'),
    pagerNext: document.getElementById('produtos-pg-next'),
    filterColumn: document.getElementById('filter-column'),
    filterText: document.getElementById('filter-text'),

    btnView: document.getElementById('btn-view'),
    btnEdit: document.getElementById('btn-edit'),
    btnNew: document.getElementById('btn-new'),
    btnDelete: document.getElementById('btn-delete'),

    // modal visualizar
    viewBackdrop: document.getElementById('produto-modal-backdrop'),
    modalCloseBtn: document.getElementById('modal-close-btn'),

    // visualizar fields
    m: {
      codigoBarras: document.getElementById('m-codigoBarras'),
      codigoProduto: document.getElementById('m-codigoProduto'),
      descricao: document.getElementById('m-descricao'),
      unidadeMedida: document.getElementById('m-unidadeMedida'),
      precoCompra: document.getElementById('m-precoCompra'),
      precoVenda: document.getElementById('m-precoVenda'),
      localizacao: document.getElementById('m-localizacao'),
      laboratorio: document.getElementById('m-laboratorio'),
      principio: document.getElementById('m-principio'),
      generico: document.getElementById('m-generico'),
      dataCadastro: document.getElementById('m-dataCadastro'),
      dataUltimoRegistro: document.getElementById('m-dataUltimoRegistro'),
    },

    // modal editar
    editBackdrop: document.getElementById('produto-edit-backdrop'),
    editCloseBtn: document.getElementById('edit-close-btn'),
    editCancelBtn: document.getElementById('edit-cancel-btn'),
    editForm: document.getElementById('edit-form'),

    e: {
      id: document.getElementById('e-id'),
      codigoBarras: document.getElementById('e-codigoBarras'),
      descricao: document.getElementById('e-descricao'),
      unidadeMedida: document.getElementById('e-unidadeMedida'),
      precoCompra: document.getElementById('e-precoCompra'),
      precoVenda: document.getElementById('e-precoVenda'),
      localizacao: document.getElementById('e-localizacao'),
      laboratorio: document.getElementById('e-laboratorio'),
      principio: document.getElementById('e-principio'),
      generico: document.getElementById('e-generico'),
      codigoProduto: document.getElementById('e-codigoProduto'),
    },

    // modal novo
    newBackdrop: document.getElementById('produto-new-backdrop'),
    newCloseBtn: document.getElementById('new-close-btn'),
    newCancelBtn: document.getElementById('new-cancel-btn'),
    newForm: document.getElementById('new-form'),

    n: {
      codigoBarras: document.getElementById('n-codigoBarras'),
      descricao: document.getElementById('n-descricao'),
      unidadeMedida: document.getElementById('n-unidadeMedida'),
      precoCompra: document.getElementById('n-precoCompra'),
      precoVenda: document.getElementById('n-precoVenda'),
      localizacao: document.getElementById('n-localizacao'),
      laboratorio: document.getElementById('n-laboratorio'),
      principio: document.getElementById('n-principio'),
      generico: document.getElementById('n-generico'),
      codigoProduto: document.getElementById('n-codigoProduto'),
    }
  };

  // -------------------------
  // Estado
  // -------------------------
  const state = {
    page: 1,
    pageSize: 50,
    total: 0,
    column: (els.filterColumn && els.filterColumn.value) || 'descricao',
    search: '',
    selectedId: null
  };

  // -------------------------
  // Utils
  // -------------------------
  function fmtMoney(v) {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function fetchJSON(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(await r.text());
    try { return await r.json(); } catch { return {}; }
  }

  function selectNone() {
    state.selectedId = null;
    document.querySelectorAll('#tb-produtos tbody tr').forEach(tr => tr.classList.remove('selected'));
    setActionsDisabled(true);
  }

  function setActionsDisabled(disabled) {
    [els.btnView, els.btnEdit, els.btnDelete].forEach(b => { if (b) b.disabled = disabled; });
  }

  function openModal(el) { if (el) el.classList.add('show'); }
  function closeModal(el) { if (el) el.classList.remove('show'); }

  // -------------------------
  // Carregar página
  // -------------------------
  async function loadPage() {
    selectNone();

    const params = new URLSearchParams({
      page: String(state.page),
      pageSize: String(state.pageSize),
      column: state.column || 'descricao'
    });
    if (state.search && state.search.trim()) params.set('search', state.search.trim());

    let data;
    try {
      data = await fetchJSON(`/api/produtos?${params.toString()}`);
    } catch (e) {
      console.error(e);
      if (els.tbody) els.tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Erro ao carregar.</td></tr>`;
      if (els.pagerInfo) els.pagerInfo.textContent = 'Mostrando 0-0 de 0';
      els.pagerPrev?.classList.add('is-disabled');
      els.pagerNext?.classList.add('is-disabled');
      return;
    }

    const items = Array.isArray(data.items) ? data.items : [];
    state.total = Number(data.total || 0);

    // Render
    if (!items.length) {
      els.tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum produto encontrado.</td></tr>`;
    } else {
      els.tbody.innerHTML = items.map(p => {
        const id = p.produtosId ?? p.ProdutosId ?? p.id ?? '';
        const codigo = p.codigoBarras ?? p.CodigoBarras ?? '';
        const desc = p.descricao ?? p.Descricao ?? '';
        const pc = p.precoCompra ?? p.PrecoCompra ?? null;
        const pv = p.precoVenda ?? p.PrecoVenda ?? null;
        const gen = p.generico ?? p.Generico ?? '';
        return `
          <tr data-id="${id}">
            <td>${codigo}</td>
            <td>${desc}</td>
            <td>${fmtMoney(pc)}</td>
            <td>${fmtMoney(pv)}</td>
            <td>${gen}</td>
          </tr>
        `;
      }).join('');
    }

    // seleção
    els.tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        document.querySelectorAll('#tb-produtos tbody tr').forEach(x => x.classList.remove('selected'));
        tr.classList.add('selected');
        state.selectedId = parseInt(tr.getAttribute('data-id') || '0', 10) || null;
        setActionsDisabled(!(state.selectedId > 0));
      });
      tr.addEventListener('dblclick', () => {
        const id = parseInt(tr.getAttribute('data-id') || '0', 10);
        if (id) handleView(id);
      });
    });

    // paginação
    const start = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    const end = Math.min(state.page * state.pageSize, state.total);
    if (els.pagerInfo) els.pagerInfo.textContent = `Mostrando ${start}-${end} de ${state.total}`;
    if (state.page <= 1) els.pagerPrev?.classList.add('is-disabled'); else els.pagerPrev?.classList.remove('is-disabled');
    if (end >= state.total) els.pagerNext?.classList.add('is-disabled'); else els.pagerNext?.classList.remove('is-disabled');
  }

  // -------------------------
  // Eventos
  // -------------------------
  els.pagerPrev?.addEventListener('click', () => {
    if (state.page > 1) { state.page--; loadPage(); }
  });
  els.pagerNext?.addEventListener('click', () => {
    const max = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page < max) { state.page++; loadPage(); }
  });

  if (els.filterColumn) {
    els.filterColumn.addEventListener('change', () => {
      state.column = els.filterColumn.value || 'descricao';
      state.page = 1;
      loadPage();
    });
  }
  if (els.filterText) {
    let t;
    els.filterText.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.search = els.filterText.value || '';
        state.page = 1;
        loadPage();
      }, 250);
    });
    els.filterText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.search = els.filterText.value || '';
        state.page = 1;
        loadPage();
      }
    });
  }

  els.btnView?.addEventListener('click', () => { if (state.selectedId) handleView(state.selectedId); });
  els.btnEdit?.addEventListener('click', () => { if (state.selectedId) handleEdit(state.selectedId); });
  els.btnDelete?.addEventListener('click', () => { if (state.selectedId) handleDelete(state.selectedId); });
  els.btnNew?.addEventListener('click', onNew);

  // -------------------------
  // Detalhe (view/edit)
  // -------------------------
  async function fetchDetail(id) {
    return await fetchJSON(`/api/produtos/${id}`);
  }

  function fillView(p) {
    const M = els.m;
    M.codigoBarras.textContent = p.codigoBarras ?? '';
    M.codigoProduto.textContent = p.codigoProduto ?? '';
    M.descricao.textContent = p.descricao ?? '';
    M.unidadeMedida.textContent = p.unidadeMedida ?? '';
    M.precoCompra.textContent = fmtMoney(p.precoCompra);
    M.precoVenda.textContent = fmtMoney(p.precoVenda);
    M.localizacao.textContent = p.localizacao ?? '';
    M.laboratorio.textContent = p.laboratorio ?? '';
    M.principio.textContent = p.principio ?? '';
    M.generico.textContent = p.generico ?? '';
    M.dataCadastro.textContent = (p.dataCadastro ?? '').toString().replace('T',' ');
    M.dataUltimoRegistro.textContent = (p.dataUltimoRegistro ?? '').toString().replace('T',' ');
  }

  function fillEdit(p) {
    const E = els.e;
    E.id.value = p.produtosId ?? p.ProdutosId ?? '';
    E.codigoBarras.value = p.codigoBarras ?? '';
    E.descricao.value = p.descricao ?? '';
    E.unidadeMedida.value = p.unidadeMedida ?? '';
    E.precoCompra.value = p.precoCompra ?? '';
    E.precoVenda.value = p.precoVenda ?? '';
    E.localizacao.value = p.localizacao ?? '';
    E.laboratorio.value = p.laboratorio ?? '';
    E.principio.value = p.principio ?? '';
    E.generico.value = (p.generico === 'SIM' || p.generico === 'NAO') ? p.generico : '';
    E.codigoProduto.value = p.codigoProduto ?? '';
  }

  async function handleView(id) {
    try {
      const p = await fetchDetail(id);
      fillView(p);
      openModal(els.viewBackdrop);
    } catch (e) {
      alert('Falha ao carregar produto.');
      console.error(e);
    }
  }

  async function handleEdit(id) {
    try {
      const p = await fetchDetail(id);
      fillEdit(p);
      openModal(els.editBackdrop);
    } catch (e) {
      alert('Falha ao carregar produto para edição.');
      console.error(e);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este produto?')) return;
    try {
      const r = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      await loadPage();
    } catch (e) {
      alert('Falha ao excluir.');
      console.error(e);
    }
  }

  // fechar modais
  els.modalCloseBtn?.addEventListener('click', () => closeModal(els.viewBackdrop));
  els.viewBackdrop?.addEventListener('click', (e) => { if (e.target === els.viewBackdrop) closeModal(els.viewBackdrop); });
  els.editCloseBtn?.addEventListener('click', () => closeModal(els.editBackdrop));
  els.editCancelBtn?.addEventListener('click', () => closeModal(els.editBackdrop));
  els.editBackdrop?.addEventListener('click', (e) => { if (e.target === els.editBackdrop) closeModal(els.editBackdrop); });

  // submit editar
  els.editForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = parseInt(els.e.id.value || '0', 10);
    if (!id) return;

    const payload = {
      CodigoBarras: els.e.codigoBarras.value,
      Descricao: els.e.descricao.value,
      UnidadeMedida: els.e.unidadeMedida.value,
      PrecoCompra: parseFloat(els.e.precoCompra.value || '0'),
      PrecoVenda: parseFloat(els.e.precoVenda.value || '0'),
      Localizacao: els.e.localizacao.value,
      Laboratorio: els.e.laboratorio.value,
      Principio: els.e.principio.value,
      Generico: els.e.generico.value,
      CodigoProduto: els.e.codigoProduto.value
    };

    try {
      const r = await fetch(`/api/produtos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(await r.text());
      closeModal(els.editBackdrop);
      await loadPage();
    } catch (e) {
      alert('Falha ao salvar alterações.');
      console.error(e);
    }
  });

  // novo
  function onNew() {
    // limpa campos
    Object.values(els.n).forEach(input => { if (input) input.value = ''; });
    openModal(els.newBackdrop);
  }
  els.newCloseBtn?.addEventListener('click', () => closeModal(els.newBackdrop));
  els.newCancelBtn?.addEventListener('click', () => closeModal(els.newBackdrop));
  els.newBackdrop?.addEventListener('click', (e) => { if (e.target === els.newBackdrop) closeModal(els.newBackdrop); });

  els.newForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const payload = {
      CodigoBarras: els.n.codigoBarras.value,
      Descricao: els.n.descricao.value,
      UnidadeMedida: els.n.unidadeMedida.value,
      PrecoCompra: parseFloat(els.n.precoCompra.value || '0'),
      PrecoVenda: parseFloat(els.n.precoVenda.value || '0'),
      Localizacao: els.n.localizacao.value,
      Laboratorio: els.n.laboratorio.value,
      Principio: els.n.principio.value,
      Generico: els.n.generico.value,
      CodigoProduto: els.n.codigoProduto.value
    };
    try {
      const r = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(await r.text());
      closeModal(els.newBackdrop);
      state.page = 1;
      await loadPage();
    } catch (e) {
      alert('Falha ao criar produto.');
      console.error(e);
    }
  });

  // init
  setActionsDisabled(true);
  loadPage();
})();
