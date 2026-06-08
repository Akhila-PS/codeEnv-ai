# CodeEnv AI 🚀

> An AI-powered collaborative code review and engineering quality platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-violet)](https://your-url-here.com)

## What is this?

CodeEnv AI acts like a senior engineer reviewing your code. Paste any code and get instant feedback on bugs, security vulnerabilities, complexity analysis, and the mathematically optimal solution — all in seconds.

## Features

### 🤖 AI Code Review
- Detects O(n²) complexity and suggests optimal algorithms
- Security vulnerability scanning
- Bug detection and fixes
- Generates optimized rewrite of your code
- Scores code on Security, Performance, Maintainability

### 💻 Live Code Execution
- Real terminal with WebSocket streaming
- Type inputs live, see outputs instantly
- Supports JavaScript, Python, Java, C++
- Exactly like online compilers

### 🐙 GitHub PR Import
- Paste any public GitHub PR URL
- Auto-fetches the diff via GitHub API
- AI reviews the actual code changes
- Shows additions, deletions, file count

### 👥 Collaborative IDE
- VS Code style editor in the browser
- Real-time code sync between users
- File explorer with multiple files and tabs
- Attached terminal panel
- Team chat with @ai commands
- AI Mentor that watches your session
- AI Edit with Accept/Reject diff view

### 📊 Skill Analytics
- Score progress over time
- Language breakdown charts
- Best score tracking

## Tech Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS
- Monaco Editor (same as VS Code)
- Recharts for analytics
- WebSocket for real-time features

**Backend**
- Node.js + Express
- WebSocket (ws) for terminal and collab
- JWT authentication
- Rate limiting + Helmet security
- Morgan request logging
- API versioning (/api/v1/)

**AI Layer**
- Groq API (Llama 3.3 70B)
- Custom prompt engineering
- Proactive AI Observer
- AI direct code editing

**Integrations**
- GitHub API via Octokit
- Piston API for code execution

## Architecture

codereview-ai/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/           # Landing, Dashboard, Analytics, Collab, GitHub
│   │   ├── components/      # Terminal, reusable components
│   │   └── api/             # Axios instance with interceptors
├── server/                  # Node.js + Express backend
│   ├── src/
│   │   ├── routes/          # Auth, Review API routes
│   │   ├── middleware/       # Auth, Rate limiting, Sanitization, Error handling
│   │   └── services/        # AI Review, Code Runner, Collab, GitHub

## Running Locally

**Prerequisites:** Node.js 20+, Java JDK (for Java execution)

```bash
# Clone the repo
git clone https://github.com/Akhila-PS/codeEnv-ai.git
cd codeEnv-ai

# Setup server
cd server
npm install
cp .env.example .env
# Add your GROQ_API_KEY and GITHUB_TOKEN to .env
npm run dev

# Setup client (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

```env
PORT=5000
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_github_token
```

## Key Design Decisions

- **WebSockets over REST** for terminal and collab — enables real-time streaming
- **JSON file database** for simplicity — easy to swap with PostgreSQL
- **Groq over OpenAI** — free tier, faster inference, same quality
- **Monaco Editor** — same engine as VS Code, supports all languages
- **Proactive AI** — AI observes and intervenes, not just responds

## Screenshots

*Coming soon*

## License

MIT