# 🚀 DocGen

> **Automatically generate and maintain project documentation from your codebase.**

DocGen is an AI-powered documentation automation platform that keeps your project documentation synchronized with your source code. By integrating with GitHub, DocGen analyzes code changes whenever a pull request is merged or new commits are pushed, generates accurate documentation using Google's Gemini models, validates the generated content, and creates pull requests containing the documentation updates for developer review.

> **Write code. DocGen writes the documentation.**

---

## ✨ Features

- 🤖 AI-powered documentation generation using Google Gemini
- 📖 Automatic README updates
- 🔌 API documentation generation
- 📝 Intelligent changelog generation
- 🔄 Documentation versioning
- 🌿 Automatic documentation Pull Requests
- 📊 Documentation generation history
- ⚡ Background job processing with BullMQ
- 🔒 Secure GitHub OAuth & GitHub App integration
- 🏢 Multi-repository support
- 📈 Job monitoring dashboard
- 🛡️ Documentation validation before PR creation

---

## 🏗️ Architecture

```text
                   GitHub
                      │
       Push / Merge / Webhook Events
                      │
                      ▼
               GitHub Webhook
                      │
                      ▼
             Express Backend API
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
 Authentication              BullMQ Queue
         │                         │
         ▼                         ▼
 PostgreSQL                Worker Processor
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
            Repository Analyzer          GitHub Services
                     │                           │
                     ▼                           ▼
             Gemini Documentation Engine
                     │
                     ▼
          Documentation Validator
                     │
                     ▼
            Create Documentation PR
                     │
                     ▼
                  GitHub
```

---

## 🛠 Tech Stack

### Frontend

- React
- TypeScript
- React Router
- Tailwind CSS
- Axios
- TanStack Query
- React Hook Form
- Zod

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- BullMQ
- Redis

### Database

- PostgreSQL

### AI

- Google Gemini API

### Authentication

- Email & Password
- GitHub OAuth
- GitHub App

### DevOps

- Docker
- GitHub Webhooks

---

## 📁 Project Structure

```text
DocGen/
│
├── client/
│   ├── src/
│   ├── public/
│   └── ...
│
├── server/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── queue/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── workers/
│   └── ...
│
└── README.md
```

---

## 🚀 Workflow

1. User signs in using Email or GitHub.
2. User installs the DocGen GitHub App.
3. GitHub sends webhook events to DocGen.
4. DocGen queues documentation generation jobs.
5. Repository changes are analyzed.
6. Gemini generates updated documentation.
7. Generated content is validated.
8. A new branch is created.
9. Documentation changes are committed.
10. A Pull Request is opened for review.

---

## 🔐 Authentication

DocGen supports:

- Email & Password
- GitHub OAuth
- GitHub App Installation

Authentication is secured using JWT and role-based authorization.

---

## 📚 Generated Documentation

DocGen can automatically generate:

- README updates
- API documentation
- Changelog
- Release notes
- Architecture summaries
- Migration guides
- Pull Request summaries

---

## ⚙️ Environment Variables

### Backend

```env
DATABASE_URL=

REDIS_URL=

JWT_SECRET=

GEMINI_API_KEY=

GITHUB_APP_ID=

GITHUB_CLIENT_ID=

GITHUB_CLIENT_SECRET=

GITHUB_PRIVATE_KEY=

GITHUB_WEBHOOK_SECRET=

CLIENT_URL=
```

---

## 📦 Installation

### Clone

```bash
git clone https://github.com/<your-username>/DocGen.git
```

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd client
npm install
```

### Prisma

```bash
npx prisma migrate dev
```

### Start Redis

```bash
docker compose up redis
```

### Start Backend

```bash
npm run dev
```

### Start Frontend

```bash
npm run dev
```

---

## 📈 Roadmap

- [x] GitHub OAuth
- [x] GitHub App Integration
- [x] Documentation Generation Pipeline
- [x] BullMQ Job Queue
- [x] Repository Synchronization
- [ ] Multi-language Repository Analysis
- [ ] Slack Integration
- [ ] Jira Integration
- [ ] Teams & Organizations
- [ ] AI Documentation Chat
- [ ] VS Code Extension
- [ ] GitLab Support
- [ ] Bitbucket Support

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## ⭐ Support

If you find DocGen useful, consider giving the repository a ⭐ to support the project.

---

<p align="center">
Built with ❤️ using Node.js, React, PostgreSQL, BullMQ and Google Gemini
</p>
