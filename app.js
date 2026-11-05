// Missão Expor Tech - App principal (página inicial / painel da equipe)

const STORAGE_KEY = 'missao_expor_tech_codigo';

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
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { erro: 'Falha de conexão. Verifique a internet e tente novamente.' } };
  }
}

function getCodigoSalvo() {
  return (localStorage.getItem(STORAGE_KEY) || '').trim().toUpperCase();
}

function salvarCodigo(codigo) {
  localStorage.setItem(STORAGE_KEY, (codigo || '').trim().toUpperCase());
}

function limparCodigo() {
  localStorage.removeItem(STORAGE_KEY);
}

// ========== ENTRADA ==========
async function entrar() {
  const input = $('codigo-input');
  const codigo = (input.value || '').trim().toUpperCase();
  if (!codigo) {
    msg('msg-entrada', 'Digite o código da equipe.', 'error');
    return;
  }

  $('btn-entrar').disabled = true;
  const { ok, data } = await api('/api/equipe/entrar', {
    method: 'POST',
    body: JSON.stringify({ codigo })
  });
  $('btn-entrar').disabled = false;

  if (!ok) {
    msg('msg-entrada', data.erro || 'Não foi possível entrar.', 'error');
    return;
  }

  salvarCodigo(codigo);
  renderEquipe(data.equipe, data.progresso);
}

function renderEquipe(equipe, progresso) {
  hide('tela-entrada');
  hide('tela-final');
  show('tela-equipe');

  $('equipe-nome').textContent = equipe.nome;
  $('equipe-codigo').textContent = equipe.codigo;

  const pct = progresso.total ? Math.round((progresso.qtdConcluidas / progresso.total) * 100) : 0;
  $('progress-fill').style.width = pct + '%';
  $('progress-text').textContent = `${progresso.qtdConcluidas} de ${progresso.total} salas concluídas`;

  // Lista de salas
  const lista = $('lista-salas');
  lista.innerHTML = '';
  progresso.concluidas.forEach(s => {
    const li = document.createElement('li');
    li.className = 'ok';
    li.textContent = s.nome + ' — concluída';
    lista.appendChild(li);
  });
  progresso.pendentes.forEach(s => {
    const li = document.createElement('li');
    li.className = 'pendente';
    li.textContent = s.nome + ' — pendente';
    lista.appendChild(li);
  });

  // Pistas
  const pistasEl = $('lista-pistas');
  pistasEl.innerHTML = '';
  if (progresso.pistasLiberadas && progresso.pistasLiberadas.length) {
    progresso.pistasLiberadas.forEach(p => {
      const div = document.createElement('div');
      div.className = 'pista';
      div.innerHTML = `<div class="ordem">Pista ${p.ordem}</div>${p.texto}`;
      pistasEl.appendChild(div);
    });
  } else {
    pistasEl.innerHTML = '<p style="color:var(--text-muted)">Nenhuma pista ainda.</p>';
  }

  // Final
  if (progresso.finalLiberado) {
    show('card-final');
  } else {
    hide('card-final');
  }
}

async function carregarProgresso() {
  const codigo = getCodigoSalvo();
  if (!codigo) return;

  const { ok, data } = await api('/api/equipe/progresso?codigo=' + encodeURIComponent(codigo));
  if (ok) {
    renderEquipe(data.equipe, data.progresso);
  } else {
    limparCodigo();
  }
}

async function verFinal() {
  const codigo = getCodigoSalvo();
  const { ok, data } = await api('/api/final?codigo=' + encodeURIComponent(codigo));
  if (!ok) {
    msg('msg-feedback', data.erro || 'Não foi possível carregar o enigma.', 'error');
    return;
  }

  hide('tela-equipe');
  show('tela-final');
  $('bau-nome').textContent = data.bauNome;
  $('enigma-texto').textContent = data.enigmaFinal;
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
  $('btn-entrar').addEventListener('click', entrar);
  $('codigo-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') entrar();
  });


  $('btn-ver-final').addEventListener('click', verFinal);
  $('btn-voltar-equipe').addEventListener('click', () => {
    hide('tela-final');
    show('tela-equipe');
    carregarProgresso();
  });

  // Se já tem código salvo, carrega painel
  if (getCodigoSalvo()) {
    carregarProgresso();
  }
});
