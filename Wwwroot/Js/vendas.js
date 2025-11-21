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

// elementos
let vendasTipoVendaEl;
let vendasTipoClienteEl;
let vendasClienteAvulsoNomeEl;
let vendasClienteRegistradoInputEl;
let vendasClienteRegistradoSuggestEl;
let vendasVendedorEl;
let vendasTotalEl;

let vendasProdutoInputEl;
let vendasProdutoNomeEl;
let vendasProdutoTipoEl;
let vendasProdutoDescricaoEl;
let vendasProdutoQtdEl;
let vendasProdutoDescontoEl;
let vendasProdutoPrecoEl;
let vendasBtnAddItemEl;
let vendasGridItensEl;
let vendasTotalClienteEl;

let vendasModalProdutoEl;
let vendasModalProdutoTableBodyEl;
let vendasModalProdutoBtnConfirmarEl;
let vendasModalProdutoBtnFecharEl;

let vendasBtnConfirmarVendaEl;
let vendasBtnImprimirEl;

// modal de busca de produto
let vendasModalBuscaProdutoEl;
let vendasBuscaProdutoInputEl;
let vendasBuscaProdutoGridEl;
let vendasBuscaProdutoBtnFecharEl;

// inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await vendasInit();
});

async function vendasInit() {
  // pega elementos
  vendasTipoVendaEl = document.getElementById('tipo-venda');
  vendasTipoClienteEl = document.getElementById('tipo-cliente');
  vendasClienteAvulsoNomeEl = document.getElementById('cliente-avulso-nome');
  vendasClienteRegistradoInputEl = document.getElementById('cliente-registrado-input');
  vendasClienteRegistradoSuggestEl = document.getElementById('cliente-registrado-suggest');
  vendasVendedorEl = document.getElementById('vendedor');
  vendasTotalEl = document.getElementById('vendas-total');

  vendasProdutoInputEl = document.getElementById('produto-input');
  vendasProdutoNomeEl = document.getElementById('produto-nome');
  vendasProdutoTipoEl = document.getElementById('produto-tipo');
  vendasProdutoDescricaoEl = document.getElementById('produto-descricao');
  vendasProdutoQtdEl = document.getElementById('produto-qtd');
  vendasProdutoDescontoEl = document.getElementById('produto-desconto');
  vendasProdutoPrecoEl = document.getElementById('produto-preco');
  vendasBtnAddItemEl = document.getElementById('btn-add-item');
  vendasGridItensEl = document.getElementById('grid-itens-venda');
  vendasTotalClienteEl = document.getElementById('total-cliente');

  vendasModalProdutoEl = document.getElementById('modal-produto');
  vendasModalProdutoTableBodyEl = document.querySelector('#modal-produto tbody');
  vendasModalProdutoBtnConfirmarEl = document.getElementById('modal-produto-confirmar');
  vendasModalProdutoBtnFecharEl = document.getElementById('modal-produto-fechar');

  vendasBtnConfirmarVendaEl = document.getElementById('btn-confirmar-venda');
  vendasBtnImprimirEl = document.getElementById('btn-imprimir');

  vendasModalBuscaProdutoEl = document.getElementById('modal-busca-produto');
  vendasBuscaProdutoInputEl = document.getElementById('busca-produto-input');
  vendasBuscaProdutoGridEl = document.getElementById('grid-busca-produto');
  vendasBuscaProdutoBtnFecharEl = document.getElementById('modal-busca-produto-fechar');

  // carrega clientes e vendedores
  await carregarClientes();
  await carregarVendedores();

  // listeners básicos
  vendasTipoVendaEl?.addEventListener('change', () => {
    atualizarStateBotaoVenda();
  });

  vendasTipoClienteEl?.addEventListener('change', () => {
    atualizarTipoCliente();
    atualizarStateBotaoVenda();
  });

  vendasClienteAvulsoNomeEl?.addEventListener('input', () => {
    atualizarStateBotaoVenda();
  });

  // autocomplete de cliente
  initAutocompleteCliente();

  // fluxo de produto / ENTER / modal
  initFluxoProduto();

  // botões de venda
  vendasBtnAddItemEl?.addEventListener('click', () => {
    adicionarItemVenda();
  });

  vendasBtnConfirmarVendaEl?.addEventListener('click', () => {
    realizarVenda(false);
  });

  vendasBtnImprimirEl?.addEventListener('click', () => {
    realizarVenda(true);
  });

  // modal de busca de produto (atalho tipo F2 / botão)
  initModalBuscaProduto();

  // estado inicial
  atualizarTipoCliente();
  atualizarGridItens();
  atualizarTotalVenda();
  atualizarStateBotaoVenda();
}

