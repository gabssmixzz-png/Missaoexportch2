// Missão Expor Tech - Painel Admin

let adminPass = sessionStorage.getItem('admin_pass') || '';

function $(id) { return document.getElementById(id); }
function show(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.remove('hidden'); }
function hide(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.add('hidden'); }

function msg(elId, texto, tipo = 'info') {
  const el = $(elId);
  if (!el) return;
  el.className = 'msg msg-' + tipo;
  el.textContent = texto;
  show(el);
}

async function api(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPass,
        ...(options.headers || {})
      },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { erro: 'Falha de conexão.' } };
  }
}

async function login() {
  const senha = $('senha-admin').value;
  const { ok, data } = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ senha })
  });
  if (!ok) {
    msg('msg-login', data.erro || 'Senha incorreta.', 'error');
    return;
  }
  adminPass = senha;
  sessionStorage.setItem('admin_pass', senha);
  hide('tela-login');
  show('tela-admin');
  carregarDashboard();
  carregarEquipes();
}

function logout() {
  adminPass = '';
  sessionStorage.removeItem('admin_pass');
  hide('tela-admin');
  show('tela-login');
  $('senha-admin').value = '';
}

// Tabs
document.querySelectorAll('#nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    const tab = $('tab-' + btn.dataset.tab);
    if (tab) tab.classList.remove('hidden');

    if (btn.dataset.tab === 'dashboard') carregarDashboard();
    if (btn.dataset.tab === 'equipes') carregarEquipes();
    if (btn.dataset.tab === 'salas') carregarSalas();
    if (btn.dataset.tab === 'pistas') carregarPistas();
    if (btn.dataset.tab === 'baus') carregarBaus();
    if (btn.dataset.tab === 'qrcodes') gerarQRs();
    if (btn.dataset.tab === 'config') carregarConfig();
  });
});

async function carregarDashboard() {
  const { ok, data } = await api('/api/admin/dashboard');
  if (!ok) return;
  $('stats').innerHTML = `
    <div class="stat"><div class="num">${data.totalEquipes}</div><div class="label">Equipes</div></div>
    <div class="stat"><div class="num">${data.comProgresso}</div><div class="label">Com progresso</div></div>
    <div class="stat"><div class="num">${data.finalizadas}</div><div class="label">Finalizadas</div></div>
    <div class="stat"><div class="num">${data.recompensas}</div><div class="label">Recompensas</div></div>
    <div class="stat"><div class="num">${data.salasObrigatorias}</div><div class="label">Salas obrigatórias</div></div>
  `;
  $('status-jogo').textContent = data.jogoAberto
    ? '🟢 Jogo ABERTO — participantes podem entrar e jogar'
    : '🔴 Jogo FECHADO — entrada bloqueada';
}

async function toggleJogo(aberto) {
  await api('/api/admin/jogo', {
    method: 'POST',
    body: JSON.stringify({ aberto })
  });
  carregarDashboard();
}

