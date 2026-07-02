# Bolão da Administração

PWA completa para bolão de placar com palpites, Pix, painel administrativo, ranking, heatmap, simulador e acompanhamento do jogo em tempo real.

## Estrutura

```text
src/
  index.html
  admin.html
  palpite.html
  ranking.html
  jogo.html
  style.css
  app.js
  firebase.js
  database.js
  charts.js
  utils.js
  manifest.webmanifest
  sw.js
  assets/
    icons/
    logos/
    bandeiras/
firebase.rules
```

## Como rodar localmente

Use um servidor estático, porque os módulos JavaScript ES precisam ser carregados por HTTP.

```bash
cd src
python -m http.server 5173
```

Acesse `http://localhost:5173`.

Sem Firebase configurado, as telas públicas entram em modo demonstração com `localStorage`, mantendo os dados no navegador. O painel administrativo exige Firebase Authentication real.

## Configurar Firebase

1. Crie um projeto no Firebase.
2. Ative Authentication com provedor Email/Senha.
3. Crie o usuário administrador `gustavoitalo1224@gmail.com` diretamente no Firebase Authentication.
4. Ative Firestore Database.
5. Ative Storage se quiser enviar imagens reais futuramente.
6. Em `src/firebase.js`, substitua `FIREBASE_CONFIG` pelos dados do seu projeto.
7. Publique as regras de `firebase.rules` no Firestore.

O app detecta automaticamente quando a configuração é válida e passa a usar Firestore com snapshot listeners em tempo real.

## Acesso administrativo

O painel administrativo usa Firebase Authentication com e-mail e senha. A constante `ADMIN_EMAIL` fica em `src/auth.js` e atualmente permite somente `gustavoitalo1224@gmail.com`.

A senha nunca deve ser colocada no código. Cadastre ou altere a senha apenas no painel do Firebase Authentication.

## Hospedar no GitHub Pages

1. Envie este projeto para um repositório.
2. Em **Settings > Pages**, selecione a branch principal.
3. Configure a pasta publicada como `/src`, ou publique a raiz e use o redirecionamento de `index.html`.

## Modelo de dados Firestore

Coleções principais:

- `games`: jogos cadastrados pelo administrador.
- `bets`: palpites dos participantes, vinculados por `gameId`.
- `notifications`: notificações internas do sistema.

Campos essenciais de `games`:

- `teamHome`, `teamAway`
- `date`, `time`, `location`
- `betValue`, `pixKey`, `pixPayload`
- `currentHomeScore`, `currentAwayScore`
- `matchStatus`, `matchMinute`
- `isOpen`, `active`
- `championship`, `prizePercent`

Campos essenciais de `bets`:

- `gameId`, `name`, `phone`, `environment`
- `homeScore`, `awayScore`
- `notes`, `paymentStatus`
- `createdAt`

## Segurança

As regras incluídas permitem leitura pública para consultas, criação pública de palpites pendentes e restringem edições sensíveis ao usuário autenticado com o e-mail administrador.