/* =========================================================
   CARREGAMENTO DE CLIENTES / VENDEDORES
   ========================================================= */
async function carregarClientes() {
  try {
    const resp = await fetch('/api/clientes');
    if (!resp.ok) {
      console.error('Falha ao carregar clientes');
      return;
    }

    const data = await resp.json();

    // A API retorna objeto paginado { total, page, pageSize, items }
    // Garantimos que vendasClientesTodos seja sempre um array
    const lista = Array.isArray(data) ? data : (data.items || []);

    vendasClientesTodos = lista;
  } catch (e) {
    console.error('Erro ao carregar clientes', e);
    vendasClientesTodos = [];
  }
}

async function carregarVendedores() {
  try {
    const resp = await fetch('/api/funcionarios');
    if (!resp.ok) {
      console.error('Falha ao carregar vendedores');
      return;
    }

    const data = await resp.json();
    const select = vendasVendedorEl;
    if (!select) return;

    // A API também é paginada aqui
    const lista = Array.isArray(data) ? data : (data.items || []);

    select.innerHTML = '<option value="">Selecione...</option>';
    lista.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.funcionariosId;
      opt.textContent = v.nome;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error('Erro ao carregar vendedores', e);
  }
}

/* =========================================================
   FLUXO DO CLIENTE
   ========================================================= */
function atualizarTipoCliente() {
  const tipo = vendasTipoClienteEl?.value || 'avulso';

  const blocoAvulso = document.getElementById('bloco-cliente-avulso');
  const blocoRegistrado = document.getElementById('bloco-cliente-registrado');

  if (tipo === 'avulso') {
    blocoAvulso?.classList.remove('d-none');
    blocoRegistrado?.classList.add('d-none');
  } else {
    blocoAvulso?.classList.add('d-none');
    blocoRegistrado?.classList.remove('d-none');
  }

  // zera cliente selecionado se mudar o tipo
  vendasClienteSelecionado = null;
  if (vendasClienteRegistradoInputEl) vendasClienteRegistradoInputEl.value = '';
  if (vendasClienteRegistradoSuggestEl) vendasClienteRegistradoSuggestEl.innerHTML = '';
  atualizarStateBotaoVenda();
}

function initAutocompleteCliente() {
  const cliInput = vendasClienteRegistradoInputEl;
  const cliSuggest = vendasClienteRegistradoSuggestEl;
  cliInput?.addEventListener('input', () => {
    const txt = (cliInput.value || '').toLowerCase();
    const lista = vendasClientesTodos.filter(c =>
      c.nome.toLowerCase().includes(txt) ||
      (c.cpf || '').toLowerCase().includes(txt) ||
      (c.cnpj || '').toLowerCase().includes(txt) ||
      (String(c.codigoFichario || '')).includes(txt)
    );

    renderSuggestClientes(lista.slice(0, 10));
  });

  cliInput?.addEventListener('blur', () => {
    setTimeout(() => {
      if (vendasClienteRegistradoSuggestEl) vendasClienteRegistradoSuggestEl.innerHTML = '';
    }, 200);
  });
}

