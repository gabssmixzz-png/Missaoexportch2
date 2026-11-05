// Missão Expor Tech - Página da sala (desafio)

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
    return { ok: false, status: 0, data: { erro: 'Falha de conexão. Tente novamente.' } };
  }
}

function getCodigo() {
  return (localStorage.getItem(STORAGE_KEY) || '').trim().toUpperCase();
}

function salvarCodigo(c) {
  localStorage.setItem(STORAGE_KEY, (c || '').trim().toUpperCase());
}

function getSlug() {
  // /sala/robotica  ou  path after /sala/
  const parts = location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('sala');
  return idx >= 0 && parts[idx + 1] ? parts[idx + 1] : '';
}

let currentSala = null;

async function carregarSala() {
  const slug = getSlug();
  if (!slug) {
    $('loading').textContent = 'Sala inválida.';
    return;
  }

  const codigo = getCodigo();
  const url = '/api/sala/' + encodeURIComponent(slug) + (codigo ? '?codigo=' + encodeURIComponent(codigo) : '');
  const { ok, data } = await api(url);

  hide('loading');

  if (!ok) {
    $('loading').textContent = data.erro || 'Sala não encontrada.';
    show('loading');
    return;
  }

  currentSala = data.sala;
  $('sala-titulo').textContent = data.sala.nome;

  if (data.precisaCodigo || !codigo) {
    show('tela-codigo');
    return;
  }

  if (data.jaConcluida) {
    show('tela-ja-concluida');
    return;
  }

  if (data.bloqueada) {
    const nome = data.salaAtivaNome || 'outra sala';
    const el = $('texto-bloqueada');
    if (el) {
      el.textContent = 'Sua equipe está no desafio da ' + nome + '. Concluam esse mistério antes de abrir outra sala.';
    }
    show('tela-bloqueada');
    return;
  }

  // Mostra desafio
  $('desafio-texto').textContent = data.sala.desafio;
  if (data.sala.ajuda) {
    $('ajuda-texto').textContent = data.sala.ajuda;
  } else {
    hide('btn-ajuda');
  }
  show('tela-desafio');
}

async function confirmarCodigo() {
  const codigo = ($('codigo-sala').value || '').trim().toUpperCase();
  if (!codigo) {
    msg('msg-codigo', 'Digite o código da equipe.', 'error');
    return;
  }

  // Valida o código entrando
  const { ok, data } = await api('/api/equipe/entrar', {
    method: 'POST',
    body: JSON.stringify({ codigo })
  });

  if (!ok) {
    msg('msg-codigo', data.erro || 'Código inválido.', 'error');
    return;
  }

  salvarCodigo(codigo);
  hide('tela-codigo');
  // Recarrega a sala agora com código
  show('loading');
  await carregarSala();
}

async function enviarResposta() {
  const codigo = getCodigo();
  const resposta = ($('resposta-input').value || '').trim();
  if (!resposta) {
    msg('msg-resposta', 'Digite uma resposta.', 'error');
    return;
  }

  $('btn-enviar').disabled = true;
  const { ok, data } = await api('/api/sala/responder', {
    method: 'POST',
    body: JSON.stringify({
      codigo,
      slug: currentSala.slug,
      resposta
    })
  });
  $('btn-enviar').disabled = false;

  if (!ok) {
    msg('msg-resposta', data.erro || 'Erro ao enviar.', 'error');
    return;
  }

  if (data.jaConcluida) {
    hide('tela-desafio');
    show('tela-ja-concluida');
    return;
  }

  if (!data.sucesso) {
    msg('msg-resposta', data.mensagem || 'Resposta incorreta.', 'error');
    return;
  }

  // Sucesso!
  hide('tela-desafio');
  show('tela-sucesso');

  if (data.novaPista) {
    $('nova-pista-texto').textContent = data.novaPista.texto;
    show('nova-pista-box');
  }

  if (data.finalLiberado) {
    show('final-aviso');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarSala();

  $('btn-confirmar-codigo').addEventListener('click', confirmarCodigo);
  $('codigo-sala').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmarCodigo();
  });

  $('btn-enviar').addEventListener('click', enviarResposta);
  $('resposta-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') enviarResposta();
  });

  $('btn-ajuda').addEventListener('click', () => {
    show('ajuda-box');
    hide('btn-ajuda');
  });
});
