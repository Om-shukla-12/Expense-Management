# Expense Management (Vite + React)

This repository contains a small Expense Management demo built with a Vite + React frontend and a simple Express backend.

Quick start (Windows PowerShell):

1. Install dependencies for root (uses workspaces):

```powershell
npm install
```

2. Start both client and server in development:

```powershell
npm run dev
```

The React app will be available at http://localhost:5173 and API requests proxy to http://localhost:4000.

Notes:
- The server uses an in-memory store for simplicity. For production, replace with a persistent DB.
- The client is in `client/` and the server is in `server/`.
