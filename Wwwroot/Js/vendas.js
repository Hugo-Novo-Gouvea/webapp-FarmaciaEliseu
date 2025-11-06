// /js/vendas.js

let vendasClientesTodos = [];
let vendasClientesFiltrados = [];
let vendasItens = [];

// init
iniciarVendas();

async function iniciarVendas() {
  wiringVendas();
  await carregarVendedores();
  atualizarStateBotaoVenda();
}

function wiringVendas() {
  const tipoClienteEl = document.getElementById('tipo-cliente');
  const tipoVendaEl = document.getElementById('tipo-venda');

  tipoClienteEl?.addEventListener('change', async () => {
    const v = tipoClienteEl.value;
    updateClienteBlocks(v);
    if (v === 'registrado') {
      await carregarClientesVendas();
    }
    atualizarStateBotaoVenda();
  });

  tipoVendaEl?.addEventListener('change', () => {
    atualizarStateBotaoVenda();
  });

  document.getElementById('cliente-pesquisa')?.addEventListener('input', () => {
    const txt = (document.getElementById('cliente-pesquisa').value || '').toLowerCase();
    if (!txt) {
      vendasClientesFiltrados = [...vendasClientesTodos];
    } else {
      vendasClientesFiltrados = vendasClientesTodos.filter(c => (c.nome || '').toLowerCase().includes(txt));
    }
    popularClientesVendas();
  });

  document.getElementById('vendedor')?.addEventListener('change', () => {
    atualizarStateBotaoVenda();
  });

  document.getElementById('btn-add-item')?.addEventListener('click', async () => {
    await adicionarItemVenda();
  });

  document.getElementById('produto')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await adicionarItemVenda();
    }
  });

  document.getElementById('btn-sell')?.addEventListener('click', async () => {
    await realizarVenda();
  });

  // estado inicial (ao abrir a tela)
  const v0 = tipoClienteEl?.value || '';
  updateClienteBlocks(v0);
}

function updateClienteBlocks(tipo) {
  const reg = document.getElementById('cliente-registrado-block');
  const avu = document.getElementById('cliente-avulso-block');
  if (!reg || !avu) return;
  reg.style.display = (tipo === 'registrado') ? 'flex' : 'none';
  avu.style.display = (tipo === 'avulso') ? 'flex' : 'none';
}

async function carregarVendedores() {
  const sel = document.getElementById('vendedor');
  if (!sel) return;
  sel.innerHTML = '<option value="">Carregando...</option>';
  try {
    const resp = await fetch('/api/funcionarios?pageSize=100000');
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const itens = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    sel.innerHTML = '<option value="">Selecione o vendedor</option>';
    itens.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.funcionariosId ?? f.FuncionariosId ?? f.id;
      opt.textContent = f.nome ?? f.Nome ?? '';
      sel.appendChild(opt);
    });
  } catch {}
}

async function carregarClientesVendas() {
  const sel = document.getElementById('cliente-registrado');
  if (!sel) return;
  sel.innerHTML = '<option value="">Carregando clientes...</option>';
  try {
    const resp = await fetch('/api/contas/clientes');
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const arr = Array.isArray(data) ? data : [];
    vendasClientesTodos = arr.map(c => ({ id: c.id ?? c.clientesId ?? c.ClientesId, nome: c.nome ?? c.Nome }))
      .filter(c => c.id && c.nome);
    vendasClientesFiltrados = [...vendasClientesTodos];
    popularClientesVendas();
  } catch {
    sel.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

function popularClientesVendas() {
  const sel = document.getElementById('cliente-registrado');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Selecione o cliente...</option>';
  vendasClientesFiltrados.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    sel.appendChild(opt);
  });
  sel.value = current || '';
}