function renderSuggestClientes(lista) {
  const cliSuggest = vendasClienteRegistradoSuggestEl;
  if (!cliSuggest) return;

  cliSuggest.innerHTML = '';
  if (!lista || lista.length === 0) return;

  const ul = document.createElement('ul');
  ul.className = 'suggest-list';

  lista.forEach(c => {
    const li = document.createElement('li');
    let label = c.nome;
    if (c.codigoFichario) {
      label += ` (Fichário: ${c.codigoFichario})`;
    }
    if (c.cpf) {
      label += ` - CPF: ${c.cpf}`;
    }
    li.textContent = label;

    li.addEventListener('click', () => {
      vendasClienteSelecionado = c;
      if (vendasClienteRegistradoInputEl) vendasClienteRegistradoInputEl.value = c.nome;
      cliSuggest.innerHTML = '';
      atualizarTotalCliente();
      atualizarStateBotaoVenda();
    });

    ul.appendChild(li);
  });

  cliSuggest.appendChild(ul);
}

async function atualizarTotalCliente() {
  try {
    const tipoCliente = vendasTipoClienteEl?.value || 'avulso';

    if (tipoCliente !== 'registrado' || !vendasClienteSelecionado) {
      if (vendasTotalClienteEl) vendasTotalClienteEl.textContent = 'R$ 0,00';
      return;
    }

    const resp = await fetch(`/api/contas/total-cliente/${vendasClienteSelecionado.clientesId}`);
    if (!resp.ok) {
      console.error('Falha ao carregar total do cliente');
      if (vendasTotalClienteEl) vendasTotalClienteEl.textContent = 'R$ 0,00';
      return;
    }

    const data = await resp.json();
    const total = data.total || 0;
    if (vendasTotalClienteEl) vendasTotalClienteEl.textContent = formatarMoeda(total);
  } catch (e) {
    console.error('Erro ao carregar total do cliente', e);
    if (vendasTotalClienteEl) vendasTotalClienteEl.textContent = 'R$ 0,00';
  }
}

/* =========================================================
   FLUXO DO PRODUTO / MODAL
   ========================================================= */
function initFluxoProduto() {
  if (!vendasProdutoInputEl) return;

  vendasProdutoInputEl.addEventListener('keydown', async (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      await buscarProdutoPorCodigoOuDescricao();
    }
  });

  vendasProdutoQtdEl?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      vendasProdutoDescontoEl?.focus();
    }
  });

  vendasProdutoDescontoEl?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      adicionarItemVenda();
    }
  });
}

async function buscarProdutoPorCodigoOuDescricao() {
  const valor = (vendasProdutoInputEl?.value || '').trim();
  if (!valor) return;

  // se for só número, tenta direto o código de barras ou ID
  if (/^\d+$/.test(valor)) {
    const resp = await fetch(`/api/produtos/busca-por-codigo/${encodeURIComponent(valor)}`);
    if (resp.ok) {
      const prod = await resp.json();
      if (prod) {
        selecionarProduto(prod);
        return;
      }
    }
  }

  // caso contrário, abre modal de busca por descrição (o back já faz o filtro)
  await abrirModalProdutos(valor);
}

function selecionarProduto(prod) {
  vendasProdutoSelecionado = prod;

  if (vendasProdutoNomeEl) vendasProdutoNomeEl.value = prod.descricao || '';
  if (vendasProdutoTipoEl) vendasProdutoTipoEl.value = prod.tipo || '';
  if (vendasProdutoDescricaoEl) vendasProdutoDescricaoEl.value = prod.observacao || '';
  if (vendasProdutoPrecoEl) vendasProdutoPrecoEl.value = formatarMoeda(prod.precoVenda || 0);
  if (vendasProdutoQtdEl) vendasProdutoQtdEl.value = '1';
  if (vendasProdutoDescontoEl) vendasProdutoDescontoEl.value = '0,00';

  vendasProdutoQtdEl?.focus();
}

