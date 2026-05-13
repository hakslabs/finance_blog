# Finance_lab Web

React + Vite frontend for Finance_lab.

## Local Development

From the repository root:

```bash
cp .env.example .env
cd web
npm install
npm run dev
```

The Vite app reads root environment variables through `vite.config.ts` with `envDir: ".."`.

## Verification

```bash
npm run lint
npm run build
```
