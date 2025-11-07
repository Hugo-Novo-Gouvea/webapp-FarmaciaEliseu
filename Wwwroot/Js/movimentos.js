(function () {
  const tbody = document.querySelector('#tb-movimentos tbody');
  const pgInfo = document.querySelector('#movimentos-pg-info');
  const btnPrev = document.querySelector('#movimentos-pg-prev');
  const btnNext = document.querySelector('#movimentos-pg-next');
  const filterCol = document.querySelector('#filter-column');
  const filterText = document.querySelector('#filter-text');
  const btnDetails = document.querySelector('#btn-details');

  const modalBackdrop = document.querySelector('#movimento-modal-backdrop');
  const modalClose = document.querySelector('#mov-modal-close');
  const modalHeaderInfo = document.querySelector('#mov-modal-header-info');
  const modalItemsBody = document.querySelector('#tb-movimento-itens tbody');

  let currentPage = 1;
  let pageSize = 50;
  let total = 0;
  let currentSelection = null; // codigoMovimento selecionado
  let searchTimer = null;

  function fmtMoney(v) {
    return (v ?? 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleString('pt-BR');
  }

  async function loadPage(page) {
    const col = filterCol.value;
    const txt = filterText.value.trim();

    const params = new URLSearchParams();
    params.set('page', page);
    params.set('pageSize', pageSize);
    if (col) params.set('column', col);
    if (txt) params.set('search', txt);

    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Carregando...</td></tr>`;
    btnDetails.disabled = true;
    currentSelection = null;

    const resp = await fetch('/api/movimentos?' + params.toString());
    if (!resp.ok) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar.</td></tr>`;
      return;
    }

    const data = await resp.json();
    total = data.total ?? 0;
    currentPage = data.page ?? 1;
    pageSize = data.pageSize ?? 50;

    const items = data.items ?? [];

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum movimento encontrado.</td></tr>`;
    } else {
      tbody.innerHTML = '';
      items.forEach(m => {
        const tr = document.createElement('tr');
        tr.dataset.codigo = m.codigoMovimento;
        tr.innerHTML = `
          <td>${m.codigoMovimento}</td>
          <td>${m.clienteNome ?? ''}</td>
          <td>${fmtDate(m.dataVenda)}</td>
          <td>${fmtMoney(m.valorTotal)}</td>
        `;
        tbody.appendChild(tr);
      });

      // seleção de linha - usa .selected como nas outras telas
      tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => {
          tbody.querySelectorAll('tr').forEach(x => x.classList.remove('selected'));
          tr.classList.add('selected');
          currentSelection = tr.dataset.codigo;
          btnDetails.disabled = false;
        });
      });
    }

    // pager
    const start = total === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
    const end = Math.min(currentPage * pageSize, total);
    pgInfo.textContent = `Mostrando ${start}-${end} de ${total}`;

    if (currentPage > 1) {
      btnPrev.classList.remove('is-disabled');
    } else {
      btnPrev.classList.add('is-disabled');
    }

    if (currentPage * pageSize < total) {
      btnNext.classList.remove('is-disabled');
    } else {
      btnNext.classList.add('is-disabled');
    }
  }

  async function loadDetails(codigo) {
    modalBackdrop.style.display = 'flex';
    // limpa e mostra carregando
    modalHeaderInfo.innerHTML = `
      <div><dt>Movimento</dt><dd>Carregando...</dd></div>
    `;
    modalItemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;

    const resp = await fetch(`/api/movimentos/${codigo}`);
    if (!resp.ok) {
      modalHeaderInfo.innerHTML = `
        <div><dt>Movimento</dt><dd class="text-danger">Não encontrado</dd></div>
      `;
      modalItemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Sem itens.</td></tr>`;
      return;
    }

    const { header, itens } = await resp.json();

    modalHeaderInfo.innerHTML = `
      <div><dt>Movimento</dt><dd>${header.codigoMovimento}</dd></div>
      <div><dt>Cliente</dt><dd>${header.clienteNome}</dd></div>
      <div><dt>Data</dt><dd>${fmtDate(header.dataVenda)}</dd></div>
      <div><dt>Total</dt><dd>R$ ${fmtMoney(header.valorTotal)}</dd></div>
    `;

    if (!itens || itens.length === 0) {
      modalItemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Sem itens.</td></tr>`;
      return;
    }

    modalItemsBody.innerHTML = '';
    itens.forEach(it => {
      modalItemsBody.innerHTML += `
        <tr>
          <td>${it.produtosDescricao}</td>
          <td>${it.quantidade}</td>
          <td>${fmtMoney(it.precoUnitario)}</td>
          <td>${fmtMoney(it.desconto)}</td>
          <td>${fmtMoney(it.valorItem)}</td>
        </tr>
      `;
    });
  }

  // eventos de paginação
  btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      loadPage(currentPage - 1);
    }
  });

  btnNext.addEventListener('click', () => {
    if (currentPage * pageSize < total) {
      loadPage(currentPage + 1);
    }
  });

  // filtro ao digitar (igual clientes)
  filterText.addEventListener('input', () => {
    // debounce de 300ms
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      loadPage(1);
    }, 300);
  });

  // também troca se mudar a coluna
  filterCol.addEventListener('change', () => {
    loadPage(1);
  });

  btnDetails.addEventListener('click', () => {
    if (currentSelection) {
      loadDetails(currentSelection);
    }
  });

  modalClose.addEventListener('click', () => {
    modalBackdrop.style.display = 'none';
  });

  // inicia
  loadPage(1);
})();
