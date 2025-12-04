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
  atualizarPreviewItem();
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

  // elementos da pré-visualização
  vendasEls.previewBlock = document.getElementById('vendas-preview-block');
  vendasEls.previewProduto = document.getElementById('preview-produto');
  vendasEls.previewPreco = document.getElementById('preview-preco');
  vendasEls.previewQtd = document.getElementById('preview-qtd');
  vendasEls.previewDesconto = document.getElementById('preview-desconto');
  vendasEls.previewTotal = document.getElementById('preview-total');
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
    atualizarPreviewItem();
  });

  vendasEls.tipoDesconto?.addEventListener('change', () => {
    atualizarLabelsDesconto();
    atualizarPreviewItem();
  });

  vendasEls.tipoVenda?.addEventListener('change', atualizarEstadoVenda);
  vendasEls.vendedor?.addEventListener('change', atualizarEstadoVenda);

  vendasEls.clienteAvulso?.addEventListener('input', atualizarEstadoVenda);
  initAutocompleteClientes();

  // PRODUTO REGISTRADO
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

  vendasEls.quantidade?.addEventListener('input', atualizarPreviewItem);
  vendasEls.desconto?.addEventListener('input', atualizarPreviewItem);

  vendasEls.btnAddItem?.addEventListener('click', adicionarItemRegistrado);

  // PRODUTO AVULSO - fluxo de Enter + preview
  vendasEls.produtoNomeAvulso?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      vendasEls.produtoPrecoAvulso?.focus();
    }
  });

  vendasEls.produtoPrecoAvulso?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      vendasEls.quantidadeAvulso?.focus();
    }
  });

  vendasEls.quantidadeAvulso?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      vendasEls.descontoAvulso?.focus();
    }
  });

  vendasEls.descontoAvulso?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      adicionarItemAvulso();
    }
  });

  vendasEls.produtoNomeAvulso?.addEventListener('input', atualizarPreviewItem);
  vendasEls.produtoPrecoAvulso?.addEventListener('input', atualizarPreviewItem);
  vendasEls.quantidadeAvulso?.addEventListener('input', atualizarPreviewItem);
  vendasEls.descontoAvulso?.addEventListener('input', atualizarPreviewItem);

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
    } catch (_) { }

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
    vendasEls.blocoClienteRegistrado?.setAttribute('style', 'display:none;');
    vendasEls.blocoClienteAvulso?.setAttribute('style', 'display:none;');
  }
  atualizarTotalCliente();
}

function atualizarBlocoProduto() {
  const tipo = vendasEls.tipoProduto?.value || '';
  if (tipo === 'registrado') {
    vendasEls.blocoProdutoRegistrado?.setAttribute('style', 'display:flex;');
    vendasEls.blocoProdutoAvulso?.setAttribute('style', 'display:none;');
  } else if (tipo === 'avulso') {
    vendasEls.blocoProdutoRegistrado?.setAttribute('style', 'display:none;');
    vendasEls.blocoProdutoAvulso?.setAttribute('style', 'display:flex;');
  } else {
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
    const lista = vendasState.clientes
      .filter(c => {
        const nome = (c.nome || '').toLowerCase();
        const fich = String(c.codigoFichario || '').toLowerCase();
        const cpf = (c.cpf || '').toLowerCase();
        return (nome.startsWith(termo) || fich.startsWith(termo) || cpf.startsWith(termo));
      })
      .slice(0, 8);
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
  atualizarPreviewItem();
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
  atualizarPreviewItem();
}

function limparCamposProdutoAvulso() {
  if (vendasEls.produtoNomeAvulso) vendasEls.produtoNomeAvulso.value = '';
  if (vendasEls.produtoPrecoAvulso) vendasEls.produtoPrecoAvulso.value = '0';
  if (vendasEls.quantidadeAvulso) vendasEls.quantidadeAvulso.value = '1';
  if (vendasEls.descontoAvulso) vendasEls.descontoAvulso.value = '0';
  atualizarPreviewItem();
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
      atualizarPreviewItem();
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
  } else if (tipoCliente === 'avulso') {
    const nome = (vendasEls.clienteAvulso?.value || '').trim();
    clienteOk = nome.length >= 3;
  }
  const pode = clienteOk && tipoVenda && vendedorOk && temItens;
  if (vendasEls.btnSell) vendasEls.btnSell.disabled = !pode;
}

function atualizarPreviewItem() {
  const tipoProduto = vendasEls.tipoProduto?.value || '';
  let nome = '';
  let precoUnit = 0;
  let qtd = 0;
  let descontoDigitado = 0;
  let descontoValor = 0;
  let totalBruto = 0;
  let totalLiquido = 0;

  if (tipoProduto === 'registrado' && vendasState.produtoSelecionado) {
    nome = vendasState.produtoSelecionado.descricao || '';
    precoUnit = Number(vendasState.produtoSelecionado.precoVenda) || 0;
    qtd = Math.max(1, parseInt(vendasEls.quantidade?.value || '1', 10) || 1);
    descontoDigitado = parseMoeda(vendasEls.desconto?.value || '0');
    descontoValor = calcularDesconto(descontoDigitado, qtd, precoUnit);
  } else if (tipoProduto === 'avulso') {
    nome = (vendasEls.produtoNomeAvulso?.value || '').trim();
    precoUnit = parseMoeda(vendasEls.produtoPrecoAvulso?.value || '0');
    qtd = Math.max(1, parseInt(vendasEls.quantidadeAvulso?.value || '1', 10) || 1);
    descontoDigitado = parseMoeda(vendasEls.descontoAvulso?.value || '0');
    descontoValor = calcularDesconto(descontoDigitado, qtd, precoUnit);
  } else {
    if (vendasEls.previewProduto) vendasEls.previewProduto.textContent = 'Nenhum item em edição...';
    if (vendasEls.previewPreco) vendasEls.previewPreco.textContent = formatarMoeda(0);
    if (vendasEls.previewQtd) vendasEls.previewQtd.textContent = '0';
    if (vendasEls.previewDesconto) vendasEls.previewDesconto.textContent = formatarMoeda(0);
    if (vendasEls.previewTotal) vendasEls.previewTotal.textContent = formatarMoeda(0);
    return;
  }
  totalBruto = qtd * precoUnit;
  totalLiquido = Math.max(0, totalBruto - descontoValor);

  if (vendasEls.previewProduto) vendasEls.previewProduto.textContent = nome || '---';
  if (vendasEls.previewPreco) vendasEls.previewPreco.textContent = formatarMoeda(precoUnit);
  if (vendasEls.previewQtd) vendasEls.previewQtd.textContent = String(qtd);
  if (vendasEls.previewDesconto) vendasEls.previewDesconto.textContent = formatarMoeda(descontoValor);
  if (vendasEls.previewTotal) vendasEls.previewTotal.textContent = formatarMoeda(totalLiquido);
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
  let s = (v || '').trim();
  if (!s) return 0;
  if (s.indexOf(',') >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  }
  return parseFloat(s) || 0;
}

