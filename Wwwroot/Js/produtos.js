// wwwroot/js/produtos.js
// Tela de produtos usando o motor genérico CrudList.

(() => {
  if (!window.CrudList) {
    console.error('CrudList não encontrado. Certifique-se de carregar /js/crudList.js antes de /js/produtos.js');
    return;
  }

  // -------------------------
  // ELEMENTOS DOS MODAIS
  // -------------------------
  const els = {
    // modal visualizar
    viewBackdrop: document.getElementById('produto-modal-backdrop'),
    viewCloseBtn: document.getElementById('modal-close-btn'),
    viewOkBtn: document.getElementById('modal-ok-btn'), // pode ser null, ok

    // ATENÇÃO: ids batendo com o HTML (prefixo m-)
    v: {
      codigoBarras:     document.getElementById('m-codigoBarras'),
      codigoProduto:    document.getElementById('m-codigoProduto'),
      descricao:        document.getElementById('m-descricao'),
      unidadeMedida:    document.getElementById('m-unidadeMedida'),
      precoCompra:      document.getElementById('m-precoCompra'),
      precoVenda:       document.getElementById('m-precoVenda'),
      localizacao:      document.getElementById('m-localizacao'),
      laboratorio:      document.getElementById('m-laboratorio'),
      principio:        document.getElementById('m-principio'),
      generico:         document.getElementById('m-generico'),
      dataCadastro:     document.getElementById('m-dataCadastro'),
      dataUltimoRegistro: document.getElementById('m-dataUltimoRegistro'),
    },

    // modal editar
    editBackdrop: document.getElementById('produto-edit-backdrop'),
    editCloseBtn: document.getElementById('edit-close-btn'),
    editCancelBtn: document.getElementById('edit-cancel-btn'),
    editForm: document.getElementById('edit-form'),

    e: {
      id:            document.getElementById('e-id'),
      codigoBarras:  document.getElementById('e-codigoBarras'),
      descricao:     document.getElementById('e-descricao'),
      unidadeMedida: document.getElementById('e-unidadeMedida'),
      precoCompra:   document.getElementById('e-precoCompra'),
      precoVenda:    document.getElementById('e-precoVenda'),
      localizacao:   document.getElementById('e-localizacao'),
      laboratorio:   document.getElementById('e-laboratorio'),
      principio:     document.getElementById('e-principio'),
      generico:      document.getElementById('e-generico'),
      codigoProduto: document.getElementById('e-codigoProduto'),
    },

    // modal novo
    newBackdrop: document.getElementById('produto-new-backdrop'),
    newCloseBtn: document.getElementById('new-close-btn'),
    newCancelBtn: document.getElementById('new-cancel-btn'),
    newForm: document.getElementById('new-form'),

    n: {
      codigoBarras:  document.getElementById('n-codigoBarras'),
      descricao:     document.getElementById('n-descricao'),
      unidadeMedida: document.getElementById('n-unidadeMedida'),
      precoCompra:   document.getElementById('n-precoCompra'),
      precoVenda:    document.getElementById('n-precoVenda'),
      localizacao:   document.getElementById('n-localizacao'),
      laboratorio:   document.getElementById('n-laboratorio'),
      principio:     document.getElementById('n-principio'),
      generico:      document.getElementById('n-generico'),
      codigoProduto: document.getElementById('n-codigoProduto'),
    },
  };

  // -------------------------
  // HELPERS
  // -------------------------
  function fmtMoney(v) {
    if (v == null || v === '') return '';
    const n = Number(v);
    if (Number.isNaN(n)) return '';
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  }

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

  // Preenche o modal de detalhes com base no Produto completo retornado do backend
  function fillViewModal(p) {
    if (!p) return;
    const v = els.v;

    if (v.codigoBarras)      v.codigoBarras.textContent      = p.codigoBarras ?? p.CodigoBarras ?? '';
    if (v.codigoProduto)     v.codigoProduto.textContent     = p.codigoProduto ?? p.CodigoProduto ?? '';
    if (v.descricao)         v.descricao.textContent         = p.descricao ?? p.Descricao ?? '';
    if (v.unidadeMedida)     v.unidadeMedida.textContent     = p.unidadeMedida ?? p.UnidadeMedida ?? '';
    if (v.precoCompra)       v.precoCompra.textContent       = fmtMoney(p.precoCompra ?? p.PrecoCompra);
    if (v.precoVenda)        v.precoVenda.textContent        = fmtMoney(p.precoVenda ?? p.PrecoVenda);
    if (v.localizacao)       v.localizacao.textContent       = p.localizacao ?? p.Localizacao ?? '';
    if (v.laboratorio)       v.laboratorio.textContent       = p.laboratorio ?? p.Laboratorio ?? '';
    if (v.principio)         v.principio.textContent         = p.principio ?? p.Principio ?? '';
    if (v.generico)          v.generico.textContent          = p.generico ?? p.Generico ?? '';
    if (v.dataCadastro)      v.dataCadastro.textContent      = fmtDate(p.dataCadastro ?? p.DataCadastro);
    if (v.dataUltimoRegistro) v.dataUltimoRegistro.textContent = fmtDate(p.dataUltimoRegistro ?? p.DataUltimoRegistro);
  }

  function fillEditModal(p) {
    if (!p) return;
    const e = els.e;
    e.id.value            = p.produtosId ?? p.ProdutosId ?? '';
    e.codigoBarras.value  = p.codigoBarras ?? p.CodigoBarras ?? '';
    e.descricao.value     = p.descricao ?? p.Descricao ?? '';
    e.unidadeMedida.value = p.unidadeMedida ?? p.UnidadeMedida ?? '';
    e.precoCompra.value   = (p.precoCompra ?? p.PrecoCompra ?? '').toString().replace('.', ',');
    e.precoVenda.value    = (p.precoVenda ?? p.PrecoVenda ?? '').toString().replace('.', ',');
    e.localizacao.value   = p.localizacao ?? p.Localizacao ?? '';
    e.laboratorio.value   = p.laboratorio ?? p.Laboratorio ?? '';
    e.principio.value     = p.principio ?? p.Principio ?? '';
    e.generico.value      = p.generico ?? p.Generico ?? '';
    e.codigoProduto.value = p.codigoProduto ?? p.CodigoProduto ?? '';
  }

  function clearNewForm() {
    const n = els.n;
    Object.keys(n).forEach(k => {
      if (n[k]) n[k].value = '';
    });
  }

  function buildEditPayload() {
    const e = els.e;
    return {
      produtosId:   parseInt(e.id.value || '0', 10),
      codigoBarras: e.codigoBarras.value.trim(),
      descricao:    e.descricao.value.trim(),
      unidadeMedida: e.unidadeMedida.value.trim(),
      precoCompra:  parseFloat((e.precoCompra.value || '0').replace(',', '.')),
      precoVenda:   parseFloat((e.precoVenda.value || '0').replace(',', '.')),
      localizacao:  e.localizacao.value.trim(),
      laboratorio:  e.laboratorio.value.trim(),
      principio:    e.principio.value.trim(),
      generico:     e.generico.value.trim(),
      codigoProduto: e.codigoProduto.value.trim(),
    };
  }

  function buildNewPayload() {
    const n = els.n;
    return {
      codigoBarras:  n.codigoBarras.value.trim(),
      descricao:     n.descricao.value.trim(),
      unidadeMedida: n.unidadeMedida.value.trim(),
      precoCompra:   parseFloat((n.precoCompra.value || '0').replace(',', '.')),
      precoVenda:    parseFloat((n.precoVenda.value || '0').replace(',', '.')),
      localizacao:   n.localizacao.value.trim(),
      laboratorio:   n.laboratorio.value.trim(),
      principio:     n.principio.value.trim(),
      generico:      n.generico.value.trim(),
      codigoProduto: n.codigoProduto.value.trim(),
    };
  }

  // -------------------------
  // INSTÂNCIA DO CrudList
  // -------------------------
  let list; // vamos atribuir depois pra conseguir usar dentro das callbacks

  const cfg = {
    endpoint: '/api/produtos',
    tableBodySelector: '#tb-produtos tbody',
    pagerInfoSelector: '#produtos-pg-info',
    pagerPrevSelector: '#produtos-pg-prev',
    pagerNextSelector: '#produtos-pg-next',
    filterColumnSelector: '#filter-column',
    filterTextSelector: '#filter-text',
    btnViewSelector: '#btn-view',
    btnEditSelector: '#btn-edit',
    btnNewSelector: '#btn-new',
    btnDeleteSelector: '#btn-delete',

    // ANTES:
    // defaultColumn: 'descricao',

    // DEPOIS (pra bater com o <option selected> do HTML):
    defaultColumn: 'codigoBarras',

    pageSize: 20,
    columnsCount: 5,

    mapRow: (p) => {
      const id     = p.produtosId ?? p.ProdutosId ?? p.id ?? 0;
      const codigo = p.codigoBarras ?? p.CodigoBarras ?? '';
      const desc   = p.descricao ?? p.Descricao ?? '';
      const pc     = fmtMoney(p.precoCompra ?? p.PrecoCompra);
      const pv     = fmtMoney(p.precoVenda ?? p.PrecoVenda);
      const gen    = p.generico ?? p.Generico ?? '';

      return {
        id,
        cells: [codigo, desc, pc, pv, gen],
      };
    },

    async onView(id) {
      try {
        const p = await fetchJson(`/api/produtos/${id}`);
        fillViewModal(p);
        openModal(els.viewBackdrop);
      } catch (err) {
        console.error(err);
        alert('Falha ao carregar detalhes do produto.');
      }
    },

    async onEdit(id) {
      try {
        const p = await fetchJson(`/api/produtos/${id}`);
        fillEditModal(p);
        openModal(els.editBackdrop);
      } catch (err) {
        console.error(err);
        alert('Falha ao carregar produto para edição.');
      }
    },

    async onDelete(id) {
      if (!confirm('Deseja realmente excluir este produto?')) return;
      try {
        const resp = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || 'Erro ao excluir produto.');
        }
        // depois de excluir, recarrega a lista
        await list.loadPage();
      } catch (err) {
        console.error(err);
        alert('Falha ao excluir produto.');
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
  els.viewOkBtn?.addEventListener('click', () => closeModal(els.viewBackdrop));
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
    const payload = buildEditPayload();
    if (!payload.produtosId || payload.produtosId <= 0) {
      alert('ID inválido para edição.');
      return;
    }

    try {
      const resp = await fetch(`/api/produtos/${payload.produtosId}`, {
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

    try {
      const resp = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Erro ao criar produto.');
      }
      closeModal(els.newBackdrop);
      // opcional: volta pra página 1
      list.state.page = 1;
      await list.loadPage();
    } catch (err) {
      console.error(err);
      alert('Falha ao criar produto.');
    }
  });
})();
