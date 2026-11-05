// Missões ExporTech 2026 - Admin (Rodadas)
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
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPass, ...(options.headers || {}) },
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
  const { ok, data } = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ senha }) });
  if (!ok) { msg('msg-login', data.erro || 'Senha incorreta.', 'error'); return; }
  adminPass = senha;
  sessionStorage.setItem('admin_pass', senha);
  hide('tela-login');
  show('tela-admin');
  carregarDashboard();
  carregarRodadas();
}

function logout() {
  adminPass = '';
  sessionStorage.removeItem('admin_pass');
  hide('tela-admin');
  show('tela-login');
  $('senha-admin').value = '';
}

document.querySelectorAll('#nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    const tab = $('tab-' + btn.dataset.tab);
    if (tab) tab.classList.remove('hidden');
    if (btn.dataset.tab === 'dashboard') carregarDashboard();
    if (btn.dataset.tab === 'rodadas') carregarRodadas();
    if (btn.dataset.tab === 'salas') carregarSalas();
    if (btn.dataset.tab === 'baus') carregarBaus();
    if (btn.dataset.tab === 'textos') carregarTextos();
  });
});

function statusLabel(st) {
  if (st === 'em_andamento') return { t: 'Em andamento', c: 'st-andamento' };
  if (st === 'percurso_concluido') return { t: 'Percurso liberado (tesouro)', c: 'st-percurso' };
  if (st === 'finalizada') return { t: 'Finalizada', c: 'st-finalizada' };
  return { t: st, c: 'st-andamento' };
}

async function carregarDashboard() {
  const { ok, data } = await api('/api/admin/dashboard');
  if (!ok) return;
  $('stats').innerHTML = `
    <div class="stat"><div class="num">${data.totalRodadas}</div><div class="label">Rodadas</div></div>
    <div class="stat"><div class="num">${data.emAndamento}</div><div class="label">Em andamento</div></div>
    <div class="stat"><div class="num">${data.percursoOk}</div><div class="label">Percurso OK</div></div>
    <div class="stat"><div class="num">${data.finalizadas}</div><div class="label">Finalizadas</div></div>
    <div class="stat"><div class="num">${data.totalSalas}</div><div class="label">Salas</div></div>
  `;
  $('status-jogo').textContent = data.jogoAberto
    ? 'Jogo ABERTO — participantes podem entrar'
    : 'Jogo FECHADO — entrada bloqueada';
}

async function toggleJogo(aberto) {
  await api('/api/admin/jogo', { method: 'POST', body: JSON.stringify({ aberto }) });
  carregarDashboard();
}

async function carregarRodadas() {
  const { ok, data } = await api('/api/admin/rodadas');
  if (!ok) return;
  const el = $('lista-rodadas');
  el.innerHTML = '';
  if (!data.podeCriarProxima && data.rodadas.length) {
    const aviso = document.createElement('div');
    aviso.className = 'card';
    aviso.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Aguarde o percurso da rodada atual (as duas equipes terminarem todas as salas) para criar a próxima. A busca ao tesouro pode continuar em paralelo.</p>';
    el.appendChild(aviso);
  }
  if (!data.rodadas.length) {
    el.innerHTML += '<div class="card"><p style="color:var(--text-muted)">Nenhuma rodada ainda. Crie a <strong>Rodada 1</strong> acima.</p></div>';
    return;
  }
  data.rodadas.slice().reverse().forEach(r => {
    const st = statusLabel(r.status);
    const card = document.createElement('div');
    card.className = 'rodada-card';
    let eqs = (r.equipes || []).map(e => `
      <div class="eq-row">
        <div>
          <strong>${e.nome}</strong><br>
          <span style="color:var(--text-muted);font-size:0.8rem">Código: ${e.codigo} · Baú ${e.bauId} · ${e.qtdConcluidas} salas · ${e.pontos} pts</span>
        </div>
        <div>
          ${e.recompensaEntregue || e.tesouroEncontrado
            ? '<span class="status-pill st-finalizada">Tesouro OK</span>'
            : (e.percursoCompleto
              ? `<button class="btn-small btn-success" data-tesouro="${e.codigo}">Registrar tesouro</button>`
              : '<span class="status-pill st-andamento">No percurso</span>')}
        </div>
      </div>
    `).join('');
    card.innerHTML = `
      <h3>Rodada ${r.numero} <span class="status-pill ${st.c}">${st.t}</span></h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 0.5rem">Sala da vez (ordem): ${r.salaAtualOrdem}</p>
      ${eqs}
      <button class="btn-small btn-danger mt-1" data-del-rod="${r.id}">Excluir rodada</button>
    `;
    el.appendChild(card);
  });
  el.querySelectorAll('[data-tesouro]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Registrar entrega do tesouro para ' + btn.dataset.tesouro + '?')) return;
      await api('/api/admin/rodadas/tesouro', { method: 'POST', body: JSON.stringify({ codigo: btn.dataset.tesouro }) });
      carregarRodadas();
      carregarDashboard();
    });
  });
  el.querySelectorAll('[data-del-rod]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta rodada e as equipes dela?')) return;
      await api('/api/admin/rodadas/delete', { method: 'POST', body: JSON.stringify({ id: btn.dataset.delRod }) });
      carregarRodadas();
      carregarDashboard();
    });
  });
}

