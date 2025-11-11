// /js/vendas.js
// vendas com:
// - autocomplete de cliente
// - total devido do cliente
// - fluxo de ENTER: produto -> (modal se for descrição) -> quantidade -> desconto -> adiciona
// - busca de produto APENAS no primeiro campo
// - modal sem botão "escolher" por linha (seleciona linha + confirmar)

let vendasClientesTodos = [];
let vendasItens = [];

// cliente selecionado (autocomplete)
let vendasClienteSelecionado = null;

// produto selecionado (depois do enter no produto ou depois do modal)
let vendasProdutoSelecionado = null;

// para o modal de lookup de produto
let vendasLookupProdutos = [];
let vendasLookupSelecionadoIndex = -1;

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
  const tipoDescontoEl = document.getElementById('tipo-desconto');

  tipoClienteEl?.addEventListener('change', async () => {
    const v = tipoClienteEl.value;
    updateClienteBlocks(v);
    if (v === 'registrado') {
      await carregarClientesVendas();
    } else {
      vendasClienteSelecionado = null;
      atualizarTotalClienteVendas(0);
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

  tipoDescontoEl?.addEventListener('change', () => {
    atualizarLabelsDesconto();
  });

  // AUTOCOMPLETE cliente registrado
  const cliInput = document.getElementById('cliente-registrado-input');
  const cliSuggest = document.getElementById('cliente-registrado-suggest');
  cliInput?.addEventListener('input', () => {
    const txt = (cliInput.value || '').toLowerCase();
    if (!txt) {
      cliSuggest.style.display = 'none';
      vendasClienteSelecionado = null;
      atualizarTotalClienteVendas(0);
      atualizarStateBotaoVenda();
      return;
    }
    const filtrados = vendasClientesTodos
      .filter(c => (c.nome || '').toLowerCase().includes(txt))
      .slice(0, 30);

    if (filtrados.length === 0) {
      cliSuggest.style.display = 'none';
      return;
    }

    cliSuggest.innerHTML = '';
    filtrados.forEach(c => {
      const div = document.createElement('div');
      div.className = 'suggest-item';
      div.textContent = c.nome;
      div.addEventListener('click', async () => {
        cliInput.value = c.nome;
        cliSuggest.style.display = 'none';
        vendasClienteSelecionado = c;
        await carregarTotalDoCliente(c.id);
        atualizarStateBotaoVenda();
      });
      cliSuggest.appendChild(div);
    });
    cliSuggest.style.display = 'block';
  });

  // fechar sugestões ao clicar fora
  document.addEventListener('click', (e) => {
    if (!cliSuggest) return;
    if (!cliSuggest.contains(e.target) && e.target !== cliInput) {
      cliSuggest.style.display = 'none';
    }
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

  document.getElementById('btn-sell')?.addEventListener('click', async () => {
    await realizarVenda();
  });

  // =========================
  // FLUXO DE ENTER - PRODUTO REGISTRADO
  // =========================
  const inpProd = document.getElementById('produto');
  const inpQtd = document.getElementById('quantidade');
  const inpDesc = document.getElementById('desconto');

  // AGORA: só busca produto aqui
  inpProd?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await tratarEnterProdutoRegistrado();
    }
  });

  // depois de já ter produto selecionado, segue o fluxo normal
  inpQtd?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inpDesc?.focus();
      inpDesc?.select?.();
    }
  });
  inpDesc?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await adicionarItemVenda();
    }
  });

  // =========================
  // FLUXO DE ENTER - PRODUTO AVULSO
  // =========================
  const inpNomeAv = document.getElementById('produto-nome');
  const inpPrecoAv = document.getElementById('produto-preco');
  const inpQtdAv = document.getElementById('quantidade-avulso');
  const inpDescAv = document.getElementById('desconto-avulso');

  inpNomeAv?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inpPrecoAv?.focus();
      inpPrecoAv?.select?.();
    }
  });
  inpPrecoAv?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inpQtdAv?.focus();
      inpQtdAv?.select?.();
    }
  });
  inpQtdAv?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inpDescAv?.focus();
      inpDescAv?.select?.();
    }
  });
  inpDescAv?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await adicionarItemAvulso();
    }
  });

  // modal lookup produto
  const lookupClose = document.getElementById('produto-lookup-close');
  const lookupCancel = document.getElementById('produto-lookup-cancel');
  const lookupConfirm = document.getElementById('produto-lookup-confirm');
  lookupClose?.addEventListener('click', fecharModalLookupProduto);
  lookupCancel?.addEventListener('click', fecharModalLookupProduto);
  lookupConfirm?.addEventListener('click', confirmarModalLookupProduto);

  // estado inicial
  const v0 = tipoClienteEl?.value || '';
  updateClienteBlocks(v0);
  const p0 = tipoProdutoEl?.value || '';
  updateProdutoBlocks(p0);
  atualizarLabelsDesconto();
}