async function abrirModalProdutos(filtroDescricao) {
  if (!vendasModalProdutoEl || !vendasModalProdutoTableBodyEl) return;

  try {
    const resp = await fetch(`/api/produtos/busca-por-descricao?filtro=${encodeURIComponent(filtroDescricao)}`);
    if (!resp.ok) {
      console.error('Falha ao buscar produtos');
      return;
    }

    const data = await resp.json();
    const itens = Array.isArray(data) ? data : (data.items || []);

    vendasModalProdutoTableBodyEl.innerHTML = '';
    itens.forEach(prod => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.codigoProduto || ''}</td>
        <td>${prod.descricao || ''}</td>
        <td>${prod.tipo || ''}</td>
        <td>${formatarMoeda(prod.precoVenda || 0)}</td>
      `;
      tr.addEventListener('click', () => {
        vendasModalProdutoTableBodyEl.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        tr.classList.add('table-active');
        vendasProdutoSelecionado = prod;
      });
      vendasModalProdutoTableBodyEl.appendChild(tr);
    });

    // abrir modal (bootstrap)
    const bsModal = bootstrap.Modal.getOrCreateInstance(vendasModalProdutoEl);
    vendasModalProdutoBtnConfirmarEl?.addEventListener('click', () => {
      if (!vendasProdutoSelecionado) return;
      selecionarProduto(vendasProdutoSelecionado);
      bsModal.hide();
    });

    vendasModalProdutoBtnFecharEl?.addEventListener('click', () => {
      bsModal.hide();
    });

    bsModal.show();
  } catch (e) {
    console.error('Erro ao abrir modal de produtos', e);
  }
}

/* =========================================================
   MODAL DE BUSCA DE PRODUTO (LISTA COMPLETA)
   ========================================================= */
function initModalBuscaProduto() {
  const btnAbrir = document.getElementById('btn-busca-produto');
  if (!btnAbrir || !vendasModalBuscaProdutoEl) return;

  btnAbrir.addEventListener('click', async () => {
    await abrirModalBuscaProduto();
  });

  vendasBuscaProdutoBtnFecharEl?.addEventListener('click', () => {
    const bsModal = bootstrap.Modal.getOrCreateInstance(vendasModalBuscaProdutoEl);
    bsModal.hide();
  });

  vendasBuscaProdutoInputEl?.addEventListener('input', () => {
    filtrarGridBuscaProduto();
  });
}

async function abrirModalBuscaProduto() {
  if (!vendasModalBuscaProdutoEl || !vendasBuscaProdutoGridEl) return;

  try {
    const resp = await fetch('/api/produtos/lista-basica');
    if (!resp.ok) {
      console.error('Falha ao carregar lista de produtos');
      return;
    }

    const data = await resp.json();
    const itens = Array.isArray(data) ? data : (data.items || []);

    vendasBuscaProdutoGridEl.innerHTML = '';
    itens.forEach(prod => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.codigoProduto || ''}</td>
        <td>${prod.descricao || ''}</td>
        <td>${prod.tipo || ''}</td>
        <td>${formatarMoeda(prod.precoVenda || 0)}</td>
      `;
      tr.addEventListener('click', () => {
        vendasProdutoSelecionado = prod;
        selecionarProduto(prod);
        const bsModal = bootstrap.Modal.getOrCreateInstance(vendasModalBuscaProdutoEl);
        bsModal.hide();
      });
      vendasBuscaProdutoGridEl.appendChild(tr);
    });

    const bsModal = bootstrap.Modal.getOrCreateInstance(vendasModalBuscaProdutoEl);
    bsModal.show();
  } catch (e) {
    console.error('Erro ao abrir modal de busca de produto', e);
  }
}

