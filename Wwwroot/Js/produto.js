// /js/produto.js

let produtoSelecionado = null;
// dataset completo vindo do back
let todosProdutos = [];
let produtosFiltrados = [];

// paginação no front
let produtosPaginaAtual = 1;
let produtosPageSize = 50;
let produtosTotal = 0;

// inicial
carregarProdutos();

/* ========== CARREGAR LISTA PAGINADA ========== */
async function carregarProdutos() {
  // busca todos os produtos (pede uma página grande) e filtra no front
  const resp = await fetch('/api/produtos?pageSize=100000');
  const tbody = document.querySelector('#tb-produtos tbody');

  if (!resp.ok) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar produtos</td></tr>`;
    }
    return;
  }

  const data = await resp.json();
  const itens = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);

  todosProdutos = itens;
  aplicarFiltroProdutos();
  const btnNew = document.getElementById('btn-new');
  if (btnNew) btnNew.disabled = false;
}

/* ========== FILTRO POR COLUNA (local) ========== */
function aplicarFiltroProdutos() {
  const col = document.getElementById('filter-column')?.value || 'descricao';
  let txt = (document.getElementById('filter-text')?.value || '').trim().toLowerCase();

  // normaliza busca para cada coluna
  if (col === 'codigoBarras') {
    // apenas dígitos para comparar código de barras
    txt = txt.replace(/\D+/g, '');
  }

  if (!txt) {
    produtosFiltrados = [...todosProdutos];
  } else {
    produtosFiltrados = todosProdutos.filter(p => {
      const valor = pegarValorColunaProduto(p, col);
      return valor.includes(txt);
    });
  }

  produtosPaginaAtual = 1;
  renderTabela();
  atualizarPaginacaoProdutos();
}

function pegarValorColunaProduto(p, col) {
  const s = (v) => (v ?? '').toString().toLowerCase();
  switch (col) {
    case 'codigoBarras':
      return s(p.codigoBarras).replace(/\D+/g, '');
    case 'generico':
      return s(p.generico);
    case 'descricao':
    default:
      // remove sequências numéricas longas (ex.: código de barras embutido)
      return s(p.descricao).replace(/\d{7,}/g, '');
  }
}

/* ========== RENDER TABELA (com paginação local) ========== */
function renderTabela() {
  const tbody = document.querySelector('#tb-produtos tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!produtosFiltrados || produtosFiltrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum produto encontrado.</td></tr>`;
    produtoSelecionado = null;
    toggleAcoes(true);
    return;
  }

  const inicio = (produtosPaginaAtual - 1) * produtosPageSize;
  const fim = inicio + produtosPageSize;
  const pagina = produtosFiltrados.slice(inicio, fim);

  pagina.forEach(c => {
    const tr = document.createElement('tr');

    const produtoData = {
      id: c.produtosId ?? c.produtosID ?? c.id ?? '',
      descricao: c.descricao ?? '',
      unidadeMedida: c.unidadeMedida ?? '',
      precoCompra: c.precoCompra ?? '',
      precoVenda: c.precoVenda ?? '',
      localizacao: c.localizacao ?? '',
      laboratorio: c.laboratorio ?? '',
      principio: c.principio ?? '',
      generico: c.generico ?? '',
      codigoProduto: c.codigoProduto ?? '',
      codigoBarras: c.codigoBarras ?? '',
      deletadoBool: !!c.deletado
    };

    tr.innerHTML = `
      <td>${produtoData.codigoBarras}</td>
      <td>${produtoData.descricao}</td>
      <td>${produtoData.precoCompra}</td>
      <td>${produtoData.precoVenda}</td>
      <td>${produtoData.generico}</td>
    `;

    tr.addEventListener('click', () => {
      document.querySelectorAll('#tb-produtos tbody tr').forEach(row => {
        row.classList.remove('selected');
      });
      tr.classList.add('selected');
      produtoSelecionado = produtoData;
      toggleAcoes(false);
    });

    tbody.appendChild(tr);
  });

  produtoSelecionado = null;
  toggleAcoes(true);
}

function toggleAcoes(disabled) {
  const btnView = document.getElementById('btn-view');
  const btnEdit = document.getElementById('btn-edit');
  const btnDelete = document.getElementById('btn-delete');

  if (btnView) btnView.disabled = disabled;
  if (btnEdit) btnEdit.disabled = disabled;
  if (btnDelete) btnDelete.disabled = disabled;
}

