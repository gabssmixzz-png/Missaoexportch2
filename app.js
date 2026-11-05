// Missões ExporTech 2026 - App participante (rodadas)
const STORAGE_KEY = 'missao_codigo';

function $(id) { return document.getElementById(id); }
function show(el) { if (typeof el === 'string') el = $(el); if (el) { el.classList.remove('hidden'); } }
function hide(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.add('hidden'); }

function getCodigo() { return (localStorage.getItem(STORAGE_KEY) || '').toUpperCase(); }
function setCodigo(c) {
  const v = (c || '').toUpperCase();
  localStorage.setItem(STORAGE_KEY, v);
  localStorage.setItem('missao_expor_tech_codigo', v); // compat com sala.js antigo
}

async function entrar() {
  const codigo = (($('codigo-input') && $('codigo-input').value) || '').trim().toUpperCase();
  const msgEl = $('msg-entrada');
  if (!codigo) {
    if (msgEl) { msgEl.className = 'msg msg-error'; msgEl.textContent = 'Digite o código que você recebeu.'; msgEl.classList.remove('hidden'); }
    return;
  }
  try {
    const res = await fetch('/api/equipe/entrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });
    const data = await res.json();
    if (!res.ok) {
      if (msgEl) { msgEl.className = 'msg msg-error'; msgEl.textContent = data.erro || 'Não foi possível entrar.'; msgEl.classList.remove('hidden'); }
      return;
    }
    setCodigo(codigo);
    hide('tela-entrada');
    show('tela-equipe');
    renderPainel(data);
  } catch (e) {
    if (msgEl) { msgEl.className = 'msg msg-error'; msgEl.textContent = 'Erro de conexão.'; msgEl.classList.remove('hidden'); }
  }
}

function renderPainel(data) {
  const eq = data.equipe || {};
  const rod = data.rodada || {};
  const prog = data.progresso || {};

  if ($('equipe-nome')) $('equipe-nome').textContent = eq.nome || 'Equipe';
  if ($('equipe-codigo')) $('equipe-codigo').textContent = (eq.codigo || '') + ' · Rodada ' + (rod.numero || '?') + ' · ' + (prog.pontos || 0) + ' pts';

  const total = prog.total || 0;
  const qtd = prog.qtdConcluidas || 0;
  if ($('progress-text')) $('progress-text').textContent = qtd + ' de ' + total + ' salas';
  if ($('progress-fill')) $('progress-fill').style.width = (total ? Math.round((qtd / total) * 100) : 0) + '%';

  const lista = $('lista-salas');
  if (lista) {
    lista.innerHTML = '';
    const salaAtual = prog.salaAtual;
    const items = [];
    (prog.concluidas || []).forEach(s => items.push({ ...s, st: 'ok' }));
    (prog.pendentes || []).forEach(s => {
      items.push({ ...s, st: (salaAtual && s.id === salaAtual.id) ? 'atual' : 'pendente' });
    });
    if (!items.length) {
      lista.innerHTML = '<li class="pendente">Aguarde a organização configurar as salas.</li>';
    } else {
      items.forEach(s => {
        const li = document.createElement('li');
        li.className = s.st === 'ok' ? 'concluida' : (s.st === 'atual' ? 'pendente' : 'pendente');
        li.textContent = s.nome + (s.st === 'ok' ? ' ✓' : (s.st === 'atual' ? ' ← sala da vez' : ' (aguarde)'));
        lista.appendChild(li);
      });
    }
  }

  const pistas = $('lista-pistas');
  if (pistas) {
    pistas.innerHTML = '';
    const textos = data.pistas || [];
    if (textos.length) {
      textos.forEach(p => {
        const div = document.createElement('div');
        div.className = 'pista';
        div.textContent = p.texto || p;
        pistas.appendChild(div);
      });
    } else {
      pistas.innerHTML = '<div class="pista">Percorram as salas na ordem. A primeira equipe a acertar marca o ponto da sala.</div>';
    }
  }

  const cardFinal = $('card-final');
  if (cardFinal) {
    if (prog.percursoCompleto) {
      cardFinal.classList.remove('hidden');
      const p = cardFinal.querySelector('p');
      if (data.enigmaFinal) {
        if (p) p.textContent = 'Percurso liberado! Toque para ver o enigma do baú.';
      } else {
        if (p) p.textContent = 'Vocês terminaram as salas. Aguarde a outra equipe da rodada para liberar o tesouro.';
      }
    } else {
      cardFinal.classList.add('hidden');
    }
  }
}

async function atualizarPainel() {
  const codigo = getCodigo();
  if (!codigo) return;
  try {
    const res = await fetch('/api/equipe/progresso?codigo=' + encodeURIComponent(codigo));
    const data = await res.json();
    if (res.ok) renderPainel(data);
  } catch (e) {}
}

async function verFinal() {
  const codigo = getCodigo();
  try {
    const res = await fetch('/api/final?codigo=' + encodeURIComponent(codigo));
    const data = await res.json();
    if (!res.ok) {
      alert(data.erro || 'Tesouro ainda não liberado.');
      return;
    }
    hide('tela-equipe');
    show('tela-final');
    if ($('bau-nome')) $('bau-nome').textContent = data.bauNome || '';
    if ($('enigma-texto')) $('enigma-texto').textContent = data.enigmaFinal || '';
  } catch (e) {
    alert('Erro de conexão.');
  }
}

// ========== Scanner de QR ==========
let html5QrCode = null;
let scannerAtivo = false;

function extrairSlugDoQR(texto) {
  if (!texto) return null;
  texto = texto.trim();
  // Aceita URL completa: https://site.com/sala/video  ou  /sala/video  ou só o slug
  try {
    const u = new URL(texto, location.origin);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('sala');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch (e) {}
  // Fallback: se for só o slug
  if (/^[a-z0-9\-]+$/i.test(texto)) return texto;
  return null;
}

async function abrirScanner() {
  const msgEl = $('msg-scanner');
  if (msgEl) { msgEl.classList.add('hidden'); msgEl.textContent = ''; }

  if (!window.Html5Qrcode) {
    if (msgEl) {
      msgEl.className = 'msg msg-error';
      msgEl.textContent = 'Biblioteca de câmera não carregou. Atualize a página.';
      msgEl.classList.remove('hidden');
    }
    return;
  }

  show('scanner-area');
  hide('btn-abrir-scanner');

  html5QrCode = new Html5Qrcode('qr-reader');
  scannerAtivo = true;

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        const slug = extrairSlugDoQR(decodedText);
        if (slug) {
          fecharScanner().then(() => {
            // Código já está salvo no localStorage → vai direto para a sala
            location.href = '/sala/' + encodeURIComponent(slug);
          });
        }
      },
      () => {} // ignore scan failures
    );
  } catch (err) {
    scannerAtivo = false;
    hide('scanner-area');
    show('btn-abrir-scanner');
    if (msgEl) {
      msgEl.className = 'msg msg-error';
      msgEl.textContent = 'Não foi possível abrir a câmera. Verifique a permissão do navegador.';
      msgEl.classList.remove('hidden');
    }
  }
}

