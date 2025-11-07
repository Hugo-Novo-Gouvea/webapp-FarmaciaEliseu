(function () {
  const modeEl = document.querySelector('#mode');
  const targetEl = document.querySelector('#target');
  const serverEl = document.querySelector('#server');
  const dbEl = document.querySelector('#database');
  const userEl = document.querySelector('#username');
  const passEl = document.querySelector('#password');
  const encEl = document.querySelector('#encrypt');
  const trustEl = document.querySelector('#trust');
  const previewEl = document.querySelector('#preview');
  const btnSave = document.querySelector('#btn-save');

  function toggleSqlFields() {
    const sqlFields = document.querySelectorAll('.sql-only');
    if (modeEl.value === 'sql') {
      sqlFields.forEach(f => f.style.display = 'block');
    } else {
      sqlFields.forEach(f => f.style.display = 'none');
    }
  }

  function buildPreview() {
    const server = serverEl.value.trim() || '(servidor)';
    const db = dbEl.value.trim() || '(banco)';
    const encrypt = encEl.checked ? 'Encrypt=True;' : '';
    const trust = trustEl.checked ? 'TrustServerCertificate=True;' : '';
    let conn = `Server=${server};Database=${db};`;

    if (modeEl.value === 'windows') {
      conn += 'Integrated Security=True;';
    } else {
      const u = userEl.value.trim() || '(usuario)';
      const p = passEl.value.trim() || '(senha)';
      conn += `User Id=${u};Password=${p};`;
    }

    conn += encrypt + trust;
    previewEl.value = conn;
  }

  async function loadConfig() {
    try {
      const resp = await fetch('/api/config/db');
      if (!resp.ok) {
        toggleSqlFields();
        buildPreview();
        return;
      }
      const cfg = await resp.json();
      modeEl.value = cfg.mode || 'windows';
      targetEl.value = cfg.target || 'local';
      serverEl.value = cfg.server || '';
      dbEl.value = cfg.database || '';
      userEl.value = cfg.username || '';
      passEl.value = cfg.password || '';
      encEl.checked = !!cfg.encrypt;
      trustEl.checked = !!cfg.trustServerCertificate;

      toggleSqlFields();
      buildPreview();
    } catch (e) {
      console.error(e);
      toggleSqlFields();
      buildPreview();
    }
  }

  async function saveConfig() {
    const payload = {
      mode: modeEl.value,
      target: targetEl.value,
      server: serverEl.value.trim(),
      database: dbEl.value.trim(),
      username: userEl.value.trim(),
      password: passEl.value,
      encrypt: encEl.checked,
      trustServerCertificate: trustEl.checked
    };

    const resp = await fetch('/api/config/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      alert('Configurações salvas.');
    } else {
      alert('Falha ao salvar as configurações.');
    }
  }

  // eventos
  modeEl.addEventListener('change', () => {
    toggleSqlFields();
    buildPreview();
  });
  targetEl.addEventListener('change', buildPreview);
  serverEl.addEventListener('input', buildPreview);
  dbEl.addEventListener('input', buildPreview);
  userEl.addEventListener('input', buildPreview);
  passEl.addEventListener('input', buildPreview);
  encEl.addEventListener('change', buildPreview);
  trustEl.addEventListener('change', buildPreview);

  btnSave.addEventListener('click', saveConfig);

  // init
  loadConfig();
})();