function somenteNumeros(str) { return (str || '').replace(/\D+/g, ''); }
function toBRL(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

async function adicionarItemVenda() {
  const termo = document.getElementById('produto').value.trim();
  if (!termo) {
    alert('Informe o código de barras ou descrição do produto.');
    document.getElementById('produto').focus();
    return;
  }
  const qtd = parseInt(document.getElementById('quantidade').value || '1', 10);
  if (!qtd || qtd <= 0) {
    alert('Quantidade inválida.');
    document.getElementById('quantidade').focus();
    return;
  }
  const desconto = parseFloat(document.getElementById('desconto').value || '0');
  if (isNaN(desconto) || desconto < 0) {
    alert('Desconto inválido.');
    document.getElementById('desconto').focus();
    return;
  }

  const isCodigo = /^\d+$/.test(termo);
  const column = isCodigo ? 'codigoBarras' : 'descricao';
  const search = isCodigo ? somenteNumeros(termo) : termo;
  const url = `/api/produtos?page=1&pageSize=50&column=${encodeURIComponent(column)}&search=${encodeURIComponent(search)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    alert('Erro ao buscar produto.');
    return;
  }
  const data = await resp.json();
  const itens = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  if (!itens || itens.length === 0) {
    alert('Produto não encontrado.');
    return;
  }
  const p = itens[0];

  const item = {
    produtoId: p.produtosId ?? p.ProdutosId ?? p.id,
    descricao: p.descricao ?? p.Descricao ?? '',
    codigoProduto: p.codigoProduto ?? p.CodigoProduto ?? '000000000',
    precoUnit: Number(p.precoVenda ?? p.PrecoVenda ?? 0),
    quantidade: qtd,
    desconto: desconto
  };

  vendasItens.push(item);
  renderItensVenda();

  // reset foco para agilizar
  document.getElementById('produto').value = '';
  document.getElementById('quantidade').value = '1';
  document.getElementById('desconto').value = '0';
  document.getElementById('produto').focus();
  atualizarStateBotaoVenda();
}

function renderItensVenda() {
  const tbody = document.querySelector('#tb-itens-venda tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!vendasItens || vendasItens.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum item adicionado...</td></tr>`;
    return;
  }
  vendasItens.forEach((it, idx) => {
    const tr = document.createElement('tr');
    const total = Math.max(0, (it.precoUnit * it.quantidade) - it.desconto);
    tr.innerHTML = `
      <td>${it.descricao}</td>
      <td>${it.quantidade}</td>
      <td>${toBRL(it.precoUnit)}</td>
      <td>${toBRL(it.desconto)}</td>
      <td>${toBRL(total)}</td>
      <td><button class="btn-modern danger" data-del="${idx}">Excluir</button></td>
    `;
    tr.querySelector('button[data-del]')?.addEventListener('click', () => {
      vendasItens.splice(idx, 1);
      renderItensVenda();
      atualizarStateBotaoVenda();
    });
    tbody.appendChild(tr);
  });
}

function atualizarStateBotaoVenda() {
  const btn = document.getElementById('btn-sell');
  const tipoVenda = document.getElementById('tipo-venda').value;
  const tipoCliente = document.getElementById('tipo-cliente').value;
  const vendedor = document.getElementById('vendedor').value;
  let okCliente = false;
  if (tipoCliente === 'registrado') okCliente = !!document.getElementById('cliente-registrado').value;
  else if (tipoCliente === 'avulso') okCliente = !!document.getElementById('cliente-avulso').value.trim();
  const ok = tipoVenda && tipoCliente && okCliente && vendedor && vendasItens.length > 0;
  if (btn) btn.disabled = !ok;
}

async function realizarVenda() {
  const tipoVenda = document.getElementById('tipo-venda').value;
  const tipoCliente = document.getElementById('tipo-cliente').value;
  const vendedorId = parseInt(document.getElementById('vendedor').value, 10);
  let clienteId = null;
  let clienteNome = null;
  if (tipoCliente === 'registrado') {
    clienteId = parseInt(document.getElementById('cliente-registrado').value, 10);
  } else {
    clienteNome = document.getElementById('cliente-avulso').value.trim();
  }

  const itens = vendasItens.map(it => ({
    produtoId: it.produtoId,
    quantidade: it.quantidade,
    desconto: it.desconto
  }));

  const payload = {
    tipoVenda,
    tipoCliente,
    clienteId,
    clienteNome,
    vendedorId,
    itens
  };

  const resp = await fetch('/api/vendas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    alert('Venda registrada com sucesso.');
    // reset itens e tabela
    vendasItens = [];
    renderItensVenda();
    atualizarStateBotaoVenda();
  } else {
    const txt = await resp.text();
    alert('Erro ao registrar venda' + (txt ? `\n${txt}` : ''));
  }
}
