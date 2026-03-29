# MCP DevBridge

**Universal Developer Tool Integration Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade platform implementing the **Model Context Protocol (MCP)** — a standardized JSON-RPC 2.0 protocol for AI assistants and LLMs to interact with developer tools like GitHub, databases, and file systems through a unified gateway.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js Dashboard (Port 3000)              │
│  • Server management & monitoring           │
│  • Real-time activity feed (SignalR)        │
│  • Tool registry & invocation UI            │
└────────────────────┬────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────┐
│  .NET 9 API Gateway (Port 5000)             │
│  • Request routing to MCP servers           │
│  • Audit logging (SQLite / EF Core)         │
│  • Swagger documentation                    │
│  • Background health checks                 │
└────────────────────┬────────────────────────┘
                     │ MCP Protocol (JSON-RPC 2.0)
┌────────────────────▼────────────────────────┐
│  MCP Server Layer                           │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ GitHub   │ │ Database │ │ FileSystem │  │
│  │ :3001    │ │ :3002    │ │ :3003      │  │
│  └──────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | .NET 9 Web API, Entity Framework Core, SQLite |
| **MCP Servers** | TypeScript, Node.js, Express, JSON-RPC 2.0 |
| **Real-time** | SignalR |
| **Containerization** | Docker, Docker Compose |

## Features

### Dashboard
- Real-time system health monitoring via SignalR
- Active connection counts and tool call statistics
- Server status with start/stop controls
- Recent activity feed with invocation history

### MCP Servers

**GitHub Server** — `list_repos`, `get_repo`, `create_issue`, `list_issues`, `get_pull_requests`

**Database Server** — `list_tables`, `describe_schema`, `query_table`, `execute_query` (read-only by default)

**FileSystem Server** — `list_files`, `read_file`, `write_file`, `search_files` (sandboxed)

### API Gateway
- Swagger/OpenAPI documentation
- JSON-RPC 2.0 protocol bridge
- Background health check service
- Full audit logging of tool invocations

## Quick Start

### Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with your GitHub token

docker compose up --build

# Dashboard:  http://localhost:3000
# Swagger:    http://localhost:5000/swagger
```

### Manual Setup

```bash
# 1. MCP Servers
cd mcp-servers && npm install
PORT=3001 GITHUB_TOKEN=ghp_... npx tsx github-server/index.ts &
PORT=3002 npx tsx database-server/index.ts &
PORT=3003 npx tsx filesystem-server/index.ts &

# 2. Backend
cd backend/McpDevBridge.Api && dotnet run

# 3. Frontend
cd frontend && npm install && npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub personal access token | — |
| `PORT` | Server port (per MCP server) | `3001`/`3002`/`3003` |
| `DB_PATH` | SQLite database path | `sample.db` |
| `SANDBOX_DIR` | FileSystem server root | `./sandbox` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | System health status |
| GET | `/api/health/dashboard` | Dashboard statistics |
| POST | `/api/health/check` | Trigger health checks |
| GET | `/api/servers` | List MCP servers |
| POST | `/api/servers` | Register a server |
| POST | `/api/servers/{id}/start` | Start a server |
| POST | `/api/servers/{id}/stop` | Stop a server |
| GET | `/api/tools` | List all tools |
| POST | `/api/tools/invoke` | Invoke a tool |
| GET | `/api/logs/connections` | Connection logs |
| GET | `/api/logs/invocations` | Invocation logs |

## MCP Protocol

```json
POST http://localhost:{port}/rpc

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_repos",
    "arguments": { "owner": "microsoft" }
  }
}
```

| Method | Description |
|--------|-------------|
| `initialize` | Server capabilities |
| `tools/list` | List available tools |
| `tools/call` | Invoke a tool |
| `resources/list` | List resources |
| `resources/read` | Read a resource |

## Project Structure

```
MCP-DevBridge/
├── frontend/               # Next.js 14 Dashboard
│   ├── src/app/            # App Router pages
│   ├── src/components/     # React components
│   └── src/lib/            # API client & types
├── backend/                # .NET 9 API Gateway
│   └── McpDevBridge.Api/
│       ├── Controllers/    # REST controllers
│       ├── Models/         # Entities & DTOs
│       ├── Services/       # Business logic
│       ├── Hubs/           # SignalR hubs
│       └── Data/           # EF Core DbContext
├── mcp-servers/            # TypeScript MCP Servers
│   ├── shared/             # Protocol definitions
│   ├── github-server/      # GitHub API integration
│   ├── database-server/    # SQLite integration
│   └── filesystem-server/  # File system operations
├── nginx/                  # Reverse proxy config
├── docs/                   # Architecture documentation
└── docker-compose.yml
```

## License

MIT
