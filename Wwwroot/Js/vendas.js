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
  const tipoProdutoEl = document.getElementById('tipo-produto');

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

  tipoProdutoEl?.addEventListener('change', () => {
    const v = tipoProdutoEl.value;
    updateProdutoBlocks(v);
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

  document.getElementById('btn-add-item-avulso')?.addEventListener('click', async () => {
    await adicionarItemAvulso();
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
  const p0 = tipoProdutoEl?.value || '';
  updateProdutoBlocks(p0);
}

function updateClienteBlocks(tipo) {
  const reg = document.getElementById('cliente-registrado-block');
  const avu = document.getElementById('cliente-avulso-block');
  if (!reg || !avu) return;
  reg.style.display = (tipo === 'registrado') ? 'flex' : 'none';
  avu.style.display = (tipo === 'avulso') ? 'flex' : 'none';
}

function updateProdutoBlocks(tipo) {
  const reg = document.getElementById('produto-registrado-block');
  const avu = document.getElementById('produto-avulso-block');
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
  } catch { }
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
    vendasClientesTodos = arr.map(c => ({
      id: c.id ?? c.clientesId ?? c.ClientesId,
      nome: c.nome ?? c.Nome
    })).filter(c => c.id && c.nome);
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
  // apenas quando tipo-produto for 'registrado'
  const tp = document.getElementById('tipo-produto')?.value || '';
  if (tp !== 'registrado') return;
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

async function adicionarItemAvulso() {
  // apenas quando tipo-produto for 'avulso'
  const tp = document.getElementById('tipo-produto')?.value || '';
  if (tp !== 'avulso') return;

  const nome = (document.getElementById('produto-nome').value || '').trim();
  if (!nome) {
    alert('Informe o nome do produto avulso.');
    document.getElementById('produto-nome').focus();
    return;
  }
  const preco = parseFloat(document.getElementById('produto-preco').value || '0');
  if (isNaN(preco) || preco < 0) {
    alert('Preço de venda inválido.');
    document.getElementById('produto-preco').focus();
    return;
  }
  const qtd = parseInt(document.getElementById('quantidade-avulso').value || '1', 10);
  if (!qtd || qtd <= 0) {
    alert('Quantidade inválida.');
    document.getElementById('quantidade-avulso').focus();
    return;
  }
  const desconto = parseFloat(document.getElementById('desconto-avulso').value || '0');
  if (isNaN(desconto) || desconto < 0) {
    alert('Desconto inválido.');
    document.getElementById('desconto-avulso').focus();
    return;
  }

  const item = {
    produtoId: 1, // item avulso usa produto 1
    descricao: nome,
    codigoProduto: '000000000',
    precoUnit: Number(preco),
    quantidade: qtd,
    desconto: desconto
  };

  vendasItens.push(item);
  renderItensVenda();

  // reset campos
  document.getElementById('produto-nome').value = '';
  document.getElementById('produto-preco').value = '0';
  document.getElementById('quantidade-avulso').value = '1';
  document.getElementById('desconto-avulso').value = '0';
  document.getElementById('produto-nome').focus();
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
  const tipoProduto = document.getElementById('tipo-produto').value;
  const vendedor = document.getElementById('vendedor').value;
  let okCliente = false;
  if (tipoCliente === 'registrado') okCliente = !!document.getElementById('cliente-registrado').value;
  else if (tipoCliente === 'avulso') okCliente = !!document.getElementById('cliente-avulso').value.trim();
  const ok = tipoVenda && tipoCliente && okCliente && vendedor && tipoProduto && vendasItens.length > 0;
  if (btn) btn.disabled = !ok;
}

// AQUI é a parte que mudou
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
    desconto: it.desconto,
    descricao: it.descricao,
    precoUnit: it.precoUnit
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

  if (!resp.ok) {
    const txt = await resp.text();
    alert('Erro ao registrar venda' + (txt ? `\n${txt}` : ''));
    return;
  }

  // daqui pra baixo é o fluxo de impressão
  let querImprimir = confirm('Venda registrada com sucesso.\nDeseja imprimir o cupom?');

  while (querImprimir) {
    const respImp = await fetch('/api/vendas/imprimir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!respImp.ok) {
      alert('Falha ao imprimir o cupom.');
      break;
    }

    querImprimir = confirm('Cupom enviado para a impressora.\nImprimir novamente?');
  }

  // limpa a venda da tela
  vendasItens = [];
  renderItensVenda();
  atualizarStateBotaoVenda();
  // se quiser limpar cliente avulso:
  // document.getElementById('cliente-avulso').value = '';
}
