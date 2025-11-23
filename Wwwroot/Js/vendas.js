const vendasState = {
  clientes: [],
  clienteSelecionado: null,
  produtoSelecionado: null,
  itens: []
};

const vendasEls = {};

document.addEventListener('DOMContentLoaded', async () => {
  mapVendasElements();
  bindVendasEvents();
  await Promise.all([carregarClientes(), carregarVendedores()]);
  atualizarBlocoCliente();
  atualizarBlocoProduto();
  atualizarGridItens();
  atualizarTotalVenda();
  atualizarEstadoVenda();
});

function mapVendasElements() {
  vendasEls.tipoVenda = document.getElementById('tipo-venda');
  vendasEls.tipoCliente = document.getElementById('tipo-cliente');
  vendasEls.tipoProduto = document.getElementById('tipo-produto');
  vendasEls.tipoDesconto = document.getElementById('tipo-desconto');
  vendasEls.vendedor = document.getElementById('vendedor');

  vendasEls.clienteAvulso = document.getElementById('cliente-avulso');
  vendasEls.clienteRegistradoInput = document.getElementById('cliente-registrado-input');
  vendasEls.clienteRegistradoSuggest = document.getElementById('cliente-registrado-suggest');
  vendasEls.totalCliente = document.getElementById('vendas-total-cliente');

  vendasEls.produtoInput = document.getElementById('produto');
  vendasEls.quantidade = document.getElementById('quantidade');
  vendasEls.desconto = document.getElementById('desconto');
  vendasEls.btnAddItem = document.getElementById('btn-add-item');

  vendasEls.produtoNomeAvulso = document.getElementById('produto-nome');
  vendasEls.produtoPrecoAvulso = document.getElementById('produto-preco');
  vendasEls.quantidadeAvulso = document.getElementById('quantidade-avulso');
  vendasEls.descontoAvulso = document.getElementById('desconto-avulso');
  vendasEls.btnAddItemAvulso = document.getElementById('btn-add-item-avulso');

  vendasEls.tabelaItensBody = document.querySelector('#tb-itens-venda tbody');
  vendasEls.btnSell = document.getElementById('btn-sell');

  vendasEls.blocoClienteRegistrado = document.getElementById('cliente-registrado-block');
  vendasEls.blocoClienteAvulso = document.getElementById('cliente-avulso-block');
  vendasEls.blocoProdutoRegistrado = document.getElementById('produto-registrado-block');
  vendasEls.blocoProdutoAvulso = document.getElementById('produto-avulso-block');

  vendasEls.labelDescReg = document.getElementById('label-desconto-reg');
  vendasEls.labelDescAvulso = document.getElementById('label-desconto-avulso');

  vendasEls.modalBackdrop = document.getElementById('produto-lookup-backdrop');
  vendasEls.modalTbody = document.getElementById('produto-lookup-tbody');
  vendasEls.modalClose = document.getElementById('produto-lookup-close');
  vendasEls.modalCancel = document.getElementById('produto-lookup-cancel');
  vendasEls.modalConfirm = document.getElementById('produto-lookup-confirm');
}

function bindVendasEvents() {
  vendasEls.tipoCliente?.addEventListener('change', () => {
    vendasState.clienteSelecionado = null;
    atualizarBlocoCliente();
    atualizarEstadoVenda();
  });

  vendasEls.tipoProduto?.addEventListener('change', () => {
    vendasState.produtoSelecionado = null;
    atualizarBlocoProduto();
  });

  vendasEls.tipoDesconto?.addEventListener('change', atualizarLabelsDesconto);

  vendasEls.tipoVenda?.addEventListener('change', atualizarEstadoVenda);
  vendasEls.vendedor?.addEventListener('change', atualizarEstadoVenda);

  vendasEls.clienteAvulso?.addEventListener('input', atualizarEstadoVenda);
  initAutocompleteClientes();

  vendasEls.produtoInput?.addEventListener('keydown', async (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      await buscarProdutoRegistrado();
    }
  });

  vendasEls.quantidade?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      vendasEls.desconto?.focus();
    }
  });

  vendasEls.desconto?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      adicionarItemRegistrado();
    }
  });

  vendasEls.btnAddItem?.addEventListener('click', adicionarItemRegistrado);
  vendasEls.btnAddItemAvulso?.addEventListener('click', adicionarItemAvulso);

  vendasEls.btnSell?.addEventListener('click', realizarVenda);

  vendasEls.modalClose?.addEventListener('click', fecharModalProdutos);
  vendasEls.modalCancel?.addEventListener('click', fecharModalProdutos);
  vendasEls.modalConfirm?.addEventListener('click', () => {
    if (vendasState.produtoSelecionado) {
      selecionarProduto(vendasState.produtoSelecionado);
    }
    fecharModalProdutos();
  });
}