/* ========== PAGINAÇÃO ========== */
function atualizarPaginacaoProdutos() {
  const info = document.getElementById('produtos-pg-info');
  const btnPrev = document.getElementById('produtos-pg-prev');
  const btnNext = document.getElementById('produtos-pg-next');

  const total = produtosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / produtosPageSize));

  if (info) {
    if (total === 0) {
      info.textContent = 'Nenhum registro';
    } else {
      const inicio = (produtosPaginaAtual - 1) * produtosPageSize + 1;
      const fim = Math.min(produtosPaginaAtual * produtosPageSize, total);
      info.textContent = `Mostrando ${inicio}-${fim} de ${total} (pág. ${produtosPaginaAtual} de ${totalPaginas})`;
    }
  }

  if (btnPrev) {
    const disabled = produtosPaginaAtual <= 1;
    btnPrev.disabled = disabled;
    btnPrev.classList.toggle('is-disabled', disabled);
  }

  if (btnNext) {
    const disabled = produtosPaginaAtual >= totalPaginas;
    btnNext.disabled = disabled;
    btnNext.classList.toggle('is-disabled', disabled);
  }
}

document.getElementById('produtos-pg-prev')?.addEventListener('click', () => {
  const totalPaginas = Math.max(1, Math.ceil(produtosFiltrados.length / produtosPageSize));
  if (produtosPaginaAtual > 1) {
    produtosPaginaAtual--;
    renderTabela();
    atualizarPaginacaoProdutos();
  }
});
document.getElementById('produtos-pg-next')?.addEventListener('click', () => {
  const totalPaginas = Math.max(1, Math.ceil(produtosFiltrados.length / produtosPageSize));
  if (produtosPaginaAtual < totalPaginas) {
    produtosPaginaAtual++;
    renderTabela();
    atualizarPaginacaoProdutos();
  }
});

/* ========== VISUALIZAR ========== */
document.getElementById('btn-view')?.addEventListener('click', () => {
  if (!produtoSelecionado) return;
  const b = document.getElementById('produto-modal-backdrop');
  if (!b) return;

  document.getElementById('m-codigoBarras').textContent = produtoSelecionado.codigoBarras || '';
  document.getElementById('m-descricao').textContent = produtoSelecionado.descricao || '';
  document.getElementById('m-unidadeMedida').textContent = produtoSelecionado.unidadeMedida || '';
  document.getElementById('m-precoCompra').textContent = produtoSelecionado.precoCompra || '';
  document.getElementById('m-precoVenda').textContent = produtoSelecionado.precoVenda || '';
  document.getElementById('m-localizacao').textContent = produtoSelecionado.localizacao || '';
  document.getElementById('m-laboratorio').textContent = produtoSelecionado.laboratorio || '';
  document.getElementById('m-principio').textContent = produtoSelecionado.principio || '';
  document.getElementById('m-generico').textContent = produtoSelecionado.generico || '';

  b.classList.add('show');
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.onclick = () => b.classList.remove('show');
  b.onclick = (e) => { if (e.target === b) b.classList.remove('show'); };
});

/* ========== EDITAR ========== */
document.getElementById('btn-edit')?.addEventListener('click', () => {
  if (!produtoSelecionado) return;
  const b = document.getElementById('produto-edit-backdrop');
  if (!b) return;

  document.getElementById('e-id').value = produtoSelecionado.id || '';
  document.getElementById('e-codigoBarras').value = produtoSelecionado.codigoBarras || '';
  document.getElementById('e-descricao').value = produtoSelecionado.descricao || '';
  document.getElementById('e-unidadeMedida').value = produtoSelecionado.unidadeMedida || '';
  document.getElementById('e-precoCompra').value = produtoSelecionado.precoCompra || '';
  document.getElementById('e-precoVenda').value = produtoSelecionado.precoVenda || '';
  document.getElementById('e-localizacao').value = produtoSelecionado.localizacao || '';
  document.getElementById('e-laboratorio').value = produtoSelecionado.laboratorio || '';
  document.getElementById('e-principio').value = produtoSelecionado.principio || '';
  document.getElementById('e-generico').value = produtoSelecionado.generico || '';

  b.classList.add('show');
  document.getElementById('edit-close-btn').onclick = () => b.classList.remove('show');
  document.getElementById('edit-cancel-btn').onclick = () => b.classList.remove('show');
  b.onclick = (e) => { if (e.target === b) b.classList.remove('show'); };
});

