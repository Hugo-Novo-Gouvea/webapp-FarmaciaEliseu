// /js/clientes.js
// CRUD de clientes seguindo o mesmo padrão dos outros módulos.
// Mantém emojis, comentários e paginação no front.

(() => {
  // -------------------------------------------------------------
  // ESTADO CENTRAL
  // -------------------------------------------------------------
  const state = {
    all: [],           // todos os clientes recebidos da API
    filtered: [],      // clientes após filtro
    selected: null,    // linha selecionada
    page: 1,
    pageSize: 50
  };

  // -------------------------------------------------------------
  // ELEMENTOS
  // -------------------------------------------------------------
  const els = {
    tableBody: document.querySelector('#tb-clientes tbody'),
    filterColumn: document.getElementById('filter-column'),
    filterText: document.getElementById('filter-text'),
    btnView: document.getElementById('btn-view'),
    btnEdit: document.getElementById('btn-edit'),
    btnNew: document.getElementById('btn-new'),
    btnDelete: document.getElementById('btn-delete'),
    pagerInfo: document.getElementById('clientes-pg-info'),
    pagerPrev: document.getElementById('clientes-pg-prev'),
    pagerNext: document.getElementById('clientes-pg-next'),

    // modais
    viewBackdrop: document.getElementById('cliente-modal-backdrop'),
    editBackdrop: document.getElementById('cliente-edit-backdrop'),
    newBackdrop: document.getElementById('cliente-new-backdrop')
  };

  // -------------------------------------------------------------
  // INICIALIZAÇÃO
  // -------------------------------------------------------------
  init();

  async function init() {
    await loadData();
    wireEvents();
  }

  // -------------------------------------------------------------
  // CARREGAR DADOS DO BACK
  // -------------------------------------------------------------
  async function loadData() {
    // pede uma página bem grande e filtra no front
    const resp = await fetch('/api/clientes?pageSize=2500');
    if (!resp.ok) {
      renderEmpty('Erro ao carregar clientes.');
      return;
    }

    const data = await resp.json();
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    state.all = items;
    applyFilter();

    // liberar botão de novo
    if (els.btnNew) els.btnNew.disabled = false;
  }

  // -------------------------------------------------------------
  // LIGAR EVENTOS
  // -------------------------------------------------------------
  function wireEvents() {
    // filtro
    els.filterText?.addEventListener('input', applyFilter);
    els.filterColumn?.addEventListener('change', applyFilter);

    // paginação
    els.pagerPrev?.addEventListener('click', () => changePage(-1));
    els.pagerNext?.addEventListener('click', () => changePage(1));

    // ações
    els.btnView?.addEventListener('click', onView);
    els.btnEdit?.addEventListener('click', onEdit);
    els.btnDelete?.addEventListener('click', onDelete);
    els.btnNew?.addEventListener('click', onNew);

    // máscaras (clientes tem isso)
    document.addEventListener('input', handleMasks);
  }

  // -------------------------------------------------------------
  // FILTRO
  // -------------------------------------------------------------
  function applyFilter() {
    const col = els.filterColumn?.value || 'nome';
    const txt = (els.filterText?.value || '').trim().toLowerCase();

    if (!txt) {
      state.filtered = [...state.all];
    } else {
      state.filtered = state.all.filter(c => {
        const val = getColumnValue(c, col);
        return val.toLowerCase().includes(txt);
      });
    }

    state.page = 1;
    renderTable();
    updatePager();
  }

  function getColumnValue(c, col) {
    switch (col) {
      case 'endereco': return c.endereco || '';
      case 'codigoFichario': return (c.codigoFichario ?? '').toString();
      case 'celular': return c.celular || '';
      case 'nome':
      default: return c.nome || '';
    }
  }

  // -------------------------------------------------------------
  // RENDER TABELA
  // -------------------------------------------------------------
  function renderTable() {
    if (!els.tableBody) return;
    els.tableBody.innerHTML = '';

    if (!state.filtered.length) {
      renderEmpty('Nenhum cliente encontrado.');
      setSelection(null);
      toggleActions(true);
      return;
    }

    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.filtered.slice(start, end);

    pageItems.forEach(item => {
      const c = normalizeCliente(item);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.nome}</td>
        <td>${c.endereco}</td>
        <td>${c.celular}</td>
        <td>${c.codigoFichario}</td>
      `;
      tr.addEventListener('click', () => onRowClick(tr, c));
      els.tableBody.appendChild(tr);
    });

    // se o usuário não clicou em nada, mantém ações desabilitadas
    setSelection(null);
    toggleActions(true);
  }

  function renderEmpty(msg) {
    if (!els.tableBody) return;
    els.tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${msg}</td></tr>`;
  }

  // -------------------------------------------------------------
  // PAGINAÇÃO
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
  // SELEÇÃO
  // -------------------------------------------------------------
  function onRowClick(tr, clienteData) {
    // limpa seleção anterior
    document.querySelectorAll('#tb-clientes tbody tr').forEach(row => row.classList.remove('selected'));
    tr.classList.add('selected');
    setSelection(clienteData);
    toggleActions(false);
  }

  function setSelection(cliente) {
    state.selected = cliente;
  }

  function toggleActions(disabled) {
    [els.btnView, els.btnEdit, els.btnDelete].forEach(btn => {
      if (btn) btn.disabled = disabled;
    });
  }

  function normalizeCliente(c) {
    const endereco = c.endereco || '';
    return {
      id: c.clientesId ?? c.clientesID ?? c.id ?? '',
      nome: c.nome ?? '',
      endereco: endereco,
      rg: c.rg ?? '',
      cpf: c.cpf ?? '',
      telefone: c.telefone ?? '',
      celular: c.celular ?? '',
      dataNascimentoIso: c.dataNascimento || '',
      codigoFichario: c.codigoFichario ?? '',
      dataCadastroIso: c.dataCadastro || c.DataCadastro || '',
      ultimoRegistroIso: c.dataUltimoRegistro || c.DataUltimoRegistro || '',
      deletadoBool: !!c.deletado
    };
  }

  // -------------------------------------------------------------
  // AÇÕES (VISUALIZAR / EDITAR / NOVO / DELETE)
  // -------------------------------------------------------------
  function onView() {
    if (!state.selected) return;
    const c = state.selected;
    const b = els.viewBackdrop;
    if (!b) return;

    setText('m-nome', c.nome);
    setText('m-endereco', c.endereco);
    setText('m-rg', c.rg);
    setText('m-cpf', c.cpf);
    setText('m-telefone', c.telefone);
    setText('m-celular', c.celular);
    setText('m-cod-fichario', c.codigoFichario);
    setText('m-data-cadastro', c.dataCadastroIso ? new Date(c.dataCadastroIso).toLocaleString() : '');
    setText('m-ultimo-registro', c.ultimoRegistroIso ? new Date(c.ultimoRegistroIso).toLocaleString() : '');
    setText('m-data-nasc', c.dataNascimentoIso ? new Date(c.dataNascimentoIso).toLocaleDateString() : '');

    b.classList.add('show');
    document.getElementById('modal-close-btn').onclick = () => b.classList.remove('show');
    b.onclick = e => { if (e.target === b) b.classList.remove('show'); };
  }

  function onEdit() {
    if (!state.selected) return;
    const c = state.selected;
    const b = els.editBackdrop;
    if (!b) return;

    // quebra endereço "LOG, NUM, BAI"
    const partes = (c.endereco || '').split(',').map(p => p.trim());
    const logradouro = partes[0] || '';
    const numero = partes[1] || '';
    const bairro = partes[2] || '';

    setVal('e-id', c.id);
    setVal('e-nome', c.nome);
    setVal('e-logradouro', logradouro);
    setVal('e-numero', numero);
    setVal('e-bairro', bairro);
    setVal('e-rg', c.rg);
    setVal('e-cpf', c.cpf);
    setVal('e-telefone', c.telefone);
    setVal('e-celular', c.celular);
    setVal('e-cod-fichario', c.codigoFichario);
    setVal('e-data-nasc', c.dataNascimentoIso ? c.dataNascimentoIso.substring(0, 10) : '');

    b.classList.add('show');

    document.getElementById('edit-close-btn').onclick = () => b.classList.remove('show');
    document.getElementById('edit-cancel-btn').onclick = () => b.classList.remove('show');
    b.onclick = e => { if (e.target === b) b.classList.remove('show'); };

    // submit
    document.getElementById('edit-form').onsubmit = async (ev) => {
      ev.preventDefault();
      await submitEdit();
    };
  }

  async function submitEdit() {
    const id = getVal('e-id');
    const nome = getVal('e-nome').trim();
    if (!nome) {
      alert('Nome é obrigatório.');
      document.getElementById('e-nome').focus();
      return;
    }

    const endereco = montarEndereco(
      getVal('e-logradouro'),
      getVal('e-numero'),
      getVal('e-bairro')
    );

    // se vazio, usa hoje
    let dataNasc = getVal('e-data-nasc');
    if (!dataNasc) {
      dataNasc = new Date().toISOString().substring(0, 10);
    }

    const payload = {
      clientesId: parseInt(id, 10),
      nome: nome,
      endereco: endereco,
      rg: getVal('e-rg'),
      cpf: getVal('e-cpf'),
      telefone: getVal('e-telefone'),
      celular: getVal('e-celular'),
      dataNascimento: dataNasc,
      codigoFichario: getVal('e-cod-fichario') ? parseInt(getVal('e-cod-fichario'), 10) : 0,
      deletado: false
    };

    const resp = await fetch(`/api/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      els.editBackdrop.classList.remove('show');
      await loadData();
    } else {
      const txt = await resp.text();
      alert('Erro ao atualizar cliente:\n' + txt);
    }
  }

  function onNew() {
    const b = els.newBackdrop;
    if (!b) return;

    // limpa
    ['n-nome','n-logradouro','n-numero','n-bairro','n-rg','n-cpf','n-telefone','n-celular','n-data-nasc','n-cod-fichario']
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
    const nome = getVal('n-nome').trim();
    if (!nome) {
      alert('Nome é obrigatório.');
      document.getElementById('n-nome').focus();
      return;
    }

    const endereco = montarEndereco(
      getVal('n-logradouro'),
      getVal('n-numero'),
      getVal('n-bairro')
    );

    let dataNasc = getVal('n-data-nasc');
    if (!dataNasc) {
      dataNasc = new Date().toISOString().substring(0, 10);
    }

    const payload = {
      nome: nome,
      endereco: endereco,
      rg: getVal('n-rg'),
      cpf: getVal('n-cpf'),
      telefone: getVal('n-telefone'),
      celular: getVal('n-celular'),
      dataNascimento: dataNasc,
      codigoFichario: getVal('n-cod-fichario') ? parseInt(getVal('n-cod-fichario'), 10) : 0,
      deletado: false
    };

    const resp = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      els.newBackdrop.classList.remove('show');
      await loadData();
    } else {
      const txt = await resp.text();
      alert('Erro ao criar cliente:\n' + txt);
    }
  }

  async function onDelete() {
    if (!state.selected) return;
    const ok = confirm(`Confirma excluir o cliente "${state.selected.nome}"?`);
    if (!ok) return;

    const resp = await fetch(`/api/clientes/${state.selected.id}`, {
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

  // -------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------
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

  function montarEndereco(log, num, bairro) {
    const l = log && log.trim() ? log.trim().toUpperCase() : 'NAO INFORMADO';
    const n = num && num.trim() ? num.trim().toUpperCase() : '000';
    const b = bairro && bairro.trim() ? bairro.trim().toUpperCase() : 'NAO INFORMADO';
    return `${l}, ${n}, ${b}`;
  }

  // máscaras de cpf / rg / telefone
  function handleMasks(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.classList.contains('mask-cpf')) {
      t.value = maskCpf(t.value);
    } else if (t.classList.contains('mask-rg')) {
      t.value = maskRg(t.value);
    }
  }

  function onlyDigits(str) {
    return (str || '').replace(/\D/g, '');
  }

  function maskCpf(v) {
    v = onlyDigits(v).slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  }

  function maskRg(v) {
    v = onlyDigits(v).slice(0, 9);
    v = v.replace(/(\d{2})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1})$/, '$1-$2');
    return v;
  }
})();