async function carregarClientes() {
  try {
    let carregado = false;

    // 1) tenta usar o endpoint de contas, que já traz todos os clientes não deletados
    try {
      const respContas = await fetch('/api/contas/clientes');
      if (respContas.ok) {
        const dataContas = await respContas.json();
        const lista = Array.isArray(dataContas) ? dataContas : [];
        vendasState.clientes = lista
          .map(c => ({
            clientesId: c.clientesId ?? c.ClientesId ?? c.id ?? c.Id ?? 0,
            nome: c.nome ?? c.Nome ?? '',
            codigoFichario: c.codigoFichario ?? c.CodigoFichario ?? null,
            cpf: c.cpf ?? c.Cpf ?? null
          }))
          .filter(c => c.clientesId && c.nome);
        carregado = true;
      }
    } catch (_) {
      // se der erro, cai pro fallback abaixo
    }

    // 2) fallback para /api/clientes caso o endpoint acima falhe
    if (!carregado) {
      const resp = await fetch('/api/clientes?pageSize=100000');
      if (!resp.ok) {
        vendasState.clientes = [];
        return;
      }

      const data = await resp.json();
      const arr = Array.isArray(data) ? data : (data.items || []);

      vendasState.clientes = (arr || [])
        .map(c => ({
          clientesId: c.clientesId ?? c.ClientesId ?? c.id ?? c.Id ?? 0,
          nome: c.nome ?? c.Nome ?? '',
          codigoFichario: c.codigoFichario ?? c.CodigoFichario ?? null,
          cpf: c.cpf ?? c.Cpf ?? null
        }))
        .filter(c => c.clientesId && c.nome);
    }
  } catch (err) {
    console.error('Falha ao carregar clientes', err);
    vendasState.clientes = [];
  }
}


async function carregarVendedores() {
  try {
    const resp = await fetch('/api/funcionarios?pageSize=200');
    if (!resp.ok) return;
    const data = await resp.json();
    const lista = Array.isArray(data) ? data : (data.items || []);
    if (!vendasEls.vendedor) return;
    vendasEls.vendedor.innerHTML = '<option value="">Selecione o vendedor</option>';
    lista.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.funcionariosId;
      opt.textContent = v.nome;
      vendasEls.vendedor.appendChild(opt);
    });
  } catch (err) {
    console.error('Falha ao carregar vendedores', err);
  }
}

function atualizarBlocoCliente() {
  const tipo = vendasEls.tipoCliente?.value || '';

  if (tipo === 'registrado') {
    vendasEls.blocoClienteRegistrado?.setAttribute('style', 'display:flex;');
    vendasEls.blocoClienteAvulso?.setAttribute('style', 'display:none;');
  } else if (tipo === 'avulso') {
    vendasEls.blocoClienteRegistrado?.setAttribute('style', 'display:none;');
    vendasEls.blocoClienteAvulso?.setAttribute('style', 'display:flex;');
  } else {
    // "Selecione" → some tudo
    vendasEls.blocoClienteRegistrado?.setAttribute('style', 'display:none;');
    vendasEls.blocoClienteAvulso?.setAttribute('style', 'display:none;');
  }

  atualizarTotalCliente();
}

function atualizarBlocoProduto() {
  const tipo = vendasEls.tipoProduto?.value || '';

  if (tipo === 'registrado') {
    // mostra só os campos de produto registrado
    vendasEls.blocoProdutoRegistrado?.setAttribute('style', 'display:flex;');
    vendasEls.blocoProdutoAvulso?.setAttribute('style', 'display:none;');
  } else if (tipo === 'avulso') {
    // mostra só os campos de produto avulso
    vendasEls.blocoProdutoRegistrado?.setAttribute('style', 'display:none;');
    vendasEls.blocoProdutoAvulso?.setAttribute('style', 'display:flex;');
  } else {
    // enquanto estiver em "Selecione", esconde tudo
    vendasEls.blocoProdutoRegistrado?.setAttribute('style', 'display:none;');
    vendasEls.blocoProdutoAvulso?.setAttribute('style', 'display:none;');
  }

  atualizarLabelsDesconto();
}

function atualizarLabelsDesconto() {
  const tipo = vendasEls.tipoDesconto?.value || 'porcentagem';
  const sufixo = tipo === 'fixo' ? ' (R$)' : ' (%)';
  if (vendasEls.labelDescReg) vendasEls.labelDescReg.textContent = 'Desconto' + sufixo;
  if (vendasEls.labelDescAvulso) vendasEls.labelDescAvulso.textContent = 'Desconto' + sufixo;
}