async function realizarVenda() {
  const tipoVenda = (vendasEls.tipoVenda?.value || '').trim().toLowerCase();
  const tipoCliente = (vendasEls.tipoCliente?.value || '').trim().toLowerCase();
  const vendedorId = parseInt(vendasEls.vendedor?.value || '0', 10) || 0;

  if (!tipoVenda || (tipoVenda !== 'marcar' && tipoVenda !== 'dinheiro')) {
    alert('Selecione um tipo de venda válido.');
    return;
  }
  if (!tipoCliente || (tipoCliente !== 'registrado' && tipoCliente !== 'avulso')) {
    alert('Selecione um tipo de cliente válido.');
    return;
  }
  if (!vendedorId) {
    alert('Selecione o vendedor.');
    return;
  }
  if (!vendasState.itens.length) {
    alert('Adicione ao menos um item à venda.');
    return;
  }

  let clienteId = null;
  let clienteNome = null;

  if (tipoCliente === 'registrado') {
    if (!vendasState.clienteSelecionado) {
      alert('Selecione o cliente registrado.');
      return;
    }
    clienteId = vendasState.clienteSelecionado.clientesId;
  } else if (tipoCliente === 'avulso') {
    const nome = (vendasEls.clienteAvulso?.value || '').trim();
    if (!nome) {
      alert('Informe o nome do cliente avulso.');
      return;
    }
    clienteNome = nome;
  }

  const payload = {
    tipoVenda,
    tipoCliente,
    vendedorId,
    clienteId,
    clienteNome,
    itens: vendasState.itens.map(it => ({
      produtoId: it.produtoId,
      descricao: it.descricao,
      quantidade: it.quantidade,
      precoUnit: it.precoUnit,
      desconto: it.desconto
    }))
  };

  if (vendasEls.btnSell) {
    vendasEls.btnSell.disabled = true;
    vendasEls.btnSell.textContent = 'Processando...';
  }

  try {
    // 1) registra a venda no banco
    const resp = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      alert('Erro ao registrar venda.\n' + (txt || ''));
      return;
    }

    const data = await resp.json();
    const mensagem = data.message || 'Venda registrada com sucesso.';
    const totalNum = typeof data.total === 'number' ? data.total : null;
    const totalFmt = totalNum !== null ? formatarMoeda(totalNum) : '';

    alert(totalFmt ? `${mensagem}\nTotal: ${totalFmt}` : mensagem);

    // 2) pergunta se deseja imprimir cupom
    let desejaImprimir = confirm('Deseja imprimir o cupom desta venda agora?');

    while (desejaImprimir) {
      // Pede o Base64 pro servidor (backend)
      const respImp = await fetch('/api/vendas/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!respImp.ok) {
        const txtImp = await respImp.text();
        alert('Erro ao gerar cupom.\n' + (txtImp || ''));
        break;
      }

      const dataImp = await respImp.json();
      const base64 = dataImp.cupomBase64;
      if (!base64) {
        alert('Cupom não retornado pelo servidor.');
        break;
      }

      // Envia o Base64 para o Agente Local (localhost:5005)
      const okPrint = await enviarCupomParaPrintAgent(base64);
      if (!okPrint) break;

      desejaImprimir = confirm('Cupom enviado para impressão.\nImprimir novamente?');
    }

    // 3) limpa itens da venda e atualiza tela
    vendasState.itens = [];
    vendasState.produtoSelecionado = null;
    atualizarGridItens();
    atualizarTotalVenda();
    atualizarPreviewItem();
    atualizarEstadoVenda();
  } catch (err) {
    console.error('Falha ao realizar venda', err);
    alert('Erro inesperado ao realizar venda. Verifique a conexão e tente novamente.');
  } finally {
    if (vendasEls.btnSell) {
      vendasEls.btnSell.disabled = false;
      vendasEls.btnSell.textContent = '✏️ Realizar venda';
    }
  }
}

async function enviarCupomParaPrintAgent(cupomBase64) {
  try {
    // Usando o endpoint dedicado /print/cupom que definimos no PrintAgent
    const resp = await fetch('http://localhost:5005/print/cupom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: cupomBase64, printerName: null })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      alert('Erro ao enviar cupom para impressora local.\n' + (txt || ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao conectar com PrintAgent', err);
    alert('Erro ao conectar com o serviço de impressão local (PrintAgent).\nVerifique se o serviço está rodando na porta 5005 deste computador.');
    return false;
  }
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}