/**
 * Missão Expor Tech - Versão FLAT (arquivos na raiz)
 * Funciona com a estrutura que você subiu no GitHub
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
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
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
      nomeEvento: 'Missões ExporTech 2026',
      modoTeste: false
    },
    salas: [
      {
        id: 'sala-robotica',
        slug: 'robotica',
        nome: 'Sala de Robótica',
        desafio: 'Qual o nome do sensor que permite ao robô “enxergar” obstáculos à frente usando ondas sonoras?',
        respostas: ['ultrassom', 'sensor ultrassonico', 'ultrassônico', 'sonar', 'sensor de ultrassom'],
        ajuda: 'Pense no mesmo princípio usado por morcegos e submarinos.',
        obrigatoria: true,
        ordem: 1
      },
      {
        id: 'sala-programacao',
        slug: 'programacao',
        nome: 'Sala de Programação',
        desafio: 'Complete a sequência lógica: 2, 4, 8, 16, __',
        respostas: ['32', 'trinta e dois'],
        ajuda: 'Cada número é o dobro do anterior.',
        obrigatoria: true,
        ordem: 2
      },
      {
        id: 'sala-ia',
        slug: 'ia',
        nome: 'Sala de Inteligência Artificial',
        desafio: 'Qual a sigla em inglês para “Inteligência Artificial”?',
        respostas: ['ai', 'a.i.', 'a i'],
        ajuda: 'Duas letras muito famosas no mundo da tecnologia.',
        obrigatoria: true,
        ordem: 3
      },
      {
        id: 'sala-redes',
        slug: 'redes',
        nome: 'Sala de Redes',
        desafio: 'Qual protocolo é usado para transferir páginas web de forma segura (o “cadeado” do navegador)?',
        respostas: ['https', 'http seguro', 'hypertext transfer protocol secure'],
        ajuda: 'Começa com HTTP e tem um “S” no final.',
        obrigatoria: true,
        ordem: 4
      },
      {
        id: 'sala-hardware',
        slug: 'hardware',
        nome: 'Sala de Hardware',
        desafio: 'Qual componente é considerado o “cérebro” do computador?',
        respostas: ['processador', 'cpu', 'unidade central de processamento', 'microprocessador'],
        ajuda: 'É a peça que executa as instruções dos programas.',
        obrigatoria: true,
        ordem: 5
      }
    ],
    pistas: [
      { ordem: 1, texto: 'Bem-vindos à Missões ExporTech 2026! Vocês receberam o passaporte de agentes secretos. Visitem as salas, resolvam os desafios e coletem as pistas. A ordem das salas é livre. Boa sorte, agentes!' },
      { ordem: 2, texto: 'Pista 2: O código está escondido entre circuitos e ideias. Continuem investigando as salas restantes.' },
      { ordem: 3, texto: 'Pista 3: Cada desafio resolvido aproxima vocês do baú. Não deixem nenhuma sala para trás.' },
      { ordem: 4, texto: 'Pista 4: A tecnologia revela segredos apenas para quem observa com atenção. Falta pouco!' },
      { ordem: 5, texto: 'Pista 5: Vocês estão quase lá. Quando todas as salas obrigatórias forem concluídas, o enigma final será revelado.' },
      { ordem: 6, texto: 'Pista final intermediária: O baú espera por agentes que completaram a missão. Preparem-se para o enigma decisivo.' }
    ],
    baus: [
      {
        id: 'A',
        nome: 'Baú do Código Fonte',
        local: 'Atrás do mural de projetos no corredor principal (próximo à sala dos professores)',
        enigmaFinal: 'O baú do Código Fonte está escondido atrás do mural de projetos no corredor principal, perto da sala dos professores. Procurem com atenção e mostrem este enigma a um responsável para receber a recompensa!'
      },
      {
        id: 'B',
        nome: 'Baú do Hardware Lendário',
        local: 'Dentro da caixa de ferramentas da oficina de eletrônica (pedir ao monitor da oficina)',
        enigmaFinal: 'O baú do Hardware Lendário está dentro da caixa de ferramentas da oficina de eletrônica. Peçam ao monitor da oficina e mostrem este enigma para resgatar a recompensa!'
      }
    ],
    equipes: [
      {
        id: 'eq1',
        codigo: 'FALCAO-01',
        nome: 'Equipe Falcão',
        qtdIntegrantes: 5,
        bauId: 'A',
        recompensaEntregue: false,
        modoTeste: false,
        salasConcluidas: [],
        criadaEm: new Date().toISOString()
      },
      {
        id: 'eq2',
        codigo: 'CORUJA-02',
        nome: 'Equipe Coruja',
        qtdIntegrantes: 5,
        bauId: 'B',
        recompensaEntregue: false,
        modoTeste: false,
        salasConcluidas: [],
        criadaEm: new Date().toISOString()
      },
      {
        id: 'eq3',
        codigo: 'LOBO-03',
        nome: 'Equipe Lobo',
        qtdIntegrantes: 4,
        bauId: 'A',
        recompensaEntregue: false,
        modoTeste: false,
        salasConcluidas: [],
        criadaEm: new Date().toISOString()
      }
    ]
  };
}

let db = loadDB();
// Garante a senha da coordenação (mesmo se o db.json antigo tiver outra)
db.config.senhaAdmin = 'coordenacaoexportech2026nesia';
if (!fs.existsSync(DB_FILE)) {
  saveDB(db);
  console.log('Banco de dados inicial criado.');
} else {
  saveDB(db); // persiste a nova senha
}


function pickDesafioForTeam(sala, codigo) {
  // Prefer array de desafios (variantes). Se não houver, usa o desafio único.
  let lista = Array.isArray(sala.desafios) && sala.desafios.length
    ? sala.desafios
    : [{ pergunta: sala.desafio, respostas: sala.respostas || [], ajuda: sala.ajuda || '' }];

  if (!codigo || lista.length === 1) return lista[0];

  // Escolha determinística por equipe (mesmo código = mesma pergunta sempre)
  let hash = 0;
  const s = (codigo + '|' + (sala.slug || sala.id)).toUpperCase();
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  const idx = Math.abs(hash) % lista.length;
  return lista[idx];
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

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function getEquipeByCodigo(codigo) {
  if (!codigo) return null;
  return db.equipes.find(e => e.codigo.toUpperCase() === codigo.toUpperCase().trim());
}

function getSalasObrigatorias() {
  return db.salas.filter(s => s.obrigatoria);
}

function getProgressoEquipe(equipe) {
  const salasObrigatorias = getSalasObrigatorias();
  const concluidasIds = new Set((equipe.salasConcluidas || []).map(c => c.salaId));
  const concluidas = salasObrigatorias.filter(s => concluidasIds.has(s.id));
  const pendentes = salasObrigatorias.filter(s => !concluidasIds.has(s.id));
  const qtdConcluidas = concluidas.length;
  const total = salasObrigatorias.length;
  const finalLiberado = qtdConcluidas >= total && total > 0;

  const pistasLiberadas = [];
  for (let i = 1; i <= Math.min(qtdConcluidas + 1, db.pistas.length); i++) {
    const p = db.pistas.find(x => x.ordem === i);
    if (p) pistasLiberadas.push(p);
  }

  return {
    qtdConcluidas,
    total,
    concluidas: concluidas.map(s => ({ id: s.id, nome: s.nome })),
    pendentes: pendentes.map(s => ({ id: s.id, nome: s.nome, slug: s.slug })),
    pistasLiberadas,
    finalLiberado,
    recompensaEntregue: !!equipe.recompensaEntregue
  };
}

async function handleAPI(req, res, pathname) {
  const method = req.method;

  if (method === 'OPTIONS') {
    return jsonResponse(res, 200, {});
  }

  if (pathname === '/api/status' && method === 'GET') {
    return jsonResponse(res, 200, {
      jogoAberto: db.config.jogoAberto,
      nomeEvento: db.config.nomeEvento,
      totalSalas: getSalasObrigatorias().length
    });
  }

  if (pathname === '/api/equipe/entrar' && method === 'POST') {
    const body = await parseBody(req);
    const codigo = (body.codigo || '').trim().toUpperCase();
    if (!codigo) return jsonResponse(res, 400, { erro: 'Informe o código da equipe.' });

    if (!db.config.jogoAberto) {
      return jsonResponse(res, 403, { erro: 'O jogo está fechado no momento.' });
    }

    const equipe = getEquipeByCodigo(codigo);
    if (!equipe) {
      return jsonResponse(res, 404, { erro: 'Código de equipe não encontrado.' });
    }

    const progresso = getProgressoEquipe(equipe);
    return jsonResponse(res, 200, {
      sucesso: true,
      equipe: {
        codigo: equipe.codigo,
        nome: equipe.nome,
        qtdIntegrantes: equipe.qtdIntegrantes
      },
      progresso
    });
  }

  if (pathname === '/api/equipe/progresso' && method === 'GET') {
    const parsed = url.parse(req.url, true);
    const codigo = (parsed.query.codigo || '').trim().toUpperCase();
    const equipe = getEquipeByCodigo(codigo);
    if (!equipe) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });

    return jsonResponse(res, 200, {
      equipe: { codigo: equipe.codigo, nome: equipe.nome },
      progresso: getProgressoEquipe(equipe)
    });
  }

  if (pathname.startsWith('/api/sala/') && method === 'GET') {
    const slug = pathname.replace('/api/sala/', '').split('/')[0];
    const sala = db.salas.find(s => s.slug === slug || s.id === slug);
    if (!sala) return jsonResponse(res, 404, { erro: 'Sala não encontrada.' });

    const parsed = url.parse(req.url, true);
    const codigo = (parsed.query.codigo || '').trim().toUpperCase();
    let jaConcluida = false;
    let equipe = null;
    let bloqueada = false;
    let salaAtivaNome = null;

    if (codigo) {
      equipe = getEquipeByCodigo(codigo);
      if (equipe) {
        jaConcluida = (equipe.salasConcluidas || []).some(c => c.salaId === sala.id);

        // Regra: só um desafio aberto por equipe por vez
        if (!jaConcluida && equipe.salaAtiva && equipe.salaAtiva !== sala.id) {
          const salaAtivaObj = db.salas.find(s => s.id === equipe.salaAtiva);
          // Se a sala ativa já foi concluída por algum motivo, limpa
          const ativaJaFeita = (equipe.salasConcluidas || []).some(c => c.salaId === equipe.salaAtiva);
          if (ativaJaFeita) {
            equipe.salaAtiva = null;
            saveDB(db);
          } else if (salaAtivaObj) {
            bloqueada = true;
            salaAtivaNome = salaAtivaObj.nome;
          } else {
            equipe.salaAtiva = null;
            saveDB(db);
          }
        }

        // Abre esta sala como ativa se não estiver bloqueada e não concluída
        if (!jaConcluida && !bloqueada) {
          if (equipe.salaAtiva !== sala.id) {
            equipe.salaAtiva = sala.id;
            saveDB(db);
          }
        }
      }
    }

    const desafioEscolhido = pickDesafioForTeam(sala, codigo);
    return jsonResponse(res, 200, {
      sala: {
        id: sala.id,
        slug: sala.slug,
        nome: sala.nome,
        desafio: bloqueada ? null : (desafioEscolhido.pergunta || desafioEscolhido.desafio || sala.desafio),
        ajuda: bloqueada ? null : (desafioEscolhido.ajuda || sala.ajuda || null)
      },
      jaConcluida,
      bloqueada,
      salaAtivaNome,
      precisaCodigo: !equipe
    });
  }

  if (pathname === '/api/sala/responder' && method === 'POST') {
    const body = await parseBody(req);
    const codigo = (body.codigo || '').trim().toUpperCase();
    const slug = (body.slug || body.salaId || '').trim();
    const resposta = (body.resposta || '').trim();

    if (!db.config.jogoAberto) {
      return jsonResponse(res, 403, { erro: 'O jogo está fechado.' });
    }

    const equipe = getEquipeByCodigo(codigo);
    if (!equipe) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });

    const sala = db.salas.find(s => s.slug === slug || s.id === slug);
    if (!sala) return jsonResponse(res, 404, { erro: 'Sala não encontrada.' });

    const jaConcluida = (equipe.salasConcluidas || []).some(c => c.salaId === sala.id);
    if (jaConcluida) {
      return jsonResponse(res, 200, {
        sucesso: false,
        jaConcluida: true,
        mensagem: 'Esta sala já foi concluída pela sua equipe. Procure outra sala!',
        progresso: getProgressoEquipe(equipe)
      });
    }

    // Só pode responder a sala ativa
    if (equipe.salaAtiva && equipe.salaAtiva !== sala.id) {
      const sa = db.salas.find(s => s.id === equipe.salaAtiva);
      return jsonResponse(res, 200, {
        sucesso: false,
        bloqueada: true,
        mensagem: 'Sua equipe ainda está no desafio da ' + (sa ? sa.nome : 'outra sala') + '. Concluam esse antes de abrir outro.',
        progresso: getProgressoEquipe(equipe)
      });
    }
    if (!equipe.salaAtiva) {
      equipe.salaAtiva = sala.id;
      saveDB(db);
    }

    const desafioEscolhido = pickDesafioForTeam(sala, codigo);
    const respostasValidas = desafioEscolhido.respostas || sala.respostas || [];
    const respNorm = normalizeAnswer(resposta);
    const correta = respostasValidas.some(r => normalizeAnswer(r) === respNorm);

    if (!correta) {
      return jsonResponse(res, 200, {
        sucesso: false,
        mensagem: 'Resposta incorreta. Tente novamente!',
        progresso: getProgressoEquipe(equipe)
      });
    }

    if (!equipe.salasConcluidas) equipe.salasConcluidas = [];
    equipe.salasConcluidas.push({
      salaId: sala.id,
      timestamp: new Date().toISOString()
    });
    // Libera a equipe para abrir outra sala
    equipe.salaAtiva = null;

    saveDB(db);

    const progresso = getProgressoEquipe(equipe);
    const novaPista = progresso.pistasLiberadas[progresso.pistasLiberadas.length - 1];

    return jsonResponse(res, 200, {
      sucesso: true,
      mensagem: 'Desafio concluído! Nova pista liberada.',
      novaPista: novaPista || null,
      progresso,
      finalLiberado: progresso.finalLiberado
    });
  }

  if (pathname === '/api/final' && method === 'GET') {
    const parsed = url.parse(req.url, true);
    const codigo = (parsed.query.codigo || '').trim().toUpperCase();
    const equipe = getEquipeByCodigo(codigo);
    if (!equipe) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });

    const progresso = getProgressoEquipe(equipe);
    if (!progresso.finalLiberado) {
      return jsonResponse(res, 403, {
        erro: 'Ainda faltam salas para concluir.',
        progresso
      });
    }

    const bau = db.baus.find(b => b.id === equipe.bauId);
    if (!bau) return jsonResponse(res, 500, { erro: 'Baú não configurado.' });

    return jsonResponse(res, 200, {
      sucesso: true,
      bauNome: bau.nome,
      enigmaFinal: bau.enigmaFinal,
      recompensaEntregue: equipe.recompensaEntregue
    });
  }

  function checkAdmin(req) {
    const pass = req.headers['x-admin-password'] || '';
    return pass === db.config.senhaAdmin;
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!checkAdmin(req) && pathname !== '/api/admin/login') {
      return jsonResponse(res, 401, { erro: 'Não autorizado.' });
    }

    if (pathname === '/api/admin/login' && method === 'POST') {
      const body = await parseBody(req);
      if (body.senha === db.config.senhaAdmin) {
        return jsonResponse(res, 200, { sucesso: true });
      }
      return jsonResponse(res, 401, { erro: 'Senha incorreta.' });
    }

    if (pathname === '/api/admin/dashboard' && method === 'GET') {
      const totalEquipes = db.equipes.filter(e => !e.modoTeste).length;
      const comProgresso = db.equipes.filter(e => (e.salasConcluidas || []).length > 0).length;
      const finalizadas = db.equipes.filter(e => getProgressoEquipe(e).finalLiberado).length;
      const recompensas = db.equipes.filter(e => e.recompensaEntregue).length;

      return jsonResponse(res, 200, {
        jogoAberto: db.config.jogoAberto,
        totalEquipes,
        comProgresso,
        finalizadas,
        recompensas,
        totalSalas: db.salas.length,
        salasObrigatorias: getSalasObrigatorias().length
      });
    }

    if (pathname === '/api/admin/equipes' && method === 'GET') {
      const lista = db.equipes.map(e => {
        const prog = getProgressoEquipe(e);
        return {
          id: e.id,
          codigo: e.codigo,
          nome: e.nome,
          qtdIntegrantes: e.qtdIntegrantes,
          bauId: e.bauId,
          recompensaEntregue: e.recompensaEntregue,
          modoTeste: e.modoTeste,
          qtdConcluidas: prog.qtdConcluidas,
          total: prog.total,
          finalLiberado: prog.finalLiberado,
          salasConcluidas: prog.concluidas
        };
      });
      return jsonResponse(res, 200, { equipes: lista });
    }

    if (pathname === '/api/admin/equipes' && method === 'POST') {
      const body = await parseBody(req);
      const codigo = (body.codigo || '').trim().toUpperCase();
      if (!codigo) return jsonResponse(res, 400, { erro: 'Código obrigatório.' });

      const existente = getEquipeByCodigo(codigo);
      if (existente && !body.id) {
        return jsonResponse(res, 400, { erro: 'Já existe uma equipe com este código.' });
      }

      let bauId = body.bauId;
      if (!bauId) {
        const contA = db.equipes.filter(e => e.bauId === 'A' && !e.modoTeste).length;
        const contB = db.equipes.filter(e => e.bauId === 'B' && !e.modoTeste).length;
        bauId = contA <= contB ? 'A' : 'B';
      }

      if (body.id) {
        const eq = db.equipes.find(e => e.id === body.id);
        if (!eq) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
        eq.nome = body.nome || eq.nome;
        eq.qtdIntegrantes = body.qtdIntegrantes || eq.qtdIntegrantes;
        if (body.bauId) eq.bauId = body.bauId;
      } else {
        const nova = {
          id: 'eq' + crypto.randomBytes(4).toString('hex'),
          codigo,
          nome: body.nome || `Equipe ${codigo}`,
          qtdIntegrantes: body.qtdIntegrantes || 5,
          bauId,
          recompensaEntregue: false,
          modoTeste: !!body.modoTeste,
          salasConcluidas: [],
          salaAtiva: null,
          criadaEm: new Date().toISOString()
        };
        db.equipes.push(nova);
      }
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true });
    }


    if (pathname === '/api/admin/equipes/delete' && method === 'POST') {
      const body = await parseBody(req);
      const codigo = (body.codigo || '').trim().toUpperCase();
      const idx = db.equipes.findIndex(e => e.codigo.toUpperCase() === codigo);
      if (idx < 0) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
      db.equipes.splice(idx, 1);
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/recompensa' && method === 'POST') {
      const body = await parseBody(req);
      const equipe = getEquipeByCodigo(body.codigo);
      if (!equipe) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
      if (equipe.recompensaEntregue) {
        return jsonResponse(res, 400, { erro: 'Recompensa já registrada.' });
      }
      equipe.recompensaEntregue = true;
      equipe.recompensaEm = new Date().toISOString();
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/jogo' && method === 'POST') {
      const body = await parseBody(req);
      if (typeof body.aberto === 'boolean') {
        db.config.jogoAberto = body.aberto;
        saveDB(db);
      }
      return jsonResponse(res, 200, { jogoAberto: db.config.jogoAberto });
    }

    if (pathname === '/api/admin/salas' && method === 'GET') {
      return jsonResponse(res, 200, { salas: db.salas });
    }


    if (pathname === '/api/admin/salas' && method === 'POST') {
      const body = await parseBody(req);
      if (body.id) {
        const s = db.salas.find(x => x.id === body.id);
        if (!s) return jsonResponse(res, 404, { erro: 'Sala não encontrada.' });
        if (body.nome) s.nome = body.nome;
        if (body.slug) s.slug = body.slug;
        if (body.desafio !== undefined) s.desafio = body.desafio;
        if (body.respostas) s.respostas = body.respostas;
        if (body.ajuda !== undefined) s.ajuda = body.ajuda;
        if (typeof body.obrigatoria === 'boolean') s.obrigatoria = body.obrigatoria;
        if (Array.isArray(body.desafios)) s.desafios = body.desafios;
      } else {
        const nova = {
          id: 'sala-' + crypto.randomBytes(3).toString('hex'),
          slug: body.slug || (body.nome || '').toLowerCase().replace(/\s+/g, '-'),
          nome: body.nome || 'Nova sala',
          desafio: body.desafio || '',
          respostas: body.respostas || [],
          ajuda: body.ajuda || '',
          desafios: body.desafios || [],
          obrigatoria: body.obrigatoria !== false,
          ordem: db.salas.length + 1
        };
        db.salas.push(nova);
      }
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true, salas: db.salas });
    }


    if (pathname === '/api/admin/salas/delete' && method === 'POST') {
      const body = await parseBody(req);
      const idx = db.salas.findIndex(s => s.id === body.id);
      if (idx < 0) return jsonResponse(res, 404, { erro: 'Sala não encontrada.' });
      db.salas.splice(idx, 1);
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true, salas: db.salas });
    }

    if (pathname === '/api/admin/pistas' && method === 'GET') {
      return jsonResponse(res, 200, { pistas: db.pistas });
    }


    if (pathname === '/api/admin/pistas' && method === 'POST') {
      const body = await parseBody(req);
      if (Array.isArray(body.pistas)) {
        db.pistas = body.pistas;
        saveDB(db);
      }
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/baus' && method === 'GET') {
      return jsonResponse(res, 200, { baus: db.baus });
    }

    
    if (pathname === '/api/admin/baus' && method === 'POST') {
      const body = await parseBody(req);
      if (Array.isArray(body.baus)) {
        db.baus = body.baus;
        saveDB(db);
      }
      return jsonResponse(res, 200, { sucesso: true });
    }

if (pathname === '/api/admin/reset-equipe' && method === 'POST') {
      const body = await parseBody(req);
      const equipe = getEquipeByCodigo(body.codigo);
      if (!equipe) return jsonResponse(res, 404, { erro: 'Equipe não encontrada.' });
      equipe.salasConcluidas = [];
      equipe.recompensaEntregue = false;
      equipe.salaAtiva = null;
      saveDB(db);
      return jsonResponse(res, 200, { sucesso: true });
    }

    if (pathname === '/api/admin/config' && method === 'GET') {
      return jsonResponse(res, 200, {
        nomeEvento: db.config.nomeEvento,
        jogoAberto: db.config.jogoAberto
      });
    }
  }

  return jsonResponse(res, 404, { erro: 'Rota não encontrada.' });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = parsed.pathname;

  // API
  if (pathname.startsWith('/api/')) {
    try {
      await handleAPI(req, res, pathname);
    } catch (err) {
      console.error(err);
      jsonResponse(res, 500, { erro: 'Erro interno.' });
    }
    return;
  }

  // Arquivos estáticos na RAIZ
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';

  // Mapeamento para a estrutura flat
  let filePath = path.join(ROOT, pathname);

  // Suporte a /sala/xxx → sala.html
  if (pathname.startsWith('/sala/')) {
    filePath = path.join(ROOT, 'sala.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Missões ExporTech 2026 rodando em http://localhost:${PORT}`);
  console.log(`   Página inicial: http://localhost:${PORT}/`);
  console.log(`   Painel admin: http://localhost:${PORT}/admin`);
  console.log(`   Senha admin: coordenacaoexportech2026nesia\n`);
});