function atualizarLabelsDesconto() {
  const tipo = document.getElementById('tipo-desconto')?.value || 'porcentagem';
  const lblReg = document.getElementById('label-desconto-reg');
  const lblAvu = document.getElementById('label-desconto-avulso');
  const txt = tipo === 'porcentagem' ? 'Desconto (%)' : 'Desconto (R$)';
  if (lblReg) lblReg.textContent = txt;
  if (lblAvu) lblAvu.textContent = txt;
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
  if (vendasClientesTodos.length > 0) return;
  try {
    const resp = await fetch('/api/contas/clientes');
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const arr = Array.isArray(data) ? data : [];
    vendasClientesTodos = arr.map(c => ({
      id: c.clientesId ?? c.ClientesId ?? c.id,
      nome: c.nome ?? c.Nome
    })).filter(c => c.id && c.nome);
  } catch { }
}

function somenteNumeros(str) { return (str || '').replace(/\D+/g, ''); }
function toBRL(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

/* =========================================================
   ENTER NO CAMPO "PRODUTO"
   ========================================================= */
async function tratarEnterProdutoRegistrado() {
  const tp = document.getElementById('tipo-produto')?.value || '';
  if (tp !== 'registrado') return;

  const inpProd = document.getElementById('produto');
  const termo = (inpProd.value || '').trim();
  if (!termo) return;

  // zera produto anterior
  vendasProdutoSelecionado = null;

  const isCodigo = /^\d+$/.test(termo);
  if (isCodigo) {
    // busca por código de barras → se achou 1, já resolve e vai pra qtd
    const url = `/api/produtos?page=1&pageSize=50&column=codigoBarras&search=${encodeURIComponent(somenteNumeros(termo))}`;
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
    vendasProdutoSelecionado = p;
    // opcional: deixar o campo com a descrição
    inpProd.value = p.descricao ?? p.Descricao ?? termo;
    const qtd = document.getElementById('quantidade');
    qtd?.focus();
    qtd?.select?.();
    return;
  }

  // descrição → sempre mostra modal com resultados
  await abrirModalLookupProduto(termo);
}

/* =========================================================
   ADICIONAR ITEM REGISTRADO (AGORA NÃO BUSCA MAIS AQUI)
   ========================================================= */
async function adicionarItemVenda() {
  const tp = document.getElementById('tipo-produto')?.value || '';
  if (tp !== 'registrado') return;

  if (!vendasProdutoSelecionado) {
    alert('Selecione um produto primeiro (Enter no campo e escolha no modal).');
    document.getElementById('produto').focus();
    return;
  }

  const qtd = parseInt(document.getElementById('quantidade').value || '1', 10);
  if (!qtd || qtd <= 0) {
    alert('Quantidade inválida.');
    document.getElementById('quantidade').focus();
    return;
  }

  const descontoDigitado = parseFloat(document.getElementById('desconto').value || '0');
  if (isNaN(descontoDigitado) || descontoDigitado < 0) {
    alert('Desconto inválido.');
    document.getElementById('desconto').focus();
    return;
  }

  const tipoDesconto = document.getElementById('tipo-desconto')?.value || 'porcentagem';

  const p = vendasProdutoSelecionado;
  const precoUnit = Number(p.precoVenda ?? p.PrecoVenda ?? 0);

  let valorDesconto = 0;
  if (tipoDesconto === 'porcentagem') {
    valorDesconto = (precoUnit * qtd) * (descontoDigitado / 100);
  } else {
    valorDesconto = descontoDigitado;
  }
  if (valorDesconto < 0) valorDesconto = 0;

  const item = {
    produtoId: p.produtosId ?? p.ProdutosId ?? p.id,
    descricao: p.descricao ?? p.Descricao ?? '',
    codigoProduto: p.codigoProduto ?? p.CodigoProduto ?? '000000000',
    precoUnit: precoUnit,
    quantidade: qtd,
    desconto: Number(valorDesconto.toFixed(2))
  };

  vendasItens.push(item);
  renderItensVenda();

  // reset campos e produto selecionado
  vendasProdutoSelecionado = null;
  document.getElementById('produto').value = '';
  document.getElementById('quantidade').value = '1';
  document.getElementById('desconto').value = '0';
  document.getElementById('produto').focus();

  atualizarStateBotaoVenda();
}

/* =========================================================
   ADICIONAR ITEM AVULSO
   ========================================================= */
async function adicionarItemAvulso() {
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
  const descontoDigitado = parseFloat(document.getElementById('desconto-avulso').value || '0');
  if (isNaN(descontoDigitado) || descontoDigitado < 0) {
    alert('Desconto inválido.');
    document.getElementById('desconto-avulso').focus();
    return;
  }

  const tipoDesconto = document.getElementById('tipo-desconto')?.value || 'porcentagem';
  let valorDesconto = 0;
  if (tipoDesconto === 'porcentagem') {
    valorDesconto = (preco * qtd) * (descontoDigitado / 100);
  } else {
    valorDesconto = descontoDigitado;
  }
  if (valorDesconto < 0) valorDesconto = 0;

  const item = {
    produtoId: 1,
    descricao: nome,
    codigoProduto: '000000000',
    precoUnit: Number(preco),
    quantidade: qtd,
    desconto: Number(valorDesconto.toFixed(2))
  };

  vendasItens.push(item);
  renderItensVenda();

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
  if (tipoCliente === 'registrado') {
    okCliente = !!(vendasClienteSelecionado && vendasClienteSelecionado.id);
  } else if (tipoCliente === 'avulso') {
    okCliente = !!document.getElementById('cliente-avulso').value.trim();
  }

  const ok = tipoVenda && tipoCliente && okCliente && vendedor && tipoProduto && vendasItens.length > 0;
  if (btn) btn.disabled = !ok;
}

async function realizarVenda() {
  const tipoVenda = document.getElementById('tipo-venda').value;
  const tipoCliente = document.getElementById('tipo-cliente').value;
  const vendedorId = parseInt(document.getElementById('vendedor').value, 10);

  let clienteId = null;
  let clienteNome = null;
  if (tipoCliente === 'registrado') {
    if (!vendasClienteSelecionado) {
      alert('Selecione um cliente.');
      return;
    }
    clienteId = vendasClienteSelecionado.id;
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

  vendasItens = [];
  renderItensVenda();
  atualizarStateBotaoVenda();
}

/* =========================================================
   TOTAL DO CLIENTE
   ========================================================= */
async function carregarTotalDoCliente(clienteId) {
  if (!clienteId) {
    atualizarTotalClienteVendas(0);
    return;
  }
  try {
    const resp = await fetch(`/api/contas/movimentos?clienteId=${clienteId}`);
    if (!resp.ok) {
      atualizarTotalClienteVendas(0);
      return;
    }
    const data = await resp.json();
    const movs = Array.isArray(data)
      ? data
      : Array.isArray(data.items)
        ? data.items
        : [];
    let total = 0;
    movs.forEach(m => {
      if (m.deletado === false) {
        let v =
          m.precoTotalAtual ??
          m.PrecoTotalAtual ??
          m.precoTotalDiaVenda ??
          m.PrecoTotalDiaVenda ??
          m.valorVenda ??
          m.ValorVenda ??
          0;
        const num = typeof v === 'number' ? v : parseFloat(v || 0);
        total += isNaN(num) ? 0 : num;
      }
    });
    atualizarTotalClienteVendas(total);
  } catch {
    atualizarTotalClienteVendas(0);
  }
}

function atualizarTotalClienteVendas(valor) {
  const el = document.getElementById('vendas-total-cliente');
  if (!el) return;
  el.textContent = 'Total: ' + Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* =========================================================
   MODAL LOOKUP PRODUTO (sem botão em cada linha)
   ========================================================= */
async function abrirModalLookupProduto(termo, listaPronta) {
  const backdrop = document.getElementById('produto-lookup-backdrop');
  const tbody = document.getElementById('produto-lookup-tbody');
  vendasLookupSelecionadoIndex = -1;

  if (!listaPronta) {
    const resp = await fetch(`/api/produtos?page=1&pageSize=200&column=descricao&search=${encodeURIComponent(termo)}`);
    if (!resp.ok) {
      alert('Produto não encontrado.');
      return;
    }
    const data = await resp.json();
    listaPronta = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  }

  vendasLookupProdutos = listaPronta || [];

  if (!vendasLookupProdutos.length) {
    alert('Produto não encontrado.');
    return;
  }

  tbody.innerHTML = '';
  vendasLookupProdutos.forEach((p, idx) => {
    const tr = document.createElement('tr');
    const preco = Number(p.precoVenda ?? p.PrecoVenda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    tr.innerHTML = `
      <td>${p.descricao ?? p.Descricao ?? ''}</td>
      <td>${p.codigoBarras ?? p.CodigoBarras ?? ''}</td>
      <td>R$ ${preco}</td>
    `;
    tr.addEventListener('click', () => {
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
      vendasLookupSelecionadoIndex = idx;
    });
    tbody.appendChild(tr);
  });

  backdrop.style.display = 'flex';
}

function fecharModalLookupProduto() {
  const backdrop = document.getElementById('produto-lookup-backdrop');
  backdrop.style.display = 'none';
}

function confirmarModalLookupProduto() {
  if (vendasLookupSelecionadoIndex < 0) {
    alert('Selecione um produto na lista.');
    return;
  }
  const produto = vendasLookupProdutos[vendasLookupSelecionadoIndex];
  const inp = document.getElementById('produto');
  if (inp && produto) {
    inp.value = produto.descricao ?? produto.Descricao ?? '';
    vendasProdutoSelecionado = produto;
    // vai pra quantidade
    const qtd = document.getElementById('quantidade');
    qtd?.focus();
    qtd?.select?.();
  }
  fecharModalLookupProduto();
}
