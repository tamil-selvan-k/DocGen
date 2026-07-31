# DocGen AI

Automated documentation management powered by Google Gemini. When code is pushed to a GitHub repository with the GitHub App installed, DocGen AI fetches the commit diff, generates updated documentation, validates it against the actual code to prevent hallucinations, and opens a pull request — all automatically.

## How it works

1. Developer pushes code to a GitHub repository
2. GitHub App sends a webhook to DocGen AI
3. A BullMQ worker fetches the diff, calls Gemini to generate docs, then validates the output
4. If validation passes, a branch is created and a PR is opened with the updated `README.md` or `docs/API.md`
5. The developer reviews and merges the PR

Documentation can also be triggered manually from the web dashboard.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS v4 |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL via Prisma v6 |
| Queue | BullMQ backed by Redis |
| AI | Google Gemini API |
| Auth | JWT (HTTP-only cookies) |
| GitHub | OAuth App + GitHub App (webhooks, installation tokens) |

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (default port 5422 in dev)
- Redis (default port 6379)
- A GitHub OAuth App
- A GitHub App with webhook configured
- A Google Gemini API key

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd Automated_Docs_Management

# Install server dependencies
cd server && pnpm install

# Install client dependencies
cd ../client && pnpm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in all required values (see `.env.example` for the full list).

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — min 8 chars
- `JWT_REFRESH_SECRET` — min 8 chars
- `SERVER_URL` — public URL of the backend (e.g. `http://localhost:5000`)
- `CLIENT_URL` — public URL of the frontend (e.g. `http://localhost:5173`)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth App credentials
- `GITHUB_APP_ID` / `GITHUB_PRIVATE_KEY` — GitHub App credentials (key is Base64-encoded PEM)
- `GITHUB_WEBHOOK_SECRET` — HMAC secret set in your GitHub App webhook settings
- `GEMINI_API_KEY` — Google AI Studio API key

### 3. Set up the database

```bash
cd server
pnpm exec prisma db push
```

### 4. GitHub App setup

1. Create a GitHub App at `github.com/settings/apps`
2. Set the webhook URL to `https://<your-server>/api/v1/webhooks/github`
3. Subscribe to **Push** and **Installation** events
4. Generate a private key, Base64-encode it: `base64 -w 0 private-key.pem`
5. Set `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, and `GITHUB_WEBHOOK_SECRET` in `.env`

### 5. Run in development

```bash
# Terminal 1 — backend
cd server && pnpm dev

# Terminal 2 — frontend
cd client && pnpm dev
```

The API runs on `http://localhost:5000` and the frontend on `http://localhost:5173`.

## Production build

```bash
# Build frontend
cd client && pnpm build

# Compile server
cd server && npx tsc

# Start server
cd server && pnpm start
```

## Running tests

```bash
cd server
node --import tsx/esm src/tests/foundation.test.ts
```

## API overview

All routes are prefixed with `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Register |
| POST | `/auth/login` | No | Login |
| POST | `/auth/logout` | No | Logout |
| GET | `/auth/me` | Cookie | Current user |
| GET | `/github/connect` | Yes | Start GitHub OAuth |
| GET | `/github/callback` | No | OAuth callback |
| POST | `/webhooks/github` | No (HMAC) | Receive GitHub webhooks |
| GET | `/repositories` | Yes | List GitHub repositories |
| POST | `/repositories/:id/sync` | Yes | Trigger manual doc sync |
| GET | `/jobs` | Yes | List documentation jobs |
| GET | `/jobs/:id` | Yes | Job details |
| GET | `/jobs/:jobId/versions/:versionId` | Yes | Full doc version content |
| GET | `/health` | No | Health check |

## Project structure

```
├── client/                  # React frontend (separate pnpm project)
│   └── src/
│       ├── api/             # Axios API layer
│       ├── components/      # Shared UI components
│       ├── contexts/        # AuthContext
│       ├── pages/           # Route-level page components
│       └── types/           # TypeScript types
│
└── server/                  # Express backend (separate pnpm project)
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── config/          # Zod-validated env config
        ├── controllers/     # Route handlers
        ├── middleware/      # Auth, error handling
        ├── queue/           # BullMQ worker pipeline
        ├── routes/          # Express router
        └── utils/           # GitHub client, Gemini client, helpers
```