function filtrarGridBuscaProduto() {
  if (!vendasBuscaProdutoGridEl || !vendasBuscaProdutoInputEl) return;

  const filtro = (vendasBuscaProdutoInputEl.value || '').toLowerCase();
  vendasBuscaProdutoGridEl.querySelectorAll('tr').forEach(tr => {
    const texto = (tr.textContent || '').toLowerCase();
    tr.style.display = texto.includes(filtro) ? '' : 'none';
  });
}

/* =========================================================
   ITENS DA VENDA / GRID
   ========================================================= */
function adicionarItemVenda() {
  if (!vendasProdutoSelecionado) {
    alert('Selecione um produto primeiro.');
    return;
  }

  const qtd = parseInt((vendasProdutoQtdEl?.value || '1').replace(/\D/g, ''), 10) || 1;
  let descStr = vendasProdutoDescontoEl?.value || '0';
  descStr = descStr.replace(/\./g, '').replace(',', '.');
  const desconto = parseFloat(descStr) || 0;

  const precoVenda = vendasProdutoSelecionado.precoVenda || 0;
  const totalBruto = qtd * precoVenda;
  let totalLiquido = totalBruto - desconto;
  if (totalLiquido < 0) totalLiquido = 0;

  vendasItens.push({
    produtoId: vendasProdutoSelecionado.produtosId,
    descricao: vendasProdutoSelecionado.descricao,
    quantidade: qtd,
    precoUnit: precoVenda,
    desconto: desconto,
    total: totalLiquido
  });

  // limpa campos de produto
  if (vendasProdutoInputEl) vendasProdutoInputEl.value = '';
  if (vendasProdutoNomeEl) vendasProdutoNomeEl.value = '';
  if (vendasProdutoTipoEl) vendasProdutoTipoEl.value = '';
  if (vendasProdutoDescricaoEl) vendasProdutoDescricaoEl.value = '';
  if (vendasProdutoQtdEl) vendasProdutoQtdEl.value = '1';
  if (vendasProdutoDescontoEl) vendasProdutoDescontoEl.value = '0,00';
  if (vendasProdutoPrecoEl) vendasProdutoPrecoEl.value = 'R$ 0,00';
  vendasProdutoSelecionado = null;

  atualizarGridItens();
  atualizarTotalVenda();
  atualizarStateBotaoVenda();

  vendasProdutoInputEl?.focus();
}

function atualizarGridItens() {
  if (!vendasGridItensEl) return;

  vendasGridItensEl.innerHTML = '';

  if (!vendasItens || vendasItens.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="text-muted text-center" style="font-size:.8rem;">Nenhum item adicionado</td>`;
    vendasGridItensEl.appendChild(tr);
    return;
  }

  vendasItens.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${it.descricao || ''}</td>
      <td>${it.quantidade}</td>
      <td>${formatarMoeda(it.precoUnit || 0)}</td>
      <td>${formatarMoeda(it.desconto || 0)}</td>
      <td>${formatarMoeda(it.total || 0)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-link text-danger" data-idx="${idx}">remover</button>
      </td>
    `;

    const btnRemover = tr.querySelector('button[data-idx]');
    btnRemover?.addEventListener('click', () => {
      const index = parseInt(btnRemover.getAttribute('data-idx'), 10);
      if (!isNaN(index)) {
        vendasItens.splice(index, 1);
        atualizarGridItens();
        atualizarTotalVenda();
        atualizarStateBotaoVenda();
      }
    });

    vendasGridItensEl.appendChild(tr);
  });
}

function atualizarTotalVenda() {
  const total = vendasItens.reduce((acc, it) => acc + (it.total || 0), 0);
  if (vendasTotalEl) vendasTotalEl.textContent = formatarMoeda(total);
}

/* =========================================================
   CONFIRMAR VENDA / IMPRIMIR
   ========================================================= */
