// /js/clientes.js

fetch('/api/clientes')
  .then(r => r.json())
  .then(clientes => {
    const tbody = document.querySelector('#tb-clientes tbody');
    tbody.innerHTML = '';

    clientes.forEach(c => {
      const tr = document.createElement('tr');

      const dtNasc = c.dataNascimento ? new Date(c.dataNascimento).toLocaleDateString() : '';
      const dtCad = c.dataCadastro ? new Date(c.dataCadastro).toLocaleString() : '';
      const dtUlt = c.dataUltimoRegistro ? new Date(c.dataUltimoRegistro).toLocaleString() : '';

      tr.innerHTML = `
        <td>${c.clientesId ?? c.clientesID ?? ''}</td>
        <td>${c.nome ?? ''}</td>
        <td>${c.endereco ?? ''}</td>
        <td>${c.rg ?? ''}</td>
        <td>${c.cpf ?? ''}</td>
        <td>${c.telefone ?? ''}</td>
        <td>${c.celular ?? ''}</td>
        <td>${dtNasc}</td>
        <td>${c.codigoFichario ?? ''}</td>
        <td>${dtCad}</td>
        <td>${dtUlt}</td>
        <td>
          ${c.deletado
            ? '<span class="badge-soft-danger">Sim</span>'
            : '<span class="badge-soft-success">Não</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (clientes.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="12" class="text-center text-muted">Nenhum cliente encontrado.</td>`;
      tbody.appendChild(tr);
    }
  })
  .catch(err => {
    console.error(err);
    const tbody = document.querySelector('#tb-clientes tbody');
    tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">Erro ao carregar clientes</td></tr>`;
  });
