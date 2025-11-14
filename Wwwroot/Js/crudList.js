// wwwroot/js/crudList.js
// Motor genérico para telas de lista + paginação + filtro + seleção.
// Cada tela (produtos, clientes, funcionários, etc.) só passa uma configuração.

(() => {
  // Utilitário de debounce para "buscar enquanto digita"
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  class CrudList {
    /**
     * @param {Object} cfg
     *   endpoint: string                     -> ex: '/api/produtos'
     *   tableBodySelector: string           -> '#tb-produtos tbody'
     *   pagerInfoSelector: string           -> '#produtos-pg-info'
     *   pagerPrevSelector: string           -> '#produtos-pg-prev'
     *   pagerNextSelector: string           -> '#produtos-pg-next'
     *   filterColumnSelector?: string       -> '#filter-column'
     *   filterTextSelector?: string         -> '#filter-text'
     *   btnViewSelector?: string            -> '#btn-view'
     *   btnEditSelector?: string            -> '#btn-edit'
     *   btnNewSelector?: string             -> '#btn-new'
     *   btnDeleteSelector?: string          -> '#btn-delete'
     *   pageSize?: number                   -> padrão 20
     *   defaultColumn?: string              -> ex: 'descricao'
     *   columnsCount?: number               -> para colspan em "Nenhum registro"
     *   columnParamName?: string            -> padrão 'column'
     *   searchParamName?: string            -> padrão 'search'
     *
     *   mapRow(item): { id: number, cells: (string|number)[] }
     *   onView?(id): void
     *   onEdit?(id): void
     *   onDelete?(id): Promise<void> | void
     *   onNew?(): void
     */
    constructor(cfg) {
      this.cfg = cfg;

      this.els = {
        tbody: document.querySelector(cfg.tableBodySelector),
        pagerInfo: document.querySelector(cfg.pagerInfoSelector),
        pagerPrev: document.querySelector(cfg.pagerPrevSelector),
        pagerNext: document.querySelector(cfg.pagerNextSelector),

        filterColumn: cfg.filterColumnSelector
          ? document.querySelector(cfg.filterColumnSelector)
          : null,
        filterText: cfg.filterTextSelector
          ? document.querySelector(cfg.filterTextSelector)
          : null,

        btnView: cfg.btnViewSelector
          ? document.querySelector(cfg.btnViewSelector)
          : null,
        btnEdit: cfg.btnEditSelector
          ? document.querySelector(cfg.btnEditSelector)
          : null,
        btnNew: cfg.btnNewSelector
          ? document.querySelector(cfg.btnNewSelector)
          : null,
        btnDelete: cfg.btnDeleteSelector
          ? document.querySelector(cfg.btnDeleteSelector)
          : null,
      };

      this.state = {
        page: 1,
        pageSize: cfg.pageSize ?? 20,
        total: 0,
        selectedId: null,
        column: cfg.defaultColumn ?? null,
        search: '',
        loading: false,
      };

      this.init();
    }

    // ==========================
    // Inicialização
    // ==========================
    init() {
      if (!this.els.tbody) {
        console.warn('CrudList: tbody não encontrado para', this.cfg);
        return;
      }

      this.wireFilters();
      this.wirePager();
      this.wireActions();

      this.setActionsDisabled(true);
      this.loadPage();
    }

    // ==========================
    // Helpers de UI
    // ==========================
    setActionsDisabled(disabled) {
      [this.els.btnView, this.els.btnEdit, this.els.btnDelete].forEach(b => {
        if (b) b.disabled = disabled;
      });
      // Novo, por padrão, fica sob controle da tela (ex: habilitar sempre no loadPage)
    }

    clearSelection() {
      if (!this.els.tbody) return;
      this.els.tbody
        .querySelectorAll('tr')
        .forEach(tr => tr.classList.remove('selected'));
      this.state.selectedId = null;
      this.setActionsDisabled(true);
    }

    buildQueryString() {
      const p = new URLSearchParams();
      p.set('page', this.state.page.toString());
      p.set('pageSize', this.state.pageSize.toString());

      if (this.state.column && this.state.search) {
        const colParam = this.cfg.columnParamName ?? 'column';
        const searchParam = this.cfg.searchParamName ?? 'search';
        p.set(colParam, this.state.column);
        p.set(searchParam, this.state.search);
      }

      return p.toString();
    }

    updatePagerUi() {
      const { pagerInfo, pagerPrev, pagerNext } = this.els;
      const { page, pageSize, total } = this.state;

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);

      if (pagerInfo) {
        pagerInfo.textContent = `Mostrando ${start}-${end} de ${total}`;
      }

      if (pagerPrev) {
        if (page <= 1) pagerPrev.classList.add('is-disabled');
        else pagerPrev.classList.remove('is-disabled');
      }
      if (pagerNext) {
        if (end >= total) pagerNext.classList.add('is-disabled');
        else pagerNext.classList.remove('is-disabled');
      }
    }

    renderRow(item) {
      if (!this.cfg.mapRow) {
        throw new Error('CrudList: cfg.mapRow(item) não foi definido.');
      }

      const row = this.cfg.mapRow(item);
      const id = row.id;
      const cells = row.cells ?? [];

      const tds = cells
        .map(val => `<td>${val ?? ''}</td>`)
        .join('');

      return `<tr data-id="${id}">${tds}</tr>`;
    }

    wireRowSelection() {
      if (!this.els.tbody) return;

      this.els.tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => {
          this.els.tbody
            .querySelectorAll('tr')
            .forEach(x => x.classList.remove('selected'));
          tr.classList.add('selected');

          const id = parseInt(tr.getAttribute('data-id') || '0', 10) || null;
          this.state.selectedId = id;
          this.setActionsDisabled(!(id && id > 0));
        });

        tr.addEventListener('dblclick', () => {
          const id = parseInt(tr.getAttribute('data-id') || '0', 10) || null;
          if (id && this.cfg.onView) {
            this.cfg.onView(id);
          }
        });
      });
    }

    // ==========================
    // Carregamento de página
    // ==========================
    async loadPage() {
      const { tbody, pagerInfo, pagerPrev, pagerNext } = this.els;
      if (!tbody) return;
      if (this.state.loading) return;

      this.state.loading = true;
      this.clearSelection();

      const colspan = this.cfg.columnsCount ?? 1;

      tbody.innerHTML = `
        <tr>
          <td colspan="${colspan}" class="text-center text-muted">Carregando...</td>
        </tr>
      `;
      if (pagerInfo) pagerInfo.textContent = 'Carregando...';
      pagerPrev?.classList.add('is-disabled');
      pagerNext?.classList.add('is-disabled');

      try {
        const qs = this.buildQueryString();
        const url = `${this.cfg.endpoint}?${qs}`;

        const resp = await fetch(url);
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || `Erro HTTP ${resp.status}`);
        }

        const data = await resp.json();
        let items = [];
        let total = 0;

        if (Array.isArray(data)) {
          items = data;
          total = data.length;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.items)) items = data.items;
          if (typeof data.total === 'number') total = data.total;
          else total = items.length;
        }

        this.state.total = total;

        if (!items.length) {
          tbody.innerHTML = `
            <tr>
              <td colspan="${colspan}" class="text-center text-muted">
                Nenhum registro encontrado.
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = items.map(item => this.renderRow(item)).join('');
        }

        this.wireRowSelection();
        this.updatePagerUi();

        // Por padrão, Nova fica habilitado ao carregar.
        if (this.els.btnNew) this.els.btnNew.disabled = false;

      } catch (err) {
        console.error('CrudList loadPage error:', err);
        tbody.innerHTML = `
          <tr>
            <td colspan="${colspan}" class="text-center text-muted">
              Erro ao carregar dados.
            </td>
          </tr>
        `;
        if (pagerInfo) pagerInfo.textContent = 'Erro ao carregar';
      } finally {
        this.state.loading = false;
      }
    }

    // ==========================
    // Filtros
    // ==========================
    wireFilters() {
      const { filterColumn, filterText } = this.els;

      if (filterColumn) {
        // garante que state.column começa consistente
        if (!this.state.column) {
          this.state.column = filterColumn.value || null;
        }

        filterColumn.addEventListener('change', () => {
          this.state.column = filterColumn.value || null;
          this.state.page = 1;
          this.loadPage();
        });
      }

      if (filterText) {
        const shoot = () => {
          this.state.search = filterText.value || '';
          this.state.page = 1;
          this.loadPage();
        };

        filterText.addEventListener('input', debounce(shoot, 250));

        filterText.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            shoot();
          }
        });
      }
    }

    // ==========================
    // Paginação
    // ==========================
    wirePager() {
      const { pagerPrev, pagerNext } = this.els;

      if (pagerPrev) {
        pagerPrev.addEventListener('click', () => {
          if (this.state.loading) return;
          if (this.state.page <= 1) return;
          this.state.page--;
          this.loadPage();
        });
      }

      if (pagerNext) {
        pagerNext.addEventListener('click', () => {
          if (this.state.loading) return;
          const maxPage = Math.ceil(this.state.total / this.state.pageSize) || 1;
          if (this.state.page >= maxPage) return;
          this.state.page++;
          this.loadPage();
        });
      }
    }

    // ==========================
    // Ações (botões)
    // ==========================
    wireActions() {
      const { btnView, btnEdit, btnNew, btnDelete } = this.els;

      if (btnView && this.cfg.onView) {
        btnView.addEventListener('click', () => {
          if (this.state.selectedId) this.cfg.onView(this.state.selectedId);
        });
      }

      if (btnEdit && this.cfg.onEdit) {
        btnEdit.addEventListener('click', () => {
          if (this.state.selectedId) this.cfg.onEdit(this.state.selectedId);
        });
      }

      if (btnDelete && this.cfg.onDelete) {
        btnDelete.addEventListener('click', async () => {
          if (!this.state.selectedId) return;
          const id = this.state.selectedId;
          const result = this.cfg.onDelete(id);
          if (result instanceof Promise) {
            await result;
          }
          // geralmente você vai chamar this.loadPage() dentro do onDelete,
          // mas se quiser fazer aqui também dá.
        });
      }

      if (btnNew && this.cfg.onNew) {
        btnNew.addEventListener('click', () => {
          this.cfg.onNew();
        });
      }
    }
  }

  // expõe no escopo global para os outros scripts usarem
  window.CrudList = CrudList;
})();
