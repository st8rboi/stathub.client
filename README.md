# stathub.client

Монорепо клиентских приложений Stathub (см. `../stathub.server/documentation/doc.md`).

## Структура

```
apps/
  web/     — Vite + React + TypeScript (SPA)
  mobile/  — Expo (React Native) + TypeScript
```

## Разработка

```
corepack enable           # один раз, включает pnpm через corepack
pnpm install               # из корня — ставит зависимости обоих приложений

pnpm dev:web                # apps/web    — http://localhost:5173
pnpm dev:mobile             # apps/mobile — Expo dev server (QR-код / симулятор)
```

`apps/web` — админка организатора (лиги, турниры, этапы). Запросы `/api/*` проксируются Vite на бэкенд
`http://localhost:5248` (см. `apps/web/vite.config.ts`), поэтому перед `pnpm dev:web` нужно запустить `Stathub.WebApi`.
Пока нет Identity, организатор задаётся GUID-ом в шапке страницы (хранится в localStorage).
