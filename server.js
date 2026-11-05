/**
 * Missões ExporTech 2026
 * Sistema de rodadas: 2 equipes de 5, mesmas salas, pontuação por sala, tesouro após percurso.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'db.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('Erro ao carregar DB:', e.message);
  }
  return getDefaultDB();
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Erro ao salvar DB:', e.message);
    return false;
  }
}

function getDefaultDB() {
  return {
    config: {
      jogoAberto: true,
      senhaAdmin: 'coordenacaoexportech2026nesia',
      nomeEvento: 'Missões ExporTech 2026'
    },
    salas: [
      {
        id: 'sala-video',
        slug: 'video',
        nome: 'Sala de Vídeo',
        ordem: 1,
        obrigatoria: true,
        desafios: [
          { pergunta: 'Se um vídeo tem 12 minutos e você já assistiu 1/3 dele, quantos minutos faltam?', respostas: ['8', 'oito'], ajuda: '1/3 de 12 é 4. 12 - 4 = ?' },
          { pergunta: 'Qual botão costuma pausar ou continuar um vídeo no computador (tecla)?', respostas: ['espaco', 'espaço', 'barra de espaco', 'barra de espaço'], ajuda: 'É a tecla mais longa do teclado.' },
          { pergunta: 'Complete: a imagem em movimento na tela é feita de vários ____ por segundo.', respostas: ['frames', 'quadros', 'fotogramas'], ajuda: 'Cada "foto" rápida da animação.' }
        ]
      },
      {
        id: 'sala-componentes',
        slug: 'componentes',
        nome: 'Sala dos Componentes do Computador',
        ordem: 2,
        obrigatoria: true,
        desafios: [
          { pergunta: 'Qual peça é considerada o "cérebro" do computador?', respostas: ['processador', 'cpu', 'unidade central de processamento'], ajuda: 'Executa as instruções dos programas.' },
          { pergunta: 'Onde ficam salvos os arquivos mesmo com o computador desligado?', respostas: ['hd', 'ssd', 'disco rigido', 'disco rígido', 'armazenamento', 'hd ou ssd'], ajuda: 'Não é a memória RAM (que apaga ao desligar).' },
          { pergunta: 'Qual componente mostra as imagens na tela?', respostas: ['placa de video', 'placa de vídeo', 'gpu', 'placa grafica', 'placa gráfica'], ajuda: 'Trabalha com gráficos e jogos.' }
        ]
      },
      {
        id: 'sala-jogos',
        slug: 'jogos',
        nome: 'Sala de Jogos',
        ordem: 3,
        obrigatoria: true,
        desafios: [
          { pergunta: 'Em um jogo, você tem 3 vidas e perdeu 1. Quantas restam?', respostas: ['2', 'duas'], ajuda: 'Conta simples: 3 - 1.' },
          { pergunta: 'O que significa "nível" (level) na maioria dos jogos?', respostas: ['fase', 'etapa', 'estagio', 'estágio', 'missao', 'missão'], ajuda: 'É a parte do jogo que você precisa completar.' },
          { pergunta: 'Se cada fase dá 10 pontos e você passou em 4 fases, quantos pontos fez?', respostas: ['40', 'quarenta'], ajuda: '10 x 4.' }
        ]
      },
      {
        id: 'sala-laboratorio',
        slug: 'laboratorio',
        nome: 'Laboratório de Informática',
        ordem: 4,
        obrigatoria: true,
        desafios: [
          { pergunta: 'Qual protocolo deixa o site seguro (cadeado no navegador)?', respostas: ['https', 'http seguro'], ajuda: 'HTTP + S de seguro.' },
          { pergunta: 'Complete a sequência: 2, 4, 8, 16, __', respostas: ['32', 'trinta e dois'], ajuda: 'Cada número é o dobro do anterior.' },
          { pergunta: 'Qual sigla em inglês significa Inteligência Artificial?', respostas: ['ai', 'a.i.', 'a i'], ajuda: 'Duas letras muito usadas em tecnologia.' }
        ]
      }
    ],
    baus: [
      {
        id: 'A',
        nome: 'Baú do Tesouro',
        local: 'Laboratório de Informática',
        enigmaFinal: 'Sua equipe concluiu o percurso! Procure o baú no laboratório e mostre este enigma a um responsável.'
      },
      {
        id: 'B',
        nome: 'Baú do Tesouro',
        local: 'Laboratório de Informática',
        enigmaFinal: 'Sua equipe concluiu o percurso! Procure o baú no laboratório e mostre este enigma a um responsável.'
      }
    ],
    rodadas: [],
    pistas: [
      { ordem: 1, texto: 'Bem-vindos à Missões ExporTech 2026! Vocês estão em uma rodada com outra equipe. Percorram as salas na ordem, respondam e disputem cada ponto. Boa sorte!' }
    ]
  };
}

let db = loadDB();
if (!db.config) db.config = getDefaultDB().config;
db.config.senhaAdmin = 'coordenacaoexportech2026nesia';
if (!Array.isArray(db.salas) || db.salas.length === 0) db.salas = getDefaultDB().salas;
if (!Array.isArray(db.baus) || db.baus.length === 0) db.baus = getDefaultDB().baus;
if (!Array.isArray(db.rodadas)) db.rodadas = [];
if (!Array.isArray(db.pistas)) db.pistas = getDefaultDB().pistas;
db.salas.forEach(s => { if (s.slug) s.slug = normalizeSlug(s.slug); });
saveDB(db);

function normalizeSlug(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function normalizeAnswer(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickDesafioForTeam(sala, codigo) {
  const lista = Array.isArray(sala.desafios) && sala.desafios.length
    ? sala.desafios
    : [{ pergunta: sala.desafio, respostas: sala.respostas || [], ajuda: sala.ajuda || '' }];
  if (!codigo || lista.length === 1) return lista[0];
  let hash = 0;
  const s = (codigo + '|' + (sala.slug || sala.id)).toUpperCase();
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return lista[Math.abs(hash) % lista.length];
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

function getSalasOrdenadas() {
  return [...db.salas].filter(s => s.obrigatoria !== false).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

function findEquipeByCodigo(codigo) {
  if (!codigo) return null;
  const c = codigo.toUpperCase().trim();
  for (const rodada of db.rodadas) {
    const eq = (rodada.equipes || []).find(e => e.codigo.toUpperCase() === c);
    if (eq) return { equipe: eq, rodada };
  }
  return null;
}

function equipeCompletouSala(equipe, salaId) {
  return (equipe.salasConcluidas || []).some(c => c.salaId === salaId);
}

function progressoEquipe(equipe, rodada) {
  const salas = getSalasOrdenadas();
  const total = salas.length;
  const concluidas = salas.filter(s => equipeCompletouSala(equipe, s.id));
  const qtd = concluidas.length;
  const percursoCompleto = qtd >= total && total > 0;
  const salaAtual = salas.find(s => s.ordem === (rodada.salaAtualOrdem || 1)) || salas[0];
  return {
    qtdConcluidas: qtd,
    total,
    pontos: equipe.pontos || 0,
    percursoCompleto: !!equipe.percursoCompleto || percursoCompleto,
    tesouroEncontrado: !!equipe.tesouroEncontrado,
    recompensaEntregue: !!equipe.recompensaEntregue,
    salaAtual: salaAtual ? { id: salaAtual.id, nome: salaAtual.nome, slug: salaAtual.slug, ordem: salaAtual.ordem } : null,
    concluidas: concluidas.map(s => ({ id: s.id, nome: s.nome })),
    pendentes: salas.filter(s => !equipeCompletouSala(equipe, s.id)).map(s => ({ id: s.id, nome: s.nome, slug: s.slug }))
  };
}

function atualizarStatusRodada(rodada) {
  const salas = getSalasOrdenadas();
  const equipes = rodada.equipes || [];
  if (equipes.length < 2) return;
  let ordem = rodada.salaAtualOrdem || 1;
  const maxOrdem = salas.length ? Math.max(...salas.map(s => s.ordem || 0)) : 1;
  while (ordem <= maxOrdem) {
    const sala = salas.find(s => s.ordem === ordem);
    if (!sala) break;
    const todasConcluiram = equipes.every(e => equipeCompletouSala(e, sala.id));
    if (todasConcluiram) {
      ordem += 1;
      rodada.salaAtualOrdem = ordem;
    } else break;
  }
  const todasPercurso = equipes.every(e => {
    const p = progressoEquipe(e, rodada);
    if (p.percursoCompleto) e.percursoCompleto = true;
    return e.percursoCompleto;
  });
  if (todasPercurso) {
    if (rodada.status !== 'finalizada') {
      rodada.status = 'percurso_concluido';
      if (!rodada.percursoLiberadoEm) rodada.percursoLiberadoEm = new Date().toISOString();
    }
  }
  const todasTesouro = equipes.every(e => e.tesouroEncontrado || e.recompensaEntregue);
  if (todasTesouro && rodada.status === 'percurso_concluido') {
    rodada.status = 'finalizada';
  }
}

function proximoNumeroRodada() {
  if (!db.rodadas.length) return 1;
  return Math.max(...db.rodadas.map(r => r.numero || 0)) + 1;
}

function podeCriarProximaRodada() {
  return true;
}

function checkAdmin(req) {
  return (req.headers['x-admin-password'] || '') === db.config.senhaAdmin;
}

async function handleAPI(req, res, pathname) {
  const method = req.method;
  if (method === 'OPTIONS') return jsonResponse(res, 200, {});

  if (pathname === '/api/status' && method === 'GET') {
    return jsonResponse(res, 200, {
      jogoAberto: db.config.jogoAberto,
      nomeEvento: db.config.nomeEvento,
      totalSalas: getSalasOrdenadas().length,
      totalRodadas: db.rodadas.length
    });
  }

  if (pathname === '/api/equipe/entrar' && method === 'POST') {
    const body = await parseBody(req);
    const codigo = (body.codigo || '').trim().toUpperCase();
    if (!codigo) return jsonResponse(res, 400, { erro: 'Informe o código da equipe.' });
    if (!db.config.jogoAberto) return jsonResponse(res, 403, { erro: 'O jogo está fechado no momento.' });
    const found = findEquipeByCodigo(codigo);
    if (!found) return jsonResponse(res, 404, { erro: 'Código de equipe não encontrado.' });
    const { equipe, rodada } = found;
    const prog = progressoEquipe(equipe, rodada);
    return jsonResponse(res, 200, {
      sucesso: true,
      equipe: { codigo: equipe.codigo, nome: equipe.nome, qtdIntegrantes: equipe.qtdIntegrantes, pontos: equipe.pontos || 0 },
      rodada: { numero: rodada.numero, status: rodada.status, salaAtualOrdem: rodada.salaAtualOrdem || 1 },
      progresso: prog,
      pistas: db.pistas.slice(0, 1)
    });
  }

  if (pathname === '/api/equipe/progresso' && method === 'GET') {
    const parsed = url.parse(req.url, true);
    const codigo = (parsed.query.codigo || '').trim().toUpperCase();
    const found = findEquipeByCodigo(codigo);
    if (!found) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
    const { equipe, rodada } = found;
    atualizarStatusRodada(rodada);
    saveDB(db);
    const prog = progressoEquipe(equipe, rodada);
    let enigmaFinal = null;
    if (prog.percursoCompleto && (rodada.status === 'percurso_concluido' || rodada.status === 'finalizada')) {
      const bau = db.baus.find(b => b.id === equipe.bauId) || db.baus[0];
      if (bau) enigmaFinal = { bauNome: bau.nome, texto: bau.enigmaFinal };
    }
    return jsonResponse(res, 200, {
      equipe: { codigo: equipe.codigo, nome: equipe.nome, pontos: equipe.pontos || 0 },
      rodada: { numero: rodada.numero, status: rodada.status, salaAtualOrdem: rodada.salaAtualOrdem || 1 },
      progresso: prog,
      enigmaFinal,
      pistas: db.pistas.slice(0, 1)
    });
  }

  if (pathname.startsWith('/api/sala/') && method === 'GET') {
    let slug = pathname.replace('/api/sala/', '').split('/')[0];
    try { slug = decodeURIComponent(slug); } catch (e) {}
    const slugNorm = normalizeSlug(slug);
    const sala = db.salas.find(s => s.slug === slug || s.id === slug || normalizeSlug(s.slug) === slugNorm);
    if (!sala) return jsonResponse(res, 404, { erro: 'Sala não encontrada.' });
    const parsed = url.parse(req.url, true);
    const codigo = (parsed.query.codigo || '').trim().toUpperCase();
    if (!codigo) {
      return jsonResponse(res, 200, {
        sala: { id: sala.id, slug: sala.slug, nome: sala.nome },
        precisaCodigo: true, jaConcluida: false, bloqueada: false
      });
    }
    const found = findEquipeByCodigo(codigo);
    if (!found) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
    const { equipe, rodada } = found;
    atualizarStatusRodada(rodada);
    const jaConcluida = equipeCompletouSala(equipe, sala.id);
    const ordemAtual = rodada.salaAtualOrdem || 1;
    const salas = getSalasOrdenadas();
    const salaDaVez = salas.find(s => s.ordem === ordemAtual);
    let bloqueada = false;
    let motivoBloqueio = null;
    if (!jaConcluida && sala.ordem !== ordemAtual) {
      bloqueada = true;
      motivoBloqueio = 'Sala da vez da rodada: ' + (salaDaVez ? salaDaVez.nome : 'aguarde') + '. As duas equipes avançam juntas.';
    }
    const desafio = pickDesafioForTeam(sala, codigo);
    return jsonResponse(res, 200, {
      sala: {
        id: sala.id, slug: sala.slug, nome: sala.nome, ordem: sala.ordem,
        desafio: bloqueada || jaConcluida ? null : (desafio.pergunta || desafio.desafio),
        ajuda: bloqueada || jaConcluida ? null : (desafio.ajuda || null)
      },
      jaConcluida, bloqueada, motivoBloqueio,
      salaAtualNome: salaDaVez ? salaDaVez.nome : null,
      rodadaNumero: rodada.numero,
      precisaCodigo: false
    });
  }

  if (pathname === '/api/sala/responder' && method === 'POST') {
    const body = await parseBody(req);
    const codigo = (body.codigo || '').trim().toUpperCase();
    let slug = (body.slug || body.salaId || '').trim();
    try { slug = decodeURIComponent(slug); } catch (e) {}
    const resposta = (body.resposta || '').trim();
    if (!db.config.jogoAberto) return jsonResponse(res, 403, { erro: 'O jogo está fechado.' });
    const found = findEquipeByCodigo(codigo);
    if (!found) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
    const { equipe, rodada } = found;
    const slugNorm = normalizeSlug(slug);
    const sala = db.salas.find(s => s.slug === slug || s.id === slug || normalizeSlug(s.slug) === slugNorm);
    if (!sala) return jsonResponse(res, 404, { erro: 'Sala não encontrada.' });
    if (equipeCompletouSala(equipe, sala.id)) {
      return jsonResponse(res, 200, { sucesso: false, jaConcluida: true, mensagem: 'Sua equipe já concluiu esta sala.', progresso: progressoEquipe(equipe, rodada) });
    }
    const ordemAtual = rodada.salaAtualOrdem || 1;
    if (sala.ordem !== ordemAtual) {
      return jsonResponse(res, 200, { sucesso: false, bloqueada: true, mensagem: 'Esta não é a sala da vez. As duas equipes avançam juntas.', progresso: progressoEquipe(equipe, rodada) });
    }
    const desafio = pickDesafioForTeam(sala, codigo);
    const respostasValidas = desafio.respostas || sala.respostas || [];
    if (!respostasValidas.some(r => normalizeAnswer(r) === normalizeAnswer(resposta))) {
      return jsonResponse(res, 200, { sucesso: false, mensagem: 'Resposta incorreta. Tente de novo!', progresso: progressoEquipe(equipe, rodada) });
    }
    const outraJaFez = (rodada.equipes || []).some(e => e.id !== equipe.id && equipeCompletouSala(e, sala.id));
    const ganhouPonto = !outraJaFez;
    if (!equipe.salasConcluidas) equipe.salasConcluidas = [];
    equipe.salasConcluidas.push({ salaId: sala.id, timestamp: new Date().toISOString(), ganhouPonto });
    if (ganhouPonto) equipe.pontos = (equipe.pontos || 0) + 1;
    atualizarStatusRodada(rodada);
    saveDB(db);
    const prog = progressoEquipe(equipe, rodada);
    return jsonResponse(res, 200, {
      sucesso: true,
      mensagem: ganhouPonto ? 'Correto! Sua equipe marcou o ponto desta sala!' : 'Correto! Sala concluída. A outra equipe já tinha o ponto.',
      ganhouPonto,
      progresso: prog,
      rodadaStatus: rodada.status,
      finalLiberado: prog.percursoCompleto && (rodada.status === 'percurso_concluido' || rodada.status === 'finalizada')
    });
  }

  if (pathname === '/api/final' && method === 'GET') {
    const parsed = url.parse(req.url, true);
    const codigo = (parsed.query.codigo || '').trim().toUpperCase();
    const found = findEquipeByCodigo(codigo);
    if (!found) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
    const { equipe, rodada } = found;
    atualizarStatusRodada(rodada);
    saveDB(db);
    const prog = progressoEquipe(equipe, rodada);
    if (!prog.percursoCompleto) return jsonResponse(res, 403, { erro: 'Ainda faltam salas no percurso.', progresso: prog });
    if (rodada.status !== 'percurso_concluido' && rodada.status !== 'finalizada') {
      return jsonResponse(res, 403, { erro: 'Aguarde a outra equipe terminar o percurso para liberar o tesouro.', progresso: prog });
    }
    const bau = db.baus.find(b => b.id === equipe.bauId) || db.baus[0];
    if (!bau) return jsonResponse(res, 500, { erro: 'Baú não configurado.' });
    return jsonResponse(res, 200, { sucesso: true, bauNome: bau.nome, enigmaFinal: bau.enigmaFinal, pontos: equipe.pontos || 0, recompensaEntregue: !!equipe.recompensaEntregue });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!checkAdmin(req) && pathname !== '/api/admin/login') return jsonResponse(res, 401, { erro: 'Não autorizado.' });

    if (pathname === '/api/admin/login' && method === 'POST') {
      const body = await parseBody(req);
      if (body.senha === db.config.senhaAdmin) return jsonResponse(res, 200, { sucesso: true });
      return jsonResponse(res, 401, { erro: 'Senha incorreta.' });
    }

    if (pathname === '/api/admin/dashboard' && method === 'GET') {
      return jsonResponse(res, 200, {
        jogoAberto: db.config.jogoAberto,
        totalRodadas: db.rodadas.length,
        emAndamento: db.rodadas.filter(r => r.status === 'em_andamento').length,
        percursoOk: db.rodadas.filter(r => r.status === 'percurso_concluido').length,
        finalizadas: db.rodadas.filter(r => r.status === 'finalizada').length,
        totalSalas: getSalasOrdenadas().length
      });
    }

    if (pathname === '/api/admin/jogo' && method === 'POST') {
      const body = await parseBody(req);
      if (typeof body.aberto === 'boolean') { db.config.jogoAberto = body.aberto; saveDB(db); }
      return jsonResponse(res, 200, { sucesso: true, jogoAberto: db.config.jogoAberto });
    }

    if (pathname === '/api/admin/rodadas' && method === 'GET') {
      const lista = db.rodadas.slice().sort((a, b) => (a.numero || 0) - (b.numero || 0)).map(r => ({
        id: r.id, numero: r.numero, status: r.status, salaAtualOrdem: r.salaAtualOrdem || 1,
        percursoLiberadoEm: r.percursoLiberadoEm || null,
        equipes: (r.equipes || []).map(e => ({
          id: e.id, codigo: e.codigo, nome: e.nome, pontos: e.pontos || 0,
          qtdConcluidas: (e.salasConcluidas || []).length, percursoCompleto: !!e.percursoCompleto,
          tesouroEncontrado: !!e.tesouroEncontrado, recompensaEntregue: !!e.recompensaEntregue, bauId: e.bauId
        }))
      }));
      return jsonResponse(res, 200, { rodadas: lista, podeCriarProxima: podeCriarProximaRodada() });
    }

    if (pathname === '/api/admin/rodadas' && method === 'POST') {
      const body = await parseBody(req);
      const numero = proximoNumeroRodada();
      const eq1Codigo = (body.equipe1Codigo || ('R' + numero + '-A')).toUpperCase().trim();
      const eq2Codigo = (body.equipe2Codigo || ('R' + numero + '-B')).toUpperCase().trim();
      if (findEquipeByCodigo(eq1Codigo) || findEquipeByCodigo(eq2Codigo)) return jsonResponse(res, 400, { erro: 'Código de equipe já em uso.' });
      if (eq1Codigo === eq2Codigo) return jsonResponse(res, 400, { erro: 'Códigos das equipes devem ser diferentes.' });
      const nova = {
        id: 'rod-' + crypto.randomBytes(4).toString('hex'),
        numero, status: 'em_andamento', salaAtualOrdem: 1, criadaEm: new Date().toISOString(),
        equipes: [
          { id: 'eq-' + crypto.randomBytes(3).toString('hex'), codigo: eq1Codigo, nome: body.equipe1Nome || ('Equipe A — Rodada ' + numero), qtdIntegrantes: 5, bauId: 'A', pontos: 0, salasConcluidas: [], percursoCompleto: false, tesouroEncontrado: false, recompensaEntregue: false },
          { id: 'eq-' + crypto.randomBytes(3).toString('hex'), codigo: eq2Codigo, nome: body.equipe2Nome || ('Equipe B — Rodada ' + numero), qtdIntegrantes: 5, bauId: 'A', pontos: 0, salasConcluidas: [], percursoCompleto: false, tesouroEncontrado: false, recompensaEntregue: false }
        ]
      };
      db.rodadas.push(nova);
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true, rodada: nova });
    }

    if (pathname === '/api/admin/rodadas/tesouro' && method === 'POST') {
      const body = await parseBody(req);
      const found = findEquipeByCodigo(body.codigo);
      if (!found) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
      const { equipe, rodada } = found;
      equipe.tesouroEncontrado = true;
      equipe.recompensaEntregue = true;
      equipe.tesouroEm = new Date().toISOString();
      atualizarStatusRodada(rodada);
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/rodadas/delete' && method === 'POST') {
      const body = await parseBody(req);
      const idx = db.rodadas.findIndex(r => r.id === body.id);
      if (idx === -1) return jsonResponse(res, 404, { erro: 'Rodada não encontrada.' });
      db.rodadas.splice(idx, 1);
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/salas' && method === 'GET') {
      return jsonResponse(res, 200, { salas: db.salas });
    }

    if (pathname === '/api/admin/salas' && method === 'POST') {
      const body = await parseBody(req);
      if (body.id) {
        const idx = db.salas.findIndex(s => s.id === body.id);
        if (idx >= 0) {
          db.salas[idx] = { ...db.salas[idx], ...body };
          if (body.slug) db.salas[idx].slug = normalizeSlug(body.slug);
          saveDB(db);
        }
      }
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/baus' && method === 'GET') return jsonResponse(res, 200, { baus: db.baus });
    if (pathname === '/api/admin/baus' && method === 'POST') {
      const body = await parseBody(req);
      if (Array.isArray(body.baus)) { db.baus = body.baus; saveDB(db); }
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/pistas' && method === 'GET') return jsonResponse(res, 200, { pistas: db.pistas });
    if (pathname === '/api/admin/pistas' && method === 'POST') {
      const body = await parseBody(req);
      if (Array.isArray(body.pistas)) { db.pistas = body.pistas; saveDB(db); }
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/export' && method === 'GET') return jsonResponse(res, 200, db);
    if (pathname === '/api/admin/import' && method === 'POST') {
      const body = await parseBody(req);
      if (!body || !body.salas) return jsonResponse(res, 400, { erro: 'Arquivo inválido.' });
      const senha = db.config.senhaAdmin;
      db = body;
      if (!db.config) db.config = {};
      db.config.senhaAdmin = senha;
      if (!Array.isArray(db.rodadas)) db.rodadas = [];
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true });
    }
  }

  return jsonResponse(res, 404, { erro: 'Rota não encontrada.' });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = parsed.pathname || '/';
  if (pathname.startsWith('/api/')) {
    try { await handleAPI(req, res, pathname); }
    catch (err) { console.error(err); jsonResponse(res, 500, { erro: 'Erro interno.' }); }
    return;
  }
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';
  let filePath = path.join(ROOT, pathname);
  if (pathname.startsWith('/sala/')) filePath = path.join(ROOT, 'sala.html');
  const ext = path.extname(filePath).toLowerCase();
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Missões ExporTech 2026 → porta ' + PORT);
});