function atualizarStateBotaoVenda() {
  const tipoVenda = vendasTipoVendaEl?.value || 'dinheiro';
  const tipoCliente = vendasTipoClienteEl?.value || 'avulso';

  let clienteOk = false;

  if (tipoCliente === 'avulso') {
    const nome = (vendasClienteAvulsoNomeEl?.value || '').trim();
    clienteOk = nome.length >= 3;
  } else {
    clienteOk = !!vendasClienteSelecionado;
  }

  const vendedorSelecionado = vendasVendedorEl?.value || '';
  const temItens = vendasItens.length > 0;

  const podeVender = clienteOk && vendedorSelecionado && temItens;

  if (vendasBtnConfirmarVendaEl) vendasBtnConfirmarVendaEl.disabled = !podeVender;
  if (vendasBtnImprimirEl) vendasBtnImprimirEl.disabled = !podeVender;
}

async function realizarVenda(apenasImprimir) {
  const tipoVenda = vendasTipoVendaEl?.value || 'dinheiro';
  const tipoCliente = vendasTipoClienteEl?.value || 'avulso';

  let clienteId = null;
  let clienteNome = null;

  if (tipoCliente === 'avulso') {
    const nome = (vendasClienteAvulsoNomeEl?.value || '').trim();
    if (!nome || nome.length < 3) {
      alert('Informe o nome do cliente avulso (mínimo 3 caracteres).');
      return;
    }
    clienteNome = nome;
  } else {
    if (!vendasClienteSelecionado) {
      alert('Selecione um cliente registrado.');
      return;
    }
    clienteId = vendasClienteSelecionado.clientesId;
  }

  const vendedorId = parseInt((vendasVendedorEl?.value || '0'), 10);
  if (!vendedorId) {
    alert('Selecione um vendedor.');
    return;
  }

  if (!vendasItens || vendasItens.length === 0) {
    alert('Adicione pelo menos um item na venda.');
    return;
  }

  const itensPayload = vendasItens.map(it => ({
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
    itens: itensPayload
  };

  try {
    if (!apenasImprimir) {
      const resp = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const erroTxt = await resp.text();
        console.error('Falha ao registrar venda', erroTxt);
        alert('Falha ao registrar venda.');
        return;
      }

      const data = await resp.json();
      console.log('Venda registrada:', data);
    }

    const respCupom = await fetch('/api/vendas/imprimir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!respCupom.ok) {
      console.error('Falha ao gerar cupom');
      alert('Venda registrada, mas falhou ao gerar cupom.');
      return;
    }

    const { cupomBase64 } = await respCupom.json();
    await enviarCupomParaPrintAgent(cupomBase64);

    // limpa venda atual
    vendasItens = [];
    vendasClienteSelecionado = null;
    if (vendasClienteRegistradoInputEl) vendasClienteRegistradoInputEl.value = '';
    if (vendasClienteRegistradoSuggestEl) vendasClienteRegistradoSuggestEl.innerHTML = '';
    if (vendasClienteAvulsoNomeEl) vendasClienteAvulsoNomeEl.value = '';

    atualizarGridItens();
    atualizarTotalVenda();
    atualizarTotalCliente();
    atualizarStateBotaoVenda();
  } catch (e) {
    console.error('Erro ao realizar venda', e);
    alert('Erro ao realizar venda.');
  }
}

/* =========================================================
   ENVIO AO PRINTAGENT (IMPRESSÃO LOCAL)
   ========================================================= */
async function enviarCupomParaPrintAgent(cupomBase64) {
  try {
    // cada máquina cliente roda seu próprio printAgent em localhost:5101 (por exemplo)
    const resp = await fetch('http://localhost:5101/api/print/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudoBase64: cupomBase64 })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Falha ao enviar cupom para printAgent', txt);
      alert('Venda registrada, mas falhou ao enviar para impressora local.');
      return;
    }

    console.log('Cupom enviado para impressão local com sucesso.');
  } catch (e) {
    console.error('Erro ao enviar cupom para printAgent', e);
    alert('Venda registrada, mas não foi possível comunicar com a impressora local.');
  }
}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}
