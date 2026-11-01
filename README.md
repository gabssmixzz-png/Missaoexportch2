# Missão Expor Tech

Sistema web de caça ao tesouro para feira escolar.

Os participantes visitam salas, resolvem desafios e coletam pistas digitais.  
Ao final, cada equipe descobre a localização de um dos dois baús escondidos.

## Funcionalidades

- Progresso **compartilhado** por código de equipe (salvo no servidor)
- Ordem livre de salas
- Pistas sequenciais (baseadas na quantidade de salas concluídas)
- Dois baús com enigmas finais diferentes
- Painel administrativo completo
- Geração de QR Codes
- Interface mobile-first em português

## Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/SEU-USUARIO/missao-expor-tech.git
cd missao-expor-tech

# 2. Inicie o servidor
npm start
```

Acesse:
- **Participantes:** http://localhost:3000
- **Admin:** http://localhost:3000/admin  
  Senha padrão: `exportech2026`

## Códigos de demonstração

| Código     | Equipe        | Baú |
|------------|---------------|-----|
| FALCAO-01  | Equipe Falcão | A   |
| CORUJA-02  | Equipe Coruja | B   |
| LOBO-03    | Equipe Lobo   | A   |

## URLs das salas (para QR Codes)

- `/sala/robotica`
- `/sala/programacao`
- `/sala/ia`
- `/sala/redes`
- `/sala/hardware`

## Respostas dos desafios (demo)

| Sala            | Respostas aceitas                    |
|-----------------|--------------------------------------|
| Robótica        | ultrassom, sonar                     |
| Programação     | 32                                   |
| IA              | ai                                   |
| Redes           | https                                |
| Hardware        | processador, cpu                     |

## Hospedagem recomendada (Render)

1. Crie conta em [render.com](https://render.com)
2. New → Web Service
3. Conecte o repositório do GitHub
4. Configure:
   - **Build Command:** (deixe vazio)
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Clique em **Create Web Service**

Pronto! O Render vai gerar uma URL pública.

## Estrutura do projeto

```
missao-expor-tech/
├── server.js          # Backend completo
├── package.json
├── public/            # Frontend
│   ├── index.html     # Passaporte + painel da equipe
│   ├── sala.html      # Página do desafio
│   ├── admin/         # Painel da organização
│   ├── css/
│   └── js/
└── data/              # Banco de dados (criado automaticamente)
```

## Personalização

Edite o arquivo `data/db.json` (depois de rodar uma vez) ou use o painel admin para:
- Criar equipes
- Alterar salas e desafios
- Configurar os baús e enigmas finais
- Abrir/fechar o jogo

## Licença

MIT