async function criarRodada() {
  const body = {
    equipe1Codigo: $('r-eq1-cod').value.trim(),
    equipe1Nome: $('r-eq1-nome').value.trim(),
    equipe2Codigo: $('r-eq2-cod').value.trim(),
    equipe2Nome: $('r-eq2-nome').value.trim()
  };
  if (!body.equipe1Codigo || !body.equipe2Codigo) {
    msg('msg-rodada', 'Informe os códigos das duas equipes.', 'error');
    return;
  }
  const { ok, data } = await api('/api/admin/rodadas', { method: 'POST', body: JSON.stringify(body) });
  if (!ok) { msg('msg-rodada', data.erro || 'Erro ao criar.', 'error'); return; }
  msg('msg-rodada', 'Rodada ' + data.rodada.numero + ' criada!', 'success');
  $('r-eq1-cod').value = '';
  $('r-eq1-nome').value = '';
  $('r-eq2-cod').value = '';
  $('r-eq2-nome').value = '';
  carregarRodadas();
  carregarDashboard();
}

async function carregarSalas() {
  const { ok, data } = await api('/api/admin/salas');
  if (!ok) return;
  const el = $('lista-salas-admin');
  el.innerHTML = '';
  const base = location.origin;
  (data.salas || []).forEach(s => {
    let variantes = Array.isArray(s.desafios) && s.desafios.length
      ? s.desafios.map(v => ({ ...v }))
      : [{ pergunta: s.desafio || '', respostas: s.respostas || [], ajuda: s.ajuda || '' }];
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '1rem';
    const link = base + '/sala/' + s.slug;
    card.innerHTML = `
      <h3 style="color:var(--accent)">${s.ordem}. ${s.nome}</h3>
      <div class="link-sala">QR: <strong>${link}</strong></div>
      <div class="form-row"><label>Nome</label><input data-f="nome" type="text"></div>
      <div class="form-row"><label>Slug</label><input data-f="slug" type="text"></div>
      <div data-vars></div>
      <button type="button" class="btn-secondary btn-small" data-add>+ Pergunta</button>
      <button type="button" class="btn-success mt-1" data-save>Salvar</button>
      <div class="msg hidden" data-msg></div>
    `;
    el.appendChild(card);
    card.querySelector('[data-f="nome"]').value = s.nome || '';
    card.querySelector('[data-f="slug"]').value = s.slug || '';
    const varBox = card.querySelector('[data-vars]');
    function render() {
      varBox.innerHTML = variantes.map((v, i) => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:0.75rem;margin:0.5rem 0">
          <div style="font-size:0.8rem;color:var(--accent)">Pergunta ${i + 1}</div>
          <textarea data-i="${i}" data-k="pergunta"></textarea>
          <input data-i="${i}" data-k="respostas" placeholder="Respostas (vírgula)" type="text">
          <input data-i="${i}" data-k="ajuda" placeholder="Dica" type="text">
        </div>
      `).join('');
      variantes.forEach((v, i) => {
        const ta = varBox.querySelector(`textarea[data-i="${i}"]`);
        if (ta) ta.value = v.pergunta || '';
        const r = varBox.querySelector(`input[data-i="${i}"][data-k="respostas"]`);
        if (r) r.value = (v.respostas || []).join(', ');
        const a = varBox.querySelector(`input[data-i="${i}"][data-k="ajuda"]`);
        if (a) a.value = v.ajuda || '';
      });
    }
    render();
    card.querySelector('[data-add]').addEventListener('click', () => {
      variantes.push({ pergunta: '', respostas: [], ajuda: '' });
      render();
    });
    card.querySelector('[data-save]').addEventListener('click', async () => {
      const novas = [];
      varBox.querySelectorAll('textarea[data-k="pergunta"]').forEach(ta => {
        const i = parseInt(ta.getAttribute('data-i'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].pergunta = ta.value.trim();
      });
      varBox.querySelectorAll('input[data-k="respostas"]').forEach(inp => {
        const i = parseInt(inp.getAttribute('data-i'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].respostas = inp.value.split(',').map(x => x.trim()).filter(Boolean);
      });
      varBox.querySelectorAll('input[data-k="ajuda"]').forEach(inp => {
        const i = parseInt(inp.getAttribute('data-i'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].ajuda = inp.value.trim();
      });
      const limpas = novas.filter(v => v && v.pergunta);
      const res = await api('/api/admin/salas', {
        method: 'POST',
        body: JSON.stringify({
          id: s.id,
          nome: card.querySelector('[data-f="nome"]').value.trim(),
          slug: card.querySelector('[data-f="slug"]').value.trim(),
          ordem: s.ordem,
          desafios: limpas
        })
      });
      const m = card.querySelector('[data-msg]');
      m.className = res.ok ? 'msg msg-success' : 'msg msg-error';
      m.textContent = res.ok ? 'Salvo!' : ((res.data && res.data.erro) || 'Erro');
      m.classList.remove('hidden');
      if (res.ok) carregarSalas();
    });
  });
}

async function carregarBaus() {
  const { ok, data } = await api('/api/admin/baus');
  if (!ok) return;
  const el = $('lista-baus-admin');
  el.innerHTML = '';
  (data.baus || []).forEach(b => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '1rem';
    card.innerHTML = `
      <h3 style="color:var(--accent)">Baú ${b.id}</h3>
      <div class="form-row"><label>Nome</label><input data-k="nome" type="text"></div>
      <div class="form-row"><label>Local (só organização)</label><input data-k="local" type="text"></div>
      <div class="form-row"><label>Enigma final (equipe vê)</label><textarea data-k="enigma"></textarea></div>
      <button class="btn-success" data-save>Salvar baú ${b.id}</button>
      <div class="msg hidden" data-msg></div>
    `;
    el.appendChild(card);
    card.querySelector('[data-k="nome"]').value = b.nome || '';
    card.querySelector('[data-k="local"]').value = b.local || '';
    card.querySelector('[data-k="enigma"]').value = b.enigmaFinal || '';
    card.querySelector('[data-save]').addEventListener('click', async () => {
      const atualizados = (data.baus || []).map(x => {
        if (x.id !== b.id) return x;
        return {
          ...x,
          nome: card.querySelector('[data-k="nome"]').value.trim(),
          local: card.querySelector('[data-k="local"]').value.trim(),
          enigmaFinal: card.querySelector('[data-k="enigma"]').value.trim()
        };
      });
      const res = await api('/api/admin/baus', { method: 'POST', body: JSON.stringify({ baus: atualizados }) });
      const m = card.querySelector('[data-msg]');
      m.className = res.ok ? 'msg msg-success' : 'msg msg-error';
      m.textContent = res.ok ? 'Salvo!' : 'Erro';
      m.classList.remove('hidden');
    });
  });
}

async function carregarTextos() {
  const { ok, data } = await api('/api/admin/pistas');
  if (!ok) return;
  const p1 = (data.pistas || []).find(x => x.ordem === 1);
  $('texto-pista1').value = p1 ? p1.texto : '';
}

async function salvarPista1() {
  const { ok, data } = await api('/api/admin/pistas');
  if (!ok) return;
  let pistas = data.pistas || [];
  const texto = $('texto-pista1').value.trim();
  const idx = pistas.findIndex(x => x.ordem === 1);
  if (idx >= 0) pistas[idx].texto = texto;
  else pistas.unshift({ ordem: 1, texto });
  const res = await api('/api/admin/pistas', { method: 'POST', body: JSON.stringify({ pistas }) });
  msg('msg-pista1', res.ok ? 'Salvo!' : 'Erro', res.ok ? 'success' : 'error');
}

async function exportarDados() {
  const { ok, data } = await api('/api/admin/export');
  if (!ok) { msg('msg-backup', 'Erro ao exportar.', 'error'); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup-missoes-exportech.json';
  a.click();
  msg('msg-backup', 'Backup baixado!', 'success');
}

function importarDados() { $('input-import').click(); }

async function onImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    if (!confirm('Substituir todos os dados pelo arquivo?')) return;
    const res = await api('/api/admin/import', { method: 'POST', body: JSON.stringify(json) });
    msg('msg-backup', res.ok ? 'Importado!' : ((res.data && res.data.erro) || 'Erro'), res.ok ? 'success' : 'error');
    if (res.ok) { carregarDashboard(); carregarRodadas(); }
  } catch {
    msg('msg-backup', 'JSON inválido.', 'error');
  }
  e.target.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  $('btn-login').addEventListener('click', login);
  $('senha-admin').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('btn-logout').addEventListener('click', logout);
  $('btn-abrir').addEventListener('click', () => toggleJogo(true));
  $('btn-fechar').addEventListener('click', () => toggleJogo(false));
  $('btn-criar-rodada').addEventListener('click', criarRodada);
  $('btn-salvar-pista1').addEventListener('click', salvarPista1);
  $('btn-exportar').addEventListener('click', exportarDados);
  $('btn-importar').addEventListener('click', importarDados);
  $('input-import').addEventListener('change', onImportFile);
  if (adminPass) {
    hide('tela-login');
    show('tela-admin');
    carregarDashboard();
  }
});
