# Mini Plataforma de Testes A/B (Next.js 14 + Prisma + NextAuth)

Stack:
- Next.js 14 (App Router, TypeScript) + Tailwind
- Prisma ORM com MySQL (Hostinger)
- NextAuth (Credentials: email + senha via bcrypt)
- Chart.js para gráficos (via react-chartjs-2)
- Realtime por SSE (Server-Sent Events)
- Sem serviços externos

Requisitos atendidos:
- CRUD de experimentos/variantes (dashboard + API)
- middleware decide variante em `/go/[slug]`, define cookies HttpOnly e registra sessão inicial (session + pageview)
- Tracking de eventos (pageview, click, conversion) com anti-bot simples e IP hash (SHA-256)
- Dashboard protegido com NextAuth (login via `/login`)
- SSE em `/api/realtime` envia agregados (15 min + dia), atualiza a cada 2s
- Botão para definir vencedora (primary_variant_id) no detalhe
- Cookies HttpOnly, SameSite=Lax, sem IP puro, CORS first-party

## Como usar (Hostinger + local)

1) Criar DB MySQL na Hostinger
- No painel, crie banco, usuário e senha.
- Pegue Host (ex: `mysqlXXX.hostinger.com`), Porta (geralmente 3306), Nome do DB, Usuário, Senha.

2) Configurar `.env`
- Copie `.env.example` para `.env` e preencha:
```
DATABASE_URL="mysql://USER:PASS@HOST:PORT/DBNAME"
NEXTAUTH_SECRET="gerar_um_segredo_seguro"
NEXTAUTH_URL="http://localhost:3000"
```

3) Instalar e migrar
```
npm install
npx prisma migrate dev
npm run seed
```

4) Rodar em dev
```
npm run dev
```
- Acesse `/login` (user: `admin@example.com`, senha: `admin123`)
- Acesse `/dashboard/experiments` para ver o experimento inicial

5) Testar via embed (modo client_embed)
- Crie/edite um experimento com 1–3 URLs e selecione a “URL principal (entrypoint)”.
- Na tela de detalhes, clique em “Instalação do Snippet” e siga os passos:
  - Cole o script nas páginas do cliente (antes de `</body>`):
    `<script src="https://SEU_DOMINIO/embed/{experimentId}.js" data-exp-id="{experimentId}" data-entry-url="{entry_url}"></script>`
    e o marcador `<!-- AB-EXPERIMENT:{experimentId} -->`.
  - Use o validador para checar a instalação.
- Acesse diretamente a URL principal do cliente: o script chamará `/api/allocate`, definirá a variante por `sid` e redirecionará (se necessário). Stickiness é mantida.

6) Vencedora pós-teste
- Ajuste `end_at` no dashboard (via API/DB) para passado e selecione `primary_variant_id` na tela de detalhes.
- Novas sessões vão 100% para a vencedora; sessões antigas preservam stickiness.

## Injeção do snippet nas variantes
Se você controla a página de destino, inclua (no HTML/JSX) após o `<body>`:
```tsx
import TrackSnippet from "@/components/TrackSnippet";

// ...
<TrackSnippet experimentId={EXPERIMENT_ID} />
```
Ele envia `pageview` no load, captura cliques em `[data-track="nome"]` e conversões ao submeter `[data-conversion-form]` via `navigator.sendBeacon`.

## Endpoints principais
- `POST /api/track` — `{ type: 'pageview'|'click'|'conversion', experimentId, variantName, sid, ts?, props?, sessionInit? }`
- `GET /api/realtime?experimentId=...` — SSE com agregados
- `GET /api/allocate?experimentId=...&sid=...&current=...` — Aloca variante e cria sessão
- `GET /embed/{experimentId}.js` — Script de embed
- `POST /api/validate-installation` — Valida se o snippet está presente numa URL
- `GET/POST /api/experiments`
- `GET/PUT/DELETE /api/experiments/:id`
- `GET/POST /api/variants`
- `GET/PUT/DELETE /api/variants/:id`

## Observações
- Modo novo: `client_embed` — o snippet roda no site do cliente e chama `/api/allocate` e `/api/track` (CORS por allowlist em `CORS_ALLOWED_ORIGINS`).
- Modo antigo permanece: `legacy_slug` via `/go/{slug}` (middleware) — compatível.
- Cookies: no cliente, `sid` e `exp_{id}_var` são cookies não-HttpOnly + localStorage. No backend, IP é armazenado apenas como hash (SHA-256).
- SSE atualiza a cada 2s; o dashboard consome e plota com Chart.js.
- Filtro anti-bot por User-Agent (melhorado). 
