// Missões ExporTech 2026 - Painel Admin

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
  carregarRodadas();
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
    if (btn.dataset.tab === 'rodadas') carregarRodadas();
    if (btn.dataset.tab === 'salas') carregarSalas();
    if (btn.dataset.tab === 'baus') carregarBaus();
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
    <div class="stat"><div class="num">${data.salasObrigatorias}</div><div class="label">Salas</div></div>
  `;
  $('status-jogo').textContent = data.jogoAberto
    ? '🟢 Jogo ABERTO — participantes podem entrar'
    : '🔴 Jogo FECHADO — entrada bloqueada';
}

async function toggleJogo(aberto) {
  await api('/api/admin/jogo', { method: 'POST', body: JSON.stringify({ aberto }) });
  carregarDashboard();
}

// ===== EQUIPES =====
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
      <td><span class="badge badge-${(e.bauId || 'a').toLowerCase()}">${e.bauId || '-'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn-small btn-secondary" onclick='editarEquipe(${JSON.stringify(e)})'>Editar</button>
        ${!e.recompensaEntregue && e.finalLiberado ? `<button class="btn-small btn-success" onclick="registrarRecompensa('${e.codigo}')">Entregar</button>` : ''}
        <button class="btn-small btn-secondary" onclick="resetEquipe('${e.codigo}')">Reset</button>
        <button class="btn-small btn-danger" onclick="excluirEquipe('${e.codigo}')">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editarEquipe(e) {
  $('eq-id').value = e.id || '';
  $('eq-codigo').value = e.codigo || '';
  $('eq-codigo').disabled = true;
  $('eq-nome').value = e.nome || '';
  $('eq-qtd').value = e.qtdIntegrantes || 5;
  $('eq-bau').value = e.bauId || '';
  $('eq-form-titulo').textContent = 'Editar equipe';
  show('btn-cancelar-edit');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEditEquipe() {
  $('eq-id').value = '';
  $('eq-codigo').value = '';
  $('eq-codigo').disabled = false;
  $('eq-nome').value = '';
  $('eq-qtd').value = '5';
  $('eq-bau').value = '';
  $('eq-form-titulo').textContent = 'Criar equipe';
  hide('btn-cancelar-edit');
  hide('msg-equipe');
}

async function criarEquipe() {
  const id = $('eq-id').value.trim();
  const codigo = $('eq-codigo').value.trim().toUpperCase();
  const nome = $('eq-nome').value.trim();
  const qtd = parseInt($('eq-qtd').value, 10) || 5;
  const bau = $('eq-bau').value.trim().toUpperCase();

  if (!codigo) {
    msg('msg-equipe', 'Informe o código.', 'error');
    return;
  }

  const body = { codigo, nome, qtdIntegrantes: qtd };
  if (id) body.id = id;
  if (bau === 'A' || bau === 'B') body.bauId = bau;

  const { ok, data } = await api('/api/admin/equipes', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  if (!ok) {
    msg('msg-equipe', data.erro || 'Erro ao salvar.', 'error');
    return;
  }
  msg('msg-equipe', id ? 'Equipe atualizada!' : 'Equipe criada!', 'success');
  cancelarEditEquipe();
  carregarEquipes();
}

async function excluirEquipe(codigo) {
  if (!confirm('Excluir a equipe ' + codigo + '? Isso apaga o progresso dela.')) return;
  const { ok, data } = await api('/api/admin/equipes/delete', {
    method: 'POST',
    body: JSON.stringify({ codigo })
  });
  if (!ok) alert(data.erro || 'Erro ao excluir');
  else carregarEquipes();
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

// ===== RODADAS =====
async function carregarRodadas(){
 const {ok,data}=await api('/api/admin/rodadas');if(!ok)return;data.salas=(await api('/api/admin/salas')).data.salas||[];
 const selects=[$('rodada-eq1'),$('rodada-eq2')];selects.forEach(s=>{if(!s)return;s.innerHTML='<option value="">Selecione equipe</option>'+data.equipes.map(e=>'<option value="'+e.codigo+'">'+e.codigo+' — '+e.nome+'</option>').join('');});
 const el=$('lista-rodadas');if(!el)return;el.innerHTML='';
 (data.rodadas||[]).forEach(r=>{const card=document.createElement('div');card.className='card';card.style.marginBottom='1rem';const teams=(r.equipes||[]).join(' × ');const scores=Object.entries(r.placar||{}).map(([sid,v])=>{const sala=(data.salas||[]).find(x=>x.id===sid);return (sala?sala.nome:sid)+': '+(v.vencedor||'sem vencedor')+' ('+(v.pontos||0)+' pt)'}).join(' • ')||'Nenhum ponto registrado';const progresso=(r.equipes||[]).map(c=>c+': '+((r.progresso&&r.progresso[c])||[]).length+' salas').join(' | ');card.innerHTML='<h3>'+r.nome+'</h3><p><b>Equipes:</b> '+teams+'</p><p><b>Status:</b> '+r.status+'</p><p><b>Sala atual:</b> '+((r.salaAtualId||'')||'Percurso concluído / busca do tesouro')+'</p><p><b>Progresso:</b> '+progresso+'</p><p><b>Pontuação:</b> '+scores+'</p><p><b>Vencedor do tesouro:</b> '+(r.vencedorTesouro||'Ainda não registrado')+'</p><div class="flex"><button class="btn-success" data-start>Iniciar</button><button class="btn-secondary" data-next>Avançar sala</button><button class="btn-secondary" data-treasure>Registrar tesouro</button><button class="btn-danger" data-reset>Reiniciar</button></div>';el.appendChild(card);async function act(action,codigo){const res=await api('/api/admin/rodadas',{method:'POST',body:JSON.stringify({id:r.id,action,codigo})});if(!res.ok)alert(res.data.erro||'Falha');else carregarRodadas();}card.querySelector('[data-start]').onclick=()=>act('start');card.querySelector('[data-next]').onclick=()=>act('next');card.querySelector('[data-reset]').onclick=()=>{if(confirm('Reiniciar esta rodada?'))act('reset')};card.querySelector('[data-treasure]').onclick=()=>{const codigo=prompt('Código da equipe que encontrou o tesouro:');if(codigo)act('treasure',codigo.trim().toUpperCase())};});
}
async function criarRodada(){const a=$('rodada-eq1').value,b=$('rodada-eq2').value,nome=$('rodada-nome').value.trim();if(!a||!b||a===b){msg('msg-rodada','Selecione duas equipes diferentes.','error');return;}const res=await api('/api/admin/rodadas',{method:'POST',body:JSON.stringify({action:'create',nome,equipes:[a,b]})});if(!res.ok){msg('msg-rodada',res.data.erro||'Erro ao criar rodada.','error');return;}msg('msg-rodada','Rodada criada!','success');$('rodada-nome').value='';carregarRodadas();}
// ===== SALAS =====
async function criarNovaSala() {
  const nome = $('nova-sala-nome').value.trim();
  let slug = $('nova-sala-slug').value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!nome) {
    msg('msg-nova-sala', 'Informe o nome da sala.', 'error');
    return;
  }
  if (!slug) slug = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { ok, data } = await api('/api/admin/salas', {
    method: 'POST',
    body: JSON.stringify({
      nome,
      slug,
      desafio: 'Pergunta de exemplo — edite abaixo',
      respostas: ['resposta'],
      ajuda: '',
      desafios: [{ pergunta: 'Pergunta de exemplo — edite abaixo', respostas: ['resposta'], ajuda: '' }],
      obrigatoria: true
    })
  });

  if (!ok) {
    msg('msg-nova-sala', data.erro || 'Erro ao criar.', 'error');
    return;
  }
  msg('msg-nova-sala', 'Sala criada! Edite as perguntas abaixo.', 'success');
  $('nova-sala-nome').value = '';
  $('nova-sala-slug').value = '';
  carregarSalas();
}

async function carregarSalas() {
  const { ok, data } = await api('/api/admin/salas');
  if (!ok) return;
  const el = $('lista-salas-admin');
  el.innerHTML = '';
  const base = location.origin;

  data.salas.forEach((s) => {
    let variantes = Array.isArray(s.desafios) && s.desafios.length
      ? s.desafios.map(v => ({ ...v }))
      : [{ pergunta: s.desafio || '', respostas: s.respostas || [], ajuda: s.ajuda || '' }];

    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '1rem';
    const link = base + '/sala/' + s.slug;

    card.innerHTML = `
      <h3 style="color:var(--accent);margin-bottom:0.5rem">${s.nome}</h3>
      <div class="link-sala">Link do QR: <strong>${link}</strong></div>
      <div class="form-row">
        <label>Nome da sala</label>
        <input type="text" data-field="nome" value="">
      </div>
      <div class="form-row">
        <label>Slug (parte do link)</label>
        <input type="text" data-field="slug" value="">
      </div>
      <div data-vars></div>
      <button type="button" class="btn-secondary btn-small mt-1" data-add>+</button>
      <div class="flex mt-1">
        <button type="button" class="btn-success" data-save>Salvar sala</button>
        <button type="button" class="btn-danger" data-del>Excluir sala</button>
      </div>
      <div class="msg hidden" data-msg></div>
    `;
    el.appendChild(card);

    card.querySelector('[data-field="nome"]').value = s.nome || '';
    card.querySelector('[data-field="slug"]').value = s.slug || '';

    const varBox = card.querySelector('[data-vars]');
    function renderVariantes() {
      varBox.innerHTML = variantes.map((v, i) => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:0.75rem;margin:0.6rem 0">
          <div style="font-size:0.8rem;color:var(--accent);margin-bottom:0.4rem">Pergunta ${i + 1}</div>
          <div class="form-row">
            <label>Pergunta</label>
            <textarea data-i="${i}" data-k="pergunta"></textarea>
          </div>
          <div class="form-row">
            <label>Respostas (separadas por vírgula)</label>
            <input type="text" data-i="${i}" data-k="respostas">
          </div>
          <div class="form-row">
            <label>Dica</label>
            <input type="text" data-i="${i}" data-k="ajuda">
          </div>
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
    renderVariantes();

    card.querySelector('[data-add]').textContent = '+ Adicionar pergunta';
    card.querySelector('[data-add]').addEventListener('click', () => {
      variantes.push({ pergunta: '', respostas: [], ajuda: '' });
      renderVariantes();
    });

    card.querySelector('[data-save]').addEventListener('click', async () => {
      const nome = card.querySelector('[data-field="nome"]').value.trim();
      const slug = card.querySelector('[data-field="slug"]').value.trim();
      const novas = [];
      varBox.querySelectorAll('textarea[data-k="pergunta"]').forEach((ta) => {
        const i = parseInt(ta.getAttribute('data-i'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].pergunta = ta.value.trim();
      });
      varBox.querySelectorAll('input[data-k="respostas"]').forEach((inp) => {
        const i = parseInt(inp.getAttribute('data-i'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].respostas = inp.value.split(',').map(x => x.trim()).filter(Boolean);
      });
      varBox.querySelectorAll('input[data-k="ajuda"]').forEach((inp) => {
        const i = parseInt(inp.getAttribute('data-i'), 10);
        if (!novas[i]) novas[i] = { pergunta: '', respostas: [], ajuda: '' };
        novas[i].ajuda = inp.value.trim();
      });
      const limpas = novas.filter(v => v && v.pergunta);
      const body = {
        id: s.id,
        nome,
        slug,
        desafios: limpas,
        desafio: limpas[0] ? limpas[0].pergunta : '',
        respostas: limpas[0] ? limpas[0].respostas : [],
        ajuda: limpas[0] ? limpas[0].ajuda : ''
      };
      const res = await api('/api/admin/salas', { method: 'POST', body: JSON.stringify(body) });
      const msgEl = card.querySelector('[data-msg]');
      if (res.ok) {
        msgEl.className = 'msg msg-success';
        msgEl.textContent = 'Sala salva!';
        msgEl.classList.remove('hidden');
        carregarSalas();
      } else {
        msgEl.className = 'msg msg-error';
        msgEl.textContent = (res.data && res.data.erro) || 'Erro';
        msgEl.classList.remove('hidden');
      }
    });

    card.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm('Excluir a sala "' + s.nome + '"?')) return;
      const res = await api('/api/admin/salas/delete', {
        method: 'POST',
        body: JSON.stringify({ id: s.id })
      });
      if (res.ok) carregarSalas();
      else alert((res.data && res.data.erro) || 'Erro ao excluir');
    });
  });
}

// ===== BAÚS =====
async function carregarBaus() {
  const { ok, data } = await api('/api/admin/baus');
  if (!ok) return;
  const el = $('lista-baus-admin');
  el.innerHTML = '';

  (data.baus || []).forEach((b) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '1rem';
    card.innerHTML = `
      <h3 style="color:var(--accent)">Baú ${b.id}</h3>
      <div class="form-row">
        <label>Nome do baú</label>
        <input type="text" data-k="nome">
      </div>
      <div class="form-row">
        <label>Local real (só a organização vê)</label>
        <input type="text" data-k="local">
      </div>
      <div class="form-row">
        <label>Enigma final (texto que a equipe vê ao terminar)</label>
        <textarea data-k="enigma"></textarea>
      </div>
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
      const res = await api('/api/admin/baus', {
        method: 'POST',
        body: JSON.stringify({ baus: atualizados })
      });
      const msgEl = card.querySelector('[data-msg]');
      if (res.ok) {
        msgEl.className = 'msg msg-success';
        msgEl.textContent = 'Baú salvo!';
        msgEl.classList.remove('hidden');
      } else {
        msgEl.className = 'msg msg-error';
        msgEl.textContent = 'Erro ao salvar';
        msgEl.classList.remove('hidden');
      }
    });
  });
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
  $('btn-login').addEventListener('click', login);
  $('senha-admin').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('btn-logout').addEventListener('click', logout);
  $('btn-abrir').addEventListener('click', () => toggleJogo(true));
  $('btn-fechar').addEventListener('click', () => toggleJogo(false));
  $('btn-criar-equipe').addEventListener('click', criarEquipe);
  $('btn-cancelar-edit').addEventListener('click', cancelarEditEquipe);
  $('btn-nova-sala').addEventListener('click', criarNovaSala);
  $('btn-criar-rodada').addEventListener('click', criarRodada);

  if (adminPass) {
    hide('tela-login');
    show('tela-admin');
    carregarDashboard();
  }
});

window.registrarRecompensa = registrarRecompensa;
window.resetEquipe = resetEquipe;
window.excluirEquipe = excluirEquipe;
window.editarEquipe = editarEquipe;