function initAutocompleteClientes() {
  const input = vendasEls.clienteRegistradoInput;
  const suggest = vendasEls.clienteRegistradoSuggest;
  if (!input || !suggest) return;

  input.addEventListener('input', () => {
    const termo = (input.value || '').toLowerCase();
    if (!termo || termo.length < 2) {
      suggest.innerHTML = '';
      suggest.style.display = 'none';
      vendasState.clienteSelecionado = null;
      atualizarEstadoVenda();
      return;
    }

    const lista = vendasState.clientes.filter(c =>
      (c.nome || '').toLowerCase().includes(termo) ||
      (String(c.codigoFichario || '')).includes(termo) ||
      (c.cpf || '').toLowerCase().includes(termo)
    ).slice(0, 8);

    renderSugestoesClientes(lista);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      suggest.innerHTML = '';
      suggest.style.display = 'none';
    }, 200);
  });
}

function renderSugestoesClientes(lista) {
  const suggest = vendasEls.clienteRegistradoSuggest;
  if (!suggest) return;
  suggest.innerHTML = '';
  if (!lista || lista.length === 0) {
    suggest.style.display = 'none';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'suggest-list';

  lista.forEach(cli => {
    const li = document.createElement('li');
    li.className = 'suggest-item';
    let label = cli.nome;
    if (cli.codigoFichario) label += ` (Fichario: ${cli.codigoFichario})`;
    li.textContent = label;
    li.addEventListener('click', () => {
      vendasState.clienteSelecionado = cli;
      if (vendasEls.clienteRegistradoInput) vendasEls.clienteRegistradoInput.value = cli.nome;
      suggest.innerHTML = '';
      suggest.style.display = 'none';
      atualizarTotalCliente();
      atualizarEstadoVenda();
    });
    ul.appendChild(li);
  });

  suggest.appendChild(ul);
  suggest.style.display = 'block';
}

async function atualizarTotalCliente() {
  const tipo = vendasEls.tipoCliente?.value || '';
  if (tipo !== 'registrado' || !vendasState.clienteSelecionado) {
    if (vendasEls.totalCliente) vendasEls.totalCliente.textContent = 'Total: R$ 0,00';
    return;
  }

  try {
    const id = vendasState.clienteSelecionado.clientesId;
    const resp = await fetch(`/api/contas/total-cliente/${id}`);
    if (!resp.ok) throw new Error('fail');
    const data = await resp.json();
    const total = data.total || 0;
    if (vendasEls.totalCliente) vendasEls.totalCliente.textContent = `Total: ${formatarMoeda(total)}`;
  } catch (err) {
    console.error('Falha ao buscar total do cliente', err);
    if (vendasEls.totalCliente) vendasEls.totalCliente.textContent = 'Total: R$ 0,00';
  }
}

async function buscarProdutoRegistrado() {
  const valor = (vendasEls.produtoInput?.value || '').trim();
  if (!valor) return;

  let produto = null;
  if (/^\d+$/.test(valor)) {
    produto = await fetchProdutoPorCodigo(valor);
  }

  if (produto) {
    selecionarProduto(produto);
    return;
  }

  const lista = await fetchProdutosPorDescricao(valor);
  if (!lista || lista.length === 0) {
    alert('Produto nao encontrado.');
    return;
  }

  abrirModalProdutos(lista);
}

async function fetchProdutoPorCodigo(valor) {
  try {
    const resp = await fetch(`/api/produtos/busca-por-codigo/${encodeURIComponent(valor)}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function fetchProdutosPorDescricao(filtro) {
  try {
    const resp = await fetch(`/api/produtos/busca-por-descricao?filtro=${encodeURIComponent(filtro)}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : (data.items || []);
  } catch {
    return [];
  }
}

function abrirModalProdutos(lista) {
  if (!vendasEls.modalBackdrop || !vendasEls.modalTbody) return;

  vendasEls.modalTbody.innerHTML = '';
  vendasState.produtoSelecionado = null;

  lista.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.descricao || ''}</td>
      <td>${p.codigoBarras || ''}</td>
      <td>${p.codigoProduto || ''}</td>
      <td>${formatarMoeda(p.precoVenda || 0)}</td>
    `;
    tr.addEventListener('click', () => {
      vendasEls.modalTbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
      tr.classList.add('table-active');
      vendasState.produtoSelecionado = p;
    });
    if (idx === 0) {
      tr.classList.add('table-active');
      vendasState.produtoSelecionado = p;
    }
    vendasEls.modalTbody.appendChild(tr);
  });

  vendasEls.modalBackdrop.style.display = 'flex';
}

function fecharModalProdutos() {
  if (vendasEls.modalBackdrop) vendasEls.modalBackdrop.style.display = 'none';
}

function selecionarProduto(prod) {
  vendasState.produtoSelecionado = prod;
  if (vendasEls.produtoInput) vendasEls.produtoInput.value = prod.codigoBarras || prod.codigoProduto || '';
  if (vendasEls.quantidade) vendasEls.quantidade.value = '1';
  if (vendasEls.desconto) vendasEls.desconto.value = '0';
  vendasEls.quantidade?.focus();
}

function adicionarItemRegistrado() {
  if ((vendasEls.tipoProduto?.value || '') === 'avulso') return;
  if (!vendasState.produtoSelecionado) {
    alert('Selecione ou busque um produto.');
    return;
  }

  const qtd = Math.max(1, parseInt(vendasEls.quantidade?.value || '1', 10) || 1);
  const descontoInput = parseMoeda(vendasEls.desconto?.value || '0');
  const precoUnit = Number(vendasState.produtoSelecionado.precoVenda) || 0;
  const descontoValor = calcularDesconto(descontoInput, qtd, precoUnit);
  const totalBruto = qtd * precoUnit;
  const totalLiquido = Math.max(0, totalBruto - descontoValor);

  vendasState.itens.push({
    produtoId: vendasState.produtoSelecionado.produtosId,
    descricao: vendasState.produtoSelecionado.descricao,
    quantidade: qtd,
    precoUnit: precoUnit,
    desconto: descontoValor,
    total: totalLiquido
  });

  limparCamposProdutoRegistrado();
  atualizarGridItens();
  atualizarTotalVenda();
  atualizarEstadoVenda();
}

function adicionarItemAvulso() {
  if ((vendasEls.tipoProduto?.value || '') !== 'avulso') return;

  const nome = (vendasEls.produtoNomeAvulso?.value || '').trim();
  if (!nome || nome.length < 3) {
    alert('Informe o nome do produto avulso.');
    return;
  }

  const preco = parseMoeda(vendasEls.produtoPrecoAvulso?.value || '0');
  if (preco <= 0) {
    alert('Informe um preco valido.');
    return;
  }

  const qtd = Math.max(1, parseInt(vendasEls.quantidadeAvulso?.value || '1', 10) || 1);
  const descontoInput = parseMoeda(vendasEls.descontoAvulso?.value || '0');
  const descontoValor = calcularDesconto(descontoInput, qtd, preco);
  const totalBruto = qtd * preco;
  const totalLiquido = Math.max(0, totalBruto - descontoValor);

  vendasState.itens.push({
    produtoId: 0,
    descricao: nome.toUpperCase(),
    quantidade: qtd,
    precoUnit: preco,
    desconto: descontoValor,
    total: totalLiquido
  });

  limparCamposProdutoAvulso();
  atualizarGridItens();
  atualizarTotalVenda();
  atualizarEstadoVenda();
}

function limparCamposProdutoRegistrado() {
  vendasState.produtoSelecionado = null;
  if (vendasEls.produtoInput) vendasEls.produtoInput.value = '';
  if (vendasEls.quantidade) vendasEls.quantidade.value = '1';
  if (vendasEls.desconto) vendasEls.desconto.value = '0';
}

function limparCamposProdutoAvulso() {
  if (vendasEls.produtoNomeAvulso) vendasEls.produtoNomeAvulso.value = '';
  if (vendasEls.produtoPrecoAvulso) vendasEls.produtoPrecoAvulso.value = '0';
  if (vendasEls.quantidadeAvulso) vendasEls.quantidadeAvulso.value = '1';
  if (vendasEls.descontoAvulso) vendasEls.descontoAvulso.value = '0';
}

function atualizarGridItens() {
  const tbody = vendasEls.tabelaItensBody;
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!vendasState.itens.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" class="text-center text-muted">Nenhum item adicionado...</td>';
    tbody.appendChild(tr);
    return;
  }

  vendasState.itens.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.descricao || ''}</td>
      <td>${it.quantidade}</td>
      <td>${formatarMoeda(it.precoUnit || 0)}</td>
      <td>${formatarMoeda(it.desconto || 0)}</td>
      <td>${formatarMoeda(it.total || 0)}</td>
      <td><button class="btn-modern danger small" data-idx="${idx}">remover</button></td>
    `;
    tr.querySelector('button')?.addEventListener('click', () => {
      vendasState.itens.splice(idx, 1);
      atualizarGridItens();
      atualizarTotalVenda();
      atualizarEstadoVenda();
    });
    tbody.appendChild(tr);
  });
}

