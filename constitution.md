# constitution.md

Project-wide rules and invariants for the Securities Analytics Desktop App. These rules are non-negotiable and apply to every task, every file, and every change. The AI agent and all contributors must respect them without exception. If a task appears to require violating a rule, stop and escalate rather than work around it.

## Architecture Invariants

### Single-server architecture

- The Electron **main process is the one and only Node.js backend** for this application.
- There is exactly **one** Node.js process serving as the backend. No sidecar servers, no spawned worker servers, no per-feature module servers, no local microservices.
- Do **not** decompose the backend into multiple independently running services or processes the way the Swift parser project was structured. That pattern is explicitly rejected for this project.
- Background work that needs isolation may use Node `worker_threads` inside the main process, but must not be exposed as a separate server or process with its own lifecycle.
- All PKNXT communication, all auth, all caching, and all IPC handling lives inside this single main process.

### Process boundaries

- Two processes exist at runtime: the **Electron main process** (Node.js backend) and the **Electron renderer process** (React UI). Nothing else.
- The renderer **never** makes network calls. All outbound network traffic originates from the main process.
- The renderer **never** has Node integration enabled. `nodeIntegration: false` and `contextIsolation: true` are mandatory on every `BrowserWindow`.
- The renderer communicates with the main process **exclusively** through typed IPC channels exposed via a `contextBridge` preload script. No `remote` module, no direct `ipcRenderer` access from React components.

### Data access

- PKNXT is the **only** upstream data source. No direct calls to Summit, Hazelcast, SQL Server, or Databricks from this application.
- All PKNXT access goes through a single client module in the main process. No ad-hoc `fetch` or gRPC calls scattered across feature code.
- Streaming subscriptions (prices, charts) and polling requests share the same client and the same auth context.

## Security Invariants

- Auth tokens live **only** in the main process. They are never sent to the renderer, never written to `localStorage`, never logged.
- All IPC channels are **typed** end-to-end (TypeScript types shared between main and renderer via a common types package).
- Tier-based authorization (Tier 1 / Tier 2) is enforced in the **main process** first. Renderer-side tier checks are for UX only and are never the security boundary.
- Strict Content Security Policy on the renderer. No inline scripts, no remote script loading, no `eval`.
- No third-party telemetry or analytics SDKs that phone home from the renderer.
- Secrets, endpoints, and environment-specific config are loaded in the main process from a controlled source (env vars or a signed config file), never bundled into the renderer.

## Code Quality Invariants

- **TypeScript strict mode** is on everywhere. No `any` without an explicit, commented justification. No `// @ts-ignore` without a linked ticket.
- **One source of truth for types**: data entities (Security, BookPosition, StreetMetrics, etc.) are defined once in a shared types module and imported by both main and renderer.
- **No business logic in React components.** Components render state and dispatch actions. Data fetching, transformation, and caching live in the main process or in renderer-side state management, not in JSX.
- **No direct DOM manipulation** in React code. Use refs only when a library requires it.
- Lint and format on every commit. CI fails on lint errors.

## Testing Invariants

- The PKNXT client module has unit tests with mocked transport.
- IPC channel handlers have unit tests.
- At least one end-to-end smoke test exercises the full path: renderer → IPC → main → mocked PKNXT → response → renderer render.
- No test may make a real network call to PKNXT or any other external service.

## UI Invariants

- The design system is centralized. Colors, spacing, typography, and component primitives come from theme tokens. No hard-coded hex values or pixel measurements scattered across components.
- Every panel shows a **freshness indicator** (last updated timestamp or live/stale state). Users must always be able to tell whether data is current.
- Streaming panels degrade gracefully to their last known value with a clear stale indicator on disconnect, and reconnect automatically.
- No blocking modal dialogs for routine errors. Errors surface inline on the affected panel.

## Build and Packaging Invariants

- The app ships as a **single signed installer per platform** (Windows primary, macOS secondary). One installer, one app, one process tree.
- No post-install scripts that spawn additional services or background daemons.
- Auto-update is built in from day one and uses the same signed-installer channel.

## Process Invariants for the Agent

- Follow the spec → plan → tasks workflow. Do not write implementation code until the relevant task in `tasks.md` is the active one.
- When a task is ambiguous or conflicts with this constitution, **stop and ask** rather than guess.
- Never introduce a new top-level dependency without noting it in the plan and justifying it.
- Never introduce a second server, a sidecar, a child process server, or a microservice. If a problem seems to require one, escalate.

## Explicit Anti-Patterns (Do Not Do)

- ❌ Spawning a separate Node server for a feature module
- ❌ Running a local HTTP server inside the Electron app for the renderer to call
- ❌ Calling PKNXT directly from the renderer
- ❌ Storing tokens in `localStorage`, `sessionStorage`, cookies, or any renderer-accessible store
- ❌ Enabling `nodeIntegration` in any `BrowserWindow`
- ❌ Using the `remote` module
- ❌ Per-module independent processes (the Swift parser pattern)
- ❌ Bundling environment config or secrets into the renderer build
- ❌ Hard-coded styling values outside the theme tokens
- ❌ Untyped IPC messages
