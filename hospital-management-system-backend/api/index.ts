// Vercel serverless entry point.
//
// Vercel does NOT run `app.listen()` — a normal long-running HTTP server
// doesn't work in its serverless model. Instead, every file under /api is
// treated as a request handler. Since Express apps are themselves callable
// as `(req, res) => void`, exporting the app directly is enough: @vercel/node
// wraps it and invokes it per-request.
//
// This file intentionally does NOT import from src/server.ts, since that
// file calls app.listen()/connectDatabase()/process signal handlers, none of
// which apply here. Prisma connects lazily on first query in a serverless
// function, so no explicit connect step is needed either.
import { createApp } from '../src/app';

const app = createApp();

export default app;