function atualizarTotalVenda() {
  const total = vendasState.itens.reduce((acc, it) => acc + (it.total || 0), 0);
  const totalEl = document.getElementById('vendas-total');
  if (totalEl) totalEl.textContent = formatarMoeda(total);
}

function atualizarEstadoVenda() {
  const tipoCliente = vendasEls.tipoCliente?.value || '';
  const tipoVenda = vendasEls.tipoVenda?.value || '';
  const vendedorOk = !!(vendasEls.vendedor?.value);
  const temItens = vendasState.itens.length > 0;

  let clienteOk = false;
  if (tipoCliente === 'registrado') {
    clienteOk = !!vendasState.clienteSelecionado;
  } else {
    const nome = (vendasEls.clienteAvulso?.value || '').trim();
    clienteOk = nome.length >= 3;
  }

  const pode = clienteOk && tipoVenda && vendedorOk && temItens;
  if (vendasEls.btnSell) vendasEls.btnSell.disabled = !pode;
}

function calcularDesconto(valorDigitado, quantidade, precoUnit) {
  const tipo = vendasEls.tipoDesconto?.value || 'porcentagem';
  const totalBruto = quantidade * precoUnit;
  if (tipo === 'fixo') {
    return Math.min(Math.max(valorDigitado, 0), totalBruto);
  }
  const perc = Math.max(valorDigitado, 0) / 100;
  return Math.min(totalBruto * perc, totalBruto);
}