async function fecharScanner() {
  if (html5QrCode && scannerAtivo) {
    try { await html5QrCode.stop(); } catch (e) {}
    try { html5QrCode.clear(); } catch (e) {}
  }
  scannerAtivo = false;
  html5QrCode = null;
  hide('scanner-area');
  show('btn-abrir-scanner');
}

document.addEventListener('DOMContentLoaded', () => {
  const codigo = getCodigo();
  if (codigo && $('codigo-input')) {
    $('codigo-input').value = codigo;
    hide('tela-entrada');
    show('tela-equipe');
    atualizarPainel();
    setInterval(atualizarPainel, 8000);
  }
  if ($('btn-entrar')) $('btn-entrar').addEventListener('click', entrar);
  if ($('codigo-input')) $('codigo-input').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
  if ($('btn-ver-final')) $('btn-ver-final').addEventListener('click', verFinal);
  if ($('btn-voltar-equipe')) $('btn-voltar-equipe').addEventListener('click', () => {
    hide('tela-final');
    show('tela-equipe');
    atualizarPainel();
  });
  if ($('btn-abrir-scanner')) $('btn-abrir-scanner').addEventListener('click', abrirScanner);
  if ($('btn-fechar-scanner')) $('btn-fechar-scanner').addEventListener('click', fecharScanner);
});