async function carregarEquipes() {
  const { ok, data } = await api('/api/admin/equipes');
  if (!ok) return;
  const tbody = $('tabela-equipes');
  tbody.innerHTML = '';
  data.equipes.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${e.codigo}</strong></td>
      <td>${e.nome}</td>
      <td>${e.qtdConcluidas}/${e.total}${e.finalLiberado ? ' ✓' : ''}</td>
      <td><span class="badge badge-${e.bauId.toLowerCase()}">${e.bauId}</span></td>
      <td>${e.recompensaEntregue ? '✅' : '—'}</td>
      <td>
        ${!e.recompensaEntregue && e.finalLiberado ? `<button class="btn-small btn-success" onclick="registrarRecompensa('${e.codigo}')">Entregar</button>` : ''}
        <button class="btn-small btn-secondary" onclick="resetEquipe('${e.codigo}')">Reset</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function criarEquipe() {
  const codigo = $('eq-codigo').value.trim().toUpperCase();
  const nome = $('eq-nome').value.trim();
  const qtd = parseInt($('eq-qtd').value, 10) || 5;
  const bau = $('eq-bau').value.trim().toUpperCase();

  const body = { codigo, nome, qtdIntegrantes: qtd };
  if (bau === 'A' || bau === 'B') body.bauId = bau;

  const { ok, data } = await api('/api/admin/equipes', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  if (!ok) {
    msg('msg-equipe', data.erro || 'Erro ao criar.', 'error');
    return;
  }
  msg('msg-equipe', 'Equipe criada com sucesso!', 'success');
  $('eq-codigo').value = '';
  $('eq-nome').value = '';
  carregarEquipes();
}

async function registrarRecompensa(codigo) {
  if (!confirm('Confirmar entrega de recompensa para ' + codigo + '?')) return;
  const { ok, data } = await api('/api/admin/recompensa', {
    method: 'POST',
    body: JSON.stringify({ codigo })
  });
  if (!ok) alert(data.erro || 'Erro');
  else carregarEquipes();
}

async function resetEquipe(codigo) {
  if (!confirm('Zerar progresso de ' + codigo + '?')) return;
  await api('/api/admin/reset-equipe', {
    method: 'POST',
    body: JSON.stringify({ codigo })
  });
  carregarEquipes();
}

async function carregarSalas() {
  const { ok, data } = await api('/api/admin/salas');
  if (!ok) return;
  const el = $('lista-salas-admin');
  el.innerHTML = '';

  data.salas.forEach((s, idx) => {
    // Normaliza variantes
    let variantes = Array.isArray(s.desafios) && s.desafios.length
      ? s.desafios
      : [{ pergunta: s.desafio || '', respostas: s.respostas || [], ajuda: s.ajuda || '' }];

    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '1rem';
    card.innerHTML = `
      <h3 style="color:var(--accent);margin-bottom:0.75rem">${s.nome} <span style="font-size:0.8rem;color:var(--text-muted)">(${s.slug})</span></h3>
      <div class="form-row">
        <label>Nome da sala</label>
        <input type="text" data-field="nome" value="${(s.nome || '').replace(/"/g, '&quot;')}">
      </div>
      <div class="form-row">
        <label>Slug (URL da sala, sem espaços)</label>
        <input type="text" data-field="slug" value="${(s.slug || '').replace(/"/g, '&quot;')}">
      </div>
      <div id="variantes-${s.id}"></div>
      <button type="button" class="btn-secondary btn-small mt-1" data-add-var="${s.id}">+ Adicionar variante de pergunta</button>
      <button type="button" class="btn-success mt-1" data-save-sala="${s.id}">Salvar esta sala</button>
      <div class="msg hidden" id="msg-sala-${s.id}"></div>
    `;
    el.appendChild(card);

    const varBox = card.querySelector('#variantes-' + s.id);
    function renderVariantes() {
      varBox.innerHTML = variantes.map((v, i) => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:0.75rem;margin:0.6rem 0">
          <div style="font-size:0.8rem;color:var(--accent);margin-bottom:0.4rem">Pergunta variante ${i + 1}</div>
          <div class="form-row">
            <label>Pergunta</label>
            <textarea data-v="${i}" data-k="pergunta">${v.pergunta || ''}</textarea>
          </div>
          <div class="form-row">
            <label>Respostas aceitas (separadas por vírgula)</label>
            <input type="text" data-v="${i}" data-k="respostas" value="${(v.respostas || []).join(', ').replace(/"/g, '&quot;')}">
          </div>
          <div class="form-row">
            <label>Dica / ajuda</label>
            <input type="text" data-v="${i}" data-k="ajuda" value="${(v.ajuda || '').replace(/"/g, '&quot;')}">
          </div>
        </div>
      `).join('');
    }
    renderVariantes();

    card.querySelector('[data-add-var]').addEventListener('click', () => {
      variantes.push({ pergunta: '', respostas: [], ajuda: '' });
      renderVariantes();
    });

    card.querySelector('[data-save-sala]').addEventListener('click', async () => {
      // lê campos
      const nome = card.querySelector('[data-field="nome"]').value.trim();
      const slug = card.querySelector('[data-field="slug"]').value.trim();
      // lê variantes do DOM
      const novas = [];
      varBox.querySelectorAll('textarea[data-k="pergunta"]').forEach((ta) => {
        const i = parseInt(ta.getAttribute('data-v'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].pergunta = ta.value.trim();
      });
      varBox.querySelectorAll('input[data-k="respostas"]').forEach((inp) => {
        const i = parseInt(inp.getAttribute('data-v'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].respostas = inp.value.split(',').map(x => x.trim()).filter(Boolean);
      });
      varBox.querySelectorAll('input[data-k="ajuda"]').forEach((inp) => {
        const i = parseInt(inp.getAttribute('data-v'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].ajuda = inp.value.trim();
      });
      const limpas = novas.filter(v => v && v.pergunta);

      const body = {
        id: s.id,
        nome,
        slug,
        desafios: limpas,
        // mantém compatibilidade com campo único
        desafio: limpas[0] ? limpas[0].pergunta : s.desafio,
        respostas: limpas[0] ? limpas[0].respostas : s.respostas,
        ajuda: limpas[0] ? limpas[0].ajuda : s.ajuda
      };

      const res = await api('/api/admin/salas', { method: 'POST', body: JSON.stringify(body) });
      const msgEl = $('msg-sala-' + s.id);
      if (res.ok) {
        msgEl.className = 'msg msg-success';
        msgEl.textContent = 'Sala salva! Cada equipe verá uma variante diferente.';
        msgEl.classList.remove('hidden');
      } else {
        msgEl.className = 'msg msg-error';
        msgEl.textContent = (res.data && res.data.erro) || 'Erro ao salvar';
        msgEl.classList.remove('hidden');
      }
    });
  });
}

async function carregarPistas() {
  const { ok, data } = await api('/api/admin/pistas');
  if (!ok) return;
  $('lista-pistas-admin').innerHTML = data.pistas.map(p => `
    <div class="pista">
      <div class="ordem">Pista ${p.ordem}</div>
      ${p.texto}
    </div>
  `).join('');
}

async function carregarBaus() {
  const { ok, data } = await api('/api/admin/baus');
  if (!ok) return;
  $('lista-baus-admin').innerHTML = data.baus.map(b => `
    <div class="card" style="margin-bottom:0.75rem">
      <h3 style="color:var(--accent)">Baú ${b.id}: ${b.nome}</h3>
      <p><strong>Local (protegido):</strong> ${b.local}</p>
      <p><strong>Enigma final:</strong> ${b.enigmaFinal}</p>
    </div>
  `).join('');
}

function gerarQRs() {
  const base = location.origin;
  $('url-passaporte').textContent = base + '/';

  // Passaporte
  const qrPass = $('qr-passaporte');
  qrPass.innerHTML = '';
  if (window.QRCode) {
    QRCode.toCanvas(document.createElement('canvas'), base + '/', { width: 180 }, (err, canvas) => {
      if (!err) qrPass.appendChild(canvas);
    });
  } else {
    qrPass.innerHTML = '<p>Biblioteca QR não carregou. Use a URL acima.</p>';
  }

  // Salas
  api('/api/admin/salas').then(({ ok, data }) => {
    if (!ok) return;
    const container = $('qrs-salas');
    container.innerHTML = '';
    data.salas.forEach(s => {
      const url = base + '/sala/' + s.slug;
      const div = document.createElement('div');
      div.style.marginBottom = '1.25rem';
      div.innerHTML = `<p><strong>${s.nome}</strong><br><code>${url}</code></p>`;
      const box = document.createElement('div');
      box.className = 'qr-box';
      div.appendChild(box);
      container.appendChild(div);
      if (window.QRCode) {
        QRCode.toCanvas(document.createElement('canvas'), url, { width: 160 }, (err, canvas) => {
          if (!err) box.appendChild(canvas);
        });
      }
    });
  });
}

async function carregarConfig() {
  const { ok, data } = await api('/api/admin/config');
  if (ok) $('cfg-nome').value = data.nomeEvento || '';
}

async function salvarConfig() {
  const body = {
    nomeEvento: $('cfg-nome').value.trim()
  };
  const nova = $('cfg-senha').value;
  if (nova) body.novaSenha = nova;

  const { ok, data } = await api('/api/admin/config', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (ok) {
    msg('msg-config', 'Configurações salvas!', 'success');
    if (nova) {
      adminPass = nova;
      sessionStorage.setItem('admin_pass', nova);
    }
  } else {
    msg('msg-config', data.erro || 'Erro', 'error');
  }
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
  $('btn-login').addEventListener('click', login);
  $('senha-admin').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('btn-logout').addEventListener('click', logout);
  $('btn-abrir').addEventListener('click', () => toggleJogo(true));
  $('btn-fechar').addEventListener('click', () => toggleJogo(false));
  $('btn-criar-equipe').addEventListener('click', criarEquipe);
  $('btn-salvar-config').addEventListener('click', salvarConfig);

  // Auto-login se já tem senha na sessão
  if (adminPass) {
    hide('tela-login');
    show('tela-admin');
    carregarDashboard();
  }
});

// Expor funções usadas no onclick
window.registrarRecompensa = registrarRecompensa;
window.resetEquipe = resetEquipe;