function parseMoeda(v) {
  if (typeof v === 'number') return v;
  const clean = (v || '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

async function realizarVenda() {
  const tipoVenda = vendasEls.tipoVenda?.value || '';
  const tipoCliente = vendasEls.tipoCliente?.value || '';

  let clienteId = null;
  let clienteNome = null;
  if (tipoCliente === 'registrado') {
    if (!vendasState.clienteSelecionado) {
      alert('Selecione um cliente registrado.');
      return;
    }
    clienteId = vendasState.clienteSelecionado.clientesId;
  } else {
    const nome = (vendasEls.clienteAvulso?.value || '').trim();
    if (!nome || nome.length < 3) {
      alert('Informe o nome do cliente avulso.');
      return;
    }
    clienteNome = nome;
  }

  const vendedorId = parseInt(vendasEls.vendedor?.value || '0', 10);
  if (!vendedorId) {
    alert('Selecione o vendedor.');
    return;
  }

  if (!vendasState.itens.length) {
    alert('Adicione pelo menos um item.');
    return;
  }

  const payload = {
    tipoVenda,
    tipoCliente,
    clienteId,
    clienteNome,
    vendedorId,
    itens: vendasState.itens.map(it => ({
      produtoId: it.produtoId,
      descricao: it.descricao,
      quantidade: it.quantidade,
      precoUnit: it.precoUnit,
      desconto: it.desconto
    }))
  };

  try {
    const resp = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Falha ao registrar venda', txt);
      alert('Falha ao registrar venda.');
      return;
    }

    const respCupom = await fetch('/api/vendas/imprimir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (respCupom.ok) {
      const { cupomBase64 } = await respCupom.json();
      await enviarCupomParaPrintAgent(cupomBase64);
    } else {
      console.error('Venda salva, mas falha ao gerar cupom');
      alert('Venda registrada, mas falhou ao gerar cupom.');
    }

    vendasState.itens = [];
    vendasState.clienteSelecionado = null;
    if (vendasEls.clienteRegistradoInput) vendasEls.clienteRegistradoInput.value = '';
    if (vendasEls.clienteAvulso) vendasEls.clienteAvulso.value = '';
    limparCamposProdutoRegistrado();
    limparCamposProdutoAvulso();
    atualizarGridItens();
    atualizarTotalVenda();
    atualizarEstadoVenda();
  } catch (err) {
    console.error('Erro ao realizar venda', err);
    alert('Erro ao realizar venda.');
  }
}

async function enviarCupomParaPrintAgent(cupomBase64) {
  if (!cupomBase64) return;
  try {
    const resp = await fetch('http://localhost:5005/print/cupom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: cupomBase64 })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Falha ao enviar para impressora local', txt);
      alert('Cupom gerado, mas nao foi possivel enviar para impressora local.');
    }
  } catch (err) {
    console.error('Erro ao enviar cupom para printAgent', err);
    alert('Cupom gerado, mas nao foi possivel comunicar com a impressora local.');
  }
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