document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // valida campos obrigatórios
  const camposOk = validarCamposProduto('e-');
  if (!camposOk.ok) {
    alert(camposOk.msg);
    camposOk.el?.focus();
    return;
  }

  const id = document.getElementById('e-id').value;

  const payload = {
    produtosId: parseInt(id, 10),
    codigoBarras: document.getElementById('e-codigoBarras').value.trim(),
    descricao: document.getElementById('e-descricao').value.trim(),
    unidadeMedida: document.getElementById('e-unidadeMedida').value,
    precoCompra: parseFloat(document.getElementById('e-precoCompra').value),
    precoVenda: parseFloat(document.getElementById('e-precoVenda').value),
    localizacao: document.getElementById('e-localizacao').value,
    laboratorio: document.getElementById('e-laboratorio').value,
    principio: document.getElementById('e-principio').value,
    generico: document.getElementById('e-generico').value.trim(),
    deletado: false
  };

  const resp = await fetch(`/api/produtos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    document.getElementById('produto-edit-backdrop').classList.remove('show');
    carregarProdutos();
  } else {
    const txt = await resp.text();
    alert('Erro ao atualizar produto:\n' + txt);
  }
});

/* ========== NOVO ========== */
document.getElementById('btn-new')?.addEventListener('click', () => {
  const b = document.getElementById('produto-new-backdrop');
  if (!b) return;

  document.getElementById('n-codigoBarras').value = '';
  document.getElementById('n-descricao').value = '';
  document.getElementById('n-unidadeMedida').value = '';
  document.getElementById('n-precoCompra').value = '';
  document.getElementById('n-precoVenda').value = '';
  document.getElementById('n-localizacao').value = '';
  document.getElementById('n-laboratorio').value = '';
  document.getElementById('n-principio').value = '';
  document.getElementById('n-generico').value = '';

  b.classList.add('show');
  document.getElementById('new-close-btn').onclick = () => b.classList.remove('show');
  document.getElementById('new-cancel-btn').onclick = () => b.classList.remove('show');
  b.onclick = (e) => { if (e.target === b) b.classList.remove('show'); };
});

document.getElementById('new-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const camposOk = validarCamposProduto('n-');
  if (!camposOk.ok) {
    alert(camposOk.msg);
    camposOk.el?.focus();
    return;
  }

  const payload = {
    codigoBarras: document.getElementById('n-codigoBarras').value.trim(),
    descricao: document.getElementById('n-descricao').value.trim(),
    unidadeMedida: document.getElementById('n-unidadeMedida').value,
    precoCompra: parseFloat(document.getElementById('n-precoCompra').value),
    precoVenda: parseFloat(document.getElementById('n-precoVenda').value),
    localizacao: document.getElementById('n-localizacao').value,
    laboratorio: document.getElementById('n-laboratorio').value,
    principio: document.getElementById('n-principio').value,
    generico: document.getElementById('n-generico').value.trim(),
    deletado: false
  };

  const resp = await fetch('/api/produtos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    document.getElementById('produto-new-backdrop').classList.remove('show');
    produtosPaginaAtual = 1;
    carregarProdutos();
  } else {
    const txt = await resp.text();
    alert('Erro ao criar produto:\n' + txt);
  }
});

/* ========== DELETE ========== */
document.getElementById('btn-delete')?.addEventListener('click', async () => {
  if (!produtoSelecionado) return;
  const ok = confirm(`Confirma excluir o produto "${produtoSelecionado.descricao}"?`);
  if (!ok) return;

  const resp = await fetch(`/api/produtos/${produtoSelecionado.id}`, {
    method: 'DELETE'
  });

  if (resp.ok) {
    carregarProdutos();
  } else {
    alert('Erro ao excluir produto');
  }
});

/* ========== FILTRO ========== */
document.getElementById('filter-text')?.addEventListener('input', () => {
  aplicarFiltroProdutos();
});
document.getElementById('filter-column')?.addEventListener('change', () => {
  aplicarFiltroProdutos();
});

/* ========== VALIDAÇÃO COMUM ========== */
function validarCamposProduto(prefixo) {
  const elCodigoBarras = document.getElementById(prefixo + 'codigoBarras');
  const elDescricao = document.getElementById(prefixo + 'descricao');
  const elPrecoCompra = document.getElementById(prefixo + 'precoCompra');
  const elPrecoVenda = document.getElementById(prefixo + 'precoVenda');
  const elGenerico = document.getElementById(prefixo + 'generico');

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
  if (!elGenerico.value.trim()) {
    return { ok: false, msg: 'Campo "genérico" é obrigatório.', el: elGenerico };
  }

  return { ok: true };
}
