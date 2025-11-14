// wwwroot/js/clientes.js
// Tela de clientes usando o motor genérico CrudList.

(() => {
  if (!window.CrudList) {
    console.error('CrudList não encontrado. Certifique-se de carregar /js/crudList.js antes de /js/clientes.js');
    return;
  }

  // -------------------------
  // ELEMENTOS
  // -------------------------
  const els = {
    // modal visualizar
    viewBackdrop: document.getElementById('cliente-modal-backdrop'),
    viewCloseBtn: document.getElementById('modal-close-btn'),

    v: {
      nome:            document.getElementById('m-nome'),
      endereco:        document.getElementById('m-endereco'),
      rg:              document.getElementById('m-rg'),
      cpf:             document.getElementById('m-cpf'),
      telefone:        document.getElementById('m-telefone'),
      celular:         document.getElementById('m-celular'),
      dataNasc:        document.getElementById('m-data-nasc'),
      codFichario:     document.getElementById('m-cod-fichario'),
      dataCadastro:    document.getElementById('m-data-cadastro'),
      ultimoRegistro:  document.getElementById('m-ultimo-registro'),
    },

    // modal editar
    editBackdrop: document.getElementById('cliente-edit-backdrop'),
    editCloseBtn: document.getElementById('edit-close-btn'),
    editCancelBtn: document.getElementById('edit-cancel-btn'),
    editForm: document.getElementById('edit-form'),

    e: {
      id:           document.getElementById('e-id'),
      nome:         document.getElementById('e-nome'),
      logradouro:   document.getElementById('e-logradouro'),
      numero:       document.getElementById('e-numero'),
      bairro:       document.getElementById('e-bairro'),
      rg:           document.getElementById('e-rg'),
      cpf:          document.getElementById('e-cpf'),
      telefone:     document.getElementById('e-telefone'),
      celular:      document.getElementById('e-celular'),
      dataNasc:     document.getElementById('e-data-nasc'),
      codFichario:  document.getElementById('e-cod-fichario'),
    },

    // modal novo
    newBackdrop: document.getElementById('cliente-new-backdrop'),
    newCloseBtn: document.getElementById('new-close-btn'),
    newCancelBtn: document.getElementById('new-cancel-btn'),
    newForm: document.getElementById('new-form'),

    n: {
      nome:         document.getElementById('n-nome'),
      logradouro:   document.getElementById('n-logradouro'),
      numero:       document.getElementById('n-numero'),
      bairro:       document.getElementById('n-bairro'),
      rg:           document.getElementById('n-rg'),
      cpf:          document.getElementById('n-cpf'),
      telefone:     document.getElementById('n-telefone'),
      celular:      document.getElementById('n-celular'),
      dataNasc:     document.getElementById('n-data-nasc'),
      codFichario:  document.getElementById('n-cod-fichario'),
    },
  };

  // -------------------------
  // HELPERS
  // -------------------------
  function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  function fmtDateTime(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  }

  function isoDateOnly(v) {
    if (!v) return '';
    const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
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

  function splitEndereco(endereco) {
    const partes = (endereco || '').split(',').map(p => p.trim());
    return {
      logradouro: partes[0] || '',
      numero: partes[1] || '',
      bairro: partes[2] || '',
    };
  }

  function montarEndereco(logradouro, numero, bairro) {
    const log = (logradouro || '').trim() || 'NAO INFORMADO';
    const num = (numero || '').trim() || '000';
    const bai = (bairro || '').trim() || 'NAO INFORMADO';
    return `${log.toUpperCase()}, ${num.toUpperCase()}, ${bai.toUpperCase()}`;
  }

  // -------------------------
  // PREENCHER MODAIS
  // -------------------------
  function fillViewModal(c) {
    if (!c) return;
    const v = els.v;

    const nome           = c.nome ?? c.Nome ?? '';
    const endereco       = c.endereco ?? c.Endereco ?? '';
    const rg             = c.rg ?? c.Rg ?? '';
    const cpf            = c.cpf ?? c.Cpf ?? '';
    const telefone       = c.telefone ?? c.Telefone ?? '';
    const celular        = c.celular ?? c.Celular ?? '';
    const dataNasc       = c.dataNascimento ?? c.DataNascimento ?? null;
    const codFichario    = c.codigoFichario ?? c.CodigoFichario ?? null;
    const dataCadastro   = c.dataCadastro ?? c.DataCadastro ?? null;
    const ultimoRegistro = c.dataUltimoRegistro ?? c.DataUltimoRegistro ?? null;

    if (v.nome)           v.nome.textContent = nome;
    if (v.endereco)       v.endereco.textContent = endereco;
    if (v.rg)             v.rg.textContent = rg;
    if (v.cpf)            v.cpf.textContent = cpf;
    if (v.telefone)       v.telefone.textContent = telefone;
    if (v.celular)        v.celular.textContent = celular;
    if (v.dataNasc)       v.dataNasc.textContent = fmtDate(dataNasc);
    if (v.codFichario)    v.codFichario.textContent = codFichario ?? '';
    if (v.dataCadastro)   v.dataCadastro.textContent = fmtDateTime(dataCadastro);
    if (v.ultimoRegistro) v.ultimoRegistro.textContent = fmtDateTime(ultimoRegistro);
  }

  function fillEditModal(c) {
    if (!c) return;
    const e = els.e;

    const id             = c.clientesId ?? c.ClientesId ?? c.id ?? null;
    const nome           = c.nome ?? c.Nome ?? '';
    const endereco       = c.endereco ?? c.Endereco ?? '';
    const rg             = c.rg ?? c.Rg ?? '';
    const cpf            = c.cpf ?? c.Cpf ?? '';
    const telefone       = c.telefone ?? c.Telefone ?? '';
    const celular        = c.celular ?? c.Celular ?? '';
    const dataNasc       = c.dataNascimento ?? c.DataNascimento ?? null;
    const codFichario    = c.codigoFichario ?? c.CodigoFichario ?? null;

    const { logradouro, numero, bairro } = splitEndereco(endereco);

    if (e.id)          e.id.value = id ?? '';
    if (e.nome)        e.nome.value = nome;
    if (e.logradouro)  e.logradouro.value = logradouro;
    if (e.numero)      e.numero.value = numero;
    if (e.bairro)      e.bairro.value = bairro;
    if (e.rg)          e.rg.value = rg;
    if (e.cpf)         e.cpf.value = cpf;
    if (e.telefone)    e.telefone.value = telefone;
    if (e.celular)     e.celular.value = celular;
    if (e.dataNasc)    e.dataNasc.value = isoDateOnly(dataNasc);
    if (e.codFichario) e.codFichario.value = codFichario ?? '';
  }

  function clearNewForm() {
    const n = els.n;
    Object.keys(n).forEach(k => {
      if (n[k]) n[k].value = '';
    });
  }

  function buildEditPayload() {
    const e = els.e;

    const nome        = (e.nome?.value ?? '').trim();
    const logradouro  = e.logradouro?.value ?? '';
    const numero      = e.numero?.value ?? '';
    const bairro      = e.bairro?.value ?? '';
    const rg          = e.rg?.value ?? '';
    const cpf         = e.cpf?.value ?? '';
    const telefone    = e.telefone?.value ?? '';
    const celular     = e.celular?.value ?? '';
    const dataNasc    = e.dataNasc?.value ?? '';
    const codFichario = e.codFichario?.value ?? '';

    return {
      Nome: (nome || '').toUpperCase(),
      Endereco: montarEndereco(logradouro, numero, bairro),
      Rg: rg,
      Cpf: cpf,
      Telefone: telefone,
      Celular: celular,
      DataNascimento: dataNasc || null,
      CodigoFichario: codFichario ? parseInt(codFichario, 10) : 0,
    };
  }

  function buildNewPayload() {
    const n = els.n;

    const nome        = (n.nome?.value ?? '').trim();
    const logradouro  = n.logradouro?.value ?? '';
    const numero      = n.numero?.value ?? '';
    const bairro      = n.bairro?.value ?? '';
    const rg          = n.rg?.value ?? '';
    const cpf         = n.cpf?.value ?? '';
    const telefone    = n.telefone?.value ?? '';
    const celular     = n.celular?.value ?? '';
    const dataNasc    = n.dataNasc?.value ?? '';
    const codFichario = n.codFichario?.value ?? '';

    return {
      Nome: (nome || '').toUpperCase(),
      Endereco: montarEndereco(logradouro, numero, bairro),
      Rg: rg,
      Cpf: cpf,
      Telefone: telefone,
      Celular: celular,
      DataNascimento: dataNasc || null,
      CodigoFichario: codFichario ? parseInt(codFichario, 10) : 0,
    };
  }

  // -------------------------
  // INSTÂNCIA DO CrudList
  // -------------------------
  let list;

  const cfg = {
    endpoint: '/api/clientes',
    tableBodySelector: '#tb-clientes tbody',
    pagerInfoSelector: '#clientes-pg-info',
    pagerPrevSelector: '#clientes-pg-prev',
    pagerNextSelector: '#clientes-pg-next',
    filterColumnSelector: '#filter-column',
    filterTextSelector: '#filter-text',
    btnViewSelector: '#btn-view',
    btnEditSelector: '#btn-edit',
    btnNewSelector: '#btn-new',
    btnDeleteSelector: '#btn-delete',

    defaultColumn: 'nome',
    pageSize: 50,
    columnsCount: 4, // Nome, Endereço, Celular, Cod. Fichário

    mapRow: (c) => {
      const id       = c.clientesId ?? c.ClientesId ?? c.id ?? 0;
      const nome     = c.nome ?? c.Nome ?? '';
      const endereco = c.endereco ?? c.Endereco ?? '';
      const celular  = c.celular ?? c.Celular ?? '';
      const codFich  = c.codigoFichario ?? c.CodigoFichario ?? '';

      return {
        id,
        cells: [nome, endereco, celular, codFich],
      };
    },

    async onView(id) {
      try {
        const c = await fetchJson(`/api/clientes/${id}`);
        fillViewModal(c);
        openModal(els.viewBackdrop);
      } catch (err) {
        console.error(err);
        alert('Falha ao carregar detalhes do cliente.');
      }
    },

    async onEdit(id) {
      try {
        const c = await fetchJson(`/api/clientes/${id}`);
        fillEditModal(c);
        openModal(els.editBackdrop);
      } catch (err) {
        console.error(err);
        alert('Falha ao carregar cliente para edição.');
      }
    },

    async onDelete(id) {
      if (!confirm('Deseja realmente excluir este cliente?')) return;
      try {
        const resp = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || 'Erro ao excluir cliente.');
        }
        await list.loadPage();
      } catch (err) {
        console.error(err);
        alert('Falha ao excluir cliente.');
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
      const resp = await fetch(`/api/clientes/${id}`, {
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
      const resp = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Erro ao criar cliente.');
      }
      closeModal(els.newBackdrop);
      list.state.page = 1;
      await list.loadPage();
    } catch (err) {
      console.error(err);
      alert('Falha ao criar cliente.');
    }
  });
})();
