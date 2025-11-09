// /js/produto.js
// CRUD de produtos com o mesmo esqueleto dos outros.
// Mantém formatação de moeda e validação específica de produto.

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
    tableBody: document.querySelector('#tb-produtos tbody'),
    filterColumn: document.getElementById('filter-column'),
    filterText: document.getElementById('filter-text'),
    btnView: document.getElementById('btn-view'),
    btnEdit: document.getElementById('btn-edit'),
    btnNew: document.getElementById('btn-new'),
    btnDelete: document.getElementById('btn-delete'),
    pagerInfo: document.getElementById('produtos-pg-info'),
    pagerPrev: document.getElementById('produtos-pg-prev'),
    pagerNext: document.getElementById('produtos-pg-next'),

    viewBackdrop: document.getElementById('produto-modal-backdrop'),
    editBackdrop: document.getElementById('produto-edit-backdrop'),
    newBackdrop: document.getElementById('produto-new-backdrop')
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
    // pede tudo e filtra no front
    const resp = await fetch('/api/produtos?pageSize=100000');
    if (!resp.ok) {
      renderEmpty('Erro ao carregar produtos');
      return;
    }

    const data = await resp.json();
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    state.all = items;
    applyFilter();

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

    // pequenas máscaras de dígitos para código de barras / unidade
    document.addEventListener('input', handleDigitFields);
  }

  // -------------------------------------------------------------
  // FILTER
  // -------------------------------------------------------------
  function applyFilter() {
    const col = els.filterColumn?.value || 'codigoBarras';
    let txt = (els.filterText?.value || '').trim().toLowerCase();

    if (col === 'codigoBarras') {
      // remove tudo que não é número pra comparar
      txt = txt.replace(/\D+/g, '');
    }

    if (!txt) {
      state.filtered = [...state.all];
    } else {
      state.filtered = state.all.filter(p => {
        const val = getColumnValue(p, col);
        return val.includes(txt);
      });
    }

    state.page = 1;
    renderTable();
    updatePager();
  }

  function getColumnValue(p, col) {
    const toStr = (v) => (v ?? '').toString().toLowerCase();
    switch (col) {
      case 'codigoBarras':
        return toStr(p.codigoBarras).replace(/\D+/g, '');
      case 'descricao':
      default:
        // tira sequências numéricas longas pra não atrapalhar
        return toStr(p.descricao).replace(/\d{7,}/g, '');
    }
  }

  // -------------------------------------------------------------
  // RENDER TABLE
  // -------------------------------------------------------------
  function renderTable() {
    if (!els.tableBody) return;
    els.tableBody.innerHTML = '';

    if (!state.filtered.length) {
      renderEmpty('Nenhum produto encontrado.');
      setSelection(null);
      toggleActions(true);
      return;
    }

    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.filtered.slice(start, end);

    pageItems.forEach(p => {
      const data = normalizeProduto(p);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${data.codigoBarras}</td>
        <td>${data.descricao}</td>
        <td>${formatMoedaBR(data.precoCompra)}</td>
        <td>${formatMoedaBR(data.precoVenda)}</td>
        <td>${data.generico}</td>
      `;
      tr.addEventListener('click', () => onRowClick(tr, data));
      els.tableBody.appendChild(tr);
    });

    setSelection(null);
    toggleActions(true);
  }

  function renderEmpty(msg) {
    if (!els.tableBody) return;
    els.tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${msg}</td></tr>`;
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
    document.querySelectorAll('#tb-produtos tbody tr').forEach(row => row.classList.remove('selected'));
    tr.classList.add('selected');
    setSelection(data);
    toggleActions(false);
  }

  function setSelection(prod) {
    state.selected = prod;
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
    const p = state.selected;
    const b = els.viewBackdrop;
    if (!b) return;

    setText('m-codigoBarras', p.codigoBarras);
    setText('m-codigoProduto', p.codigoProduto);
    setText('m-descricao', p.descricao);
    setText('m-unidadeMedida', p.unidadeMedida);
    setText('m-precoCompra', formatMoedaBR(p.precoCompra));
    setText('m-precoVenda', formatMoedaBR(p.precoVenda));
    setText('m-localizacao', p.localizacao);
    setText('m-laboratorio', p.laboratorio);
    setText('m-principio', p.principio);
    setText('m-generico', p.generico);
    setText('m-dataCadastro', p.dataCadastroIso ? formatarDataHoraBR(p.dataCadastroIso) : '');
    setText('m-dataUltimoRegistro', p.dataUltimoRegistroIso ? formatarDataHoraBR(p.dataUltimoRegistroIso) : '');

    b.classList.add('show');
    document.getElementById('modal-close-btn').onclick = () => b.classList.remove('show');
    b.onclick = e => { if (e.target === b) b.classList.remove('show'); };
  }

  function onEdit() {
    if (!state.selected) return;
    const p = state.selected;
    const b = els.editBackdrop;
    if (!b) return;

    setVal('e-id', p.id);
    setVal('e-codigoBarras', p.codigoBarras);
    setVal('e-descricao', p.descricao);
    setVal('e-unidadeMedida', p.unidadeMedida);
    setVal('e-precoCompra', p.precoCompra);
    setVal('e-precoVenda', p.precoVenda);
    setVal('e-localizacao', p.localizacao);
    setVal('e-laboratorio', p.laboratorio);
    setVal('e-principio', p.principio);
    setVal('e-generico', p.generico);
    setVal('e-codigoProduto', p.codigoProduto);

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
    const valid = validateProduto('e-');
    if (!valid.ok) {
      alert(valid.msg);
      valid.el?.focus();
      return;
    }

    const id = getVal('e-id');
    const payload = buildProdutoPayload('e-');
    payload.produtosId = parseInt(id, 10);

    const resp = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      els.editBackdrop.classList.remove('show');
      await loadData();
    } else {
      const txt = await resp.text();
      alert('Erro ao atualizar produto:\n' + txt);
    }
  }

  function onNew() {
    const b = els.newBackdrop;
    if (!b) return;

    // limpa
    ['n-codigoBarras','n-descricao','n-unidadeMedida','n-precoCompra','n-precoVenda','n-localizacao','n-laboratorio','n-principio','n-generico','n-codigoProduto']
      .forEach(id => setVal(id, ''));

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
    const valid = validateProduto('n-');
    if (!valid.ok) {
      alert(valid.msg);
      valid.el?.focus();
      return;
    }

    const payload = buildProdutoPayload('n-');

    const resp = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      els.newBackdrop.classList.remove('show');
      state.page = 1;
      await loadData();
    } else {
      const txt = await resp.text();
      alert('Erro ao criar produto:\n' + txt);
    }
  }

  async function onDelete() {
    if (!state.selected) return;
    const ok = confirm(`Confirma excluir o produto "${state.selected.descricao}"?`);
    if (!ok) return;

    const resp = await fetch(`/api/produtos/${state.selected.id}`, {
      method: 'DELETE'
    });

    if (resp.ok) {
      await loadData();
    } else {
      alert('Erro ao excluir produto');
    }
  }

  // -------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------
  function normalizeProduto(p) {
    return {
      id: p.produtosId ?? p.produtosID ?? p.id ?? '',
      descricao: p.descricao ?? '',
      unidadeMedida: p.unidadeMedida ?? '',
      precoCompra: p.precoCompra ?? 0,
      precoVenda: p.precoVenda ?? 0,
      localizacao: p.localizacao ?? '',
      laboratorio: p.laboratorio ?? '',
      principio: p.principio ?? '',
      generico: p.generico ?? '',
      codigoProduto: p.codigoProduto ?? '',
      codigoBarras: p.codigoBarras ?? '',
      dataCadastroIso: p.dataCadastro || p.DataCadastro || '',
      dataUltimoRegistroIso: p.dataUltimoRegistro || p.DataUltimoRegistro || '',
      deletadoBool: !!p.deletado
    };
  }

  function formatMoedaBR(valor) {
    const n = Number(valor ?? 0);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatarDataHoraBR(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? '';
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  }

  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function validateProduto(prefix) {
    const elCodigoBarras = document.getElementById(prefix + 'codigoBarras');
    const elDescricao = document.getElementById(prefix + 'descricao');
    const elPrecoCompra = document.getElementById(prefix + 'precoCompra');
    const elPrecoVenda = document.getElementById(prefix + 'precoVenda');
    const elGenerico = document.getElementById(prefix + 'generico');

    if (!elCodigoBarras.value.trim()) {
      return { ok: false, msg: 'Código de barras é obrigatório.', el: elCodigoBarras };
    }
    if (!elDescricao.value.trim()) {
      return { ok: false, msg: 'Descrição é obrigatória.', el: elDescricao };
    }
    if (!elPrecoCompra.value.trim()) {
      return { ok: false, msg: 'Preço de compra é obrigatório.', el: elPrecoCompra };
    }
    if (!elPrecoVenda.value.trim()) {
      return { ok: false, msg: 'Preço de venda é obrigatório.', el: elPrecoVenda };
    }
    if (!(elGenerico.value === 'SIM' || elGenerico.value === 'NAO')) {
      return { ok: false, msg: 'Selecione "SIM" ou "NAO" no campo genérico.', el: elGenerico };
    }

    return { ok: true };
  }

  function buildProdutoPayload(prefix) {
    const onlyDigits = (v) => (v || '').toString().replace(/\D+/g, '');
    const rawCodigoBarras = getVal(prefix + 'codigoBarras').trim();
    const rawUnidadeMedida = getVal(prefix + 'unidadeMedida').trim();
    const rawLocalizacao = getVal(prefix + 'localizacao').trim();
    const rawLaboratorio = getVal(prefix + 'laboratorio').trim();
    const rawPrincipio = getVal(prefix + 'principio').trim();
    const rawCodigoProduto = getVal(prefix + 'codigoProduto').trim();
    const selGenerico = getVal(prefix + 'generico');

    return {
      codigoBarras: onlyDigits(rawCodigoBarras),
      descricao: getVal(prefix + 'descricao').trim().toUpperCase(),
      unidadeMedida: onlyDigits(rawUnidadeMedida) || '0',
      precoCompra: parseFloat(getVal(prefix + 'precoCompra')),
      precoVenda: parseFloat(getVal(prefix + 'precoVenda')),
      localizacao: rawLocalizacao ? rawLocalizacao.toUpperCase() : 'NAO INFORMADO',
      laboratorio: rawLaboratorio ? rawLaboratorio.toUpperCase() : 'NAO INFORMADO',
      principio: rawPrincipio ? rawPrincipio.toUpperCase() : 'NAO INFORMADO',
      generico: selGenerico,
      codigoProduto: rawCodigoProduto || '000000000',
      deletado: false
    };
  }

  // força só número para alguns campos
  function handleDigitFields(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (
      t.id === 'n-codigoBarras' ||
      t.id === 'e-codigoBarras' ||
      t.id === 'n-unidadeMedida' ||
      t.id === 'e-unidadeMedida'
    ) {
      const pos = t.selectionStart;
      t.value = (t.value || '').replace(/\D+/g, '');
      try { t.setSelectionRange(pos, pos); } catch {}
    }
  }
})();
