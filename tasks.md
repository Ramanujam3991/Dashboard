# tasks.md

Ordered, executable task list for the Securities Analytics Desktop App. Each task is a discrete unit small enough for an agent or developer to complete in one sitting. Tasks are grouped into phases; within a phase, tasks are listed in dependency order. Do not start a task until its dependencies are complete.

Read `spec.md`, `plan.md`, and `constitution.md` before executing any task. Every task must respect the constitution — especially the single-server rule, the no-renderer-network-calls rule, and the typed-IPC rule.

---

## Phase 0 — Repository and Tooling

### T0.1 Initialize monorepo
- Create root `package.json` with pnpm workspaces
- Create `pnpm-workspace.yaml` listing `packages/*`
- Add `tsconfig.base.json` with strict mode on
- Add `.eslintrc.cjs`, `.prettierrc`, `.editorconfig`
- Add `.gitignore` covering `node_modules`, `dist`, `out`, `.env*`
- **Done when**: `pnpm install` runs cleanly at root

### T0.2 Configure lint, format, pre-commit
- Install ESLint, Prettier, Husky, lint-staged
- Add ESLint rules for TypeScript strict, React hooks, no `any`
- Wire Husky pre-commit hook to run lint-staged
- **Done when**: a deliberate lint error is caught by the pre-commit hook

### T0.3 Scaffold shared types package
- Create `packages/shared/package.json` and `tsconfig.json`
- Create `src/index.ts` exporting empty barrels for `entities/`, `ipc/`
- **Done when**: `pnpm --filter shared build` succeeds

### T0.4 Scaffold main package
- Create `packages/main/package.json`, `tsconfig.json`
- Add Electron and TypeScript as dev dependencies
- Create `src/index.ts` with a minimal `app.whenReady()` that creates a `BrowserWindow` with `nodeIntegration: false`, `contextIsolation: true`
- **Done when**: `pnpm --filter main dev` opens an empty Electron window

### T0.5 Scaffold preload package
- Create `packages/preload/package.json`, `tsconfig.json`
- Create `src/index.ts` exposing an empty `window.api` via `contextBridge`
- Wire main process to load the preload script in the BrowserWindow
- **Done when**: DevTools console in the renderer shows `window.api` defined

### T0.6 Scaffold renderer package
- Create `packages/renderer/package.json`, `tsconfig.json`, `vite.config.ts`
- Add React, Vite, Tailwind, Radix primitives, TanStack Query, Zustand, Recharts, lucide-react
- Create `index.html`, `src/main.tsx`, `src/App.tsx` rendering "Hello"
- Configure main process to load Vite dev URL in development and `file://` build output in production
- **Done when**: `pnpm dev` from root opens an Electron window showing the React "Hello" page with hot reload working

### T0.7 Set up theme tokens and Tailwind
- Create `packages/renderer/src/theme/tokens.ts` with color, spacing, radius, typography tokens
- Extend `tailwind.config.ts` to consume tokens
- Add a `ThemeProvider` if needed and wrap `App`
- **Done when**: a sample component renders using only token-driven Tailwind classes, no hex values

---

## Phase 1 — IPC and Service Skeleton

### T1.1 Define IPC channel constants and base types
- In `packages/shared/src/ipc/channels.ts`, define `IpcChannel` and `IpcStream` const enums per `plan.md`
- Define base request/response and subscription envelope types
- **Done when**: shared package exports compile and are importable from main and renderer

### T1.2 Implement IPC router in main
- Create `packages/main/src/ipc/router.ts` with `register(channel, handler)` and a single `ipcMain.handle` dispatcher
- Add typed wrapper so handlers receive parsed request and return typed response
- **Done when**: a stub handler for a test channel returns a response to a renderer `invoke` call

### T1.3 Implement subscription manager skeleton in main
- Create `packages/main/src/streaming/SubscriptionManager.ts`
- Support `subscribe(channel, params, onEvent)`, `unsubscribe(id)`, multiplexing by `(channel, paramsKey)`
- Stub upstream source as a setInterval emitting fake events
- Wire `ipcMain.on` for subscribe/unsubscribe messages and forward events to renderer with subscription id
- **Done when**: a renderer test page can subscribe to a fake stream and see ticks arrive

### T1.4 Build typed IPC client in preload
- In `packages/preload/src/index.ts`, expose `window.api.invoke<TReq, TRes>(channel, req)`, `window.api.subscribe(channel, params, onMessage)`, `window.api.unsubscribe(id)`
- Import channel constants from `shared` so the API is typed end-to-end
- **Done when**: TypeScript autocomplete in the renderer shows the typed API

### T1.5 Renderer IPC client wrapper
- Create `packages/renderer/src/ipc/client.ts` thin wrapper over `window.api`
- Create a TanStack Query setup in `src/query/queryClient.ts`
- Create a `useIpcQuery` helper hook that bridges TanStack Query with `window.api.invoke`
- Create a `useIpcSubscription` hook that wires `subscribe`/`unsubscribe` into a React effect
- **Done when**: a test panel uses `useIpcQuery` against the stub handler and a streaming hook against the fake stream

---

## Phase 2 — Auth and PKNXT Client Foundation

### T2.1 Config loader
- Create `packages/main/src/config/index.ts` to load env vars and an optional signed config file
- Define typed `AppConfig` with PKNXT endpoints, IdP discovery URL, client id, update feed URL
- Validate config with zod at startup, fail fast on missing values
- **Done when**: app refuses to launch with a clear error if required config is missing

### T2.2 Logging setup
- Create `packages/main/src/logging/logger.ts` using pino
- Configure rotating file output in user data directory
- Add a child logger pattern so each module gets a contextual logger
- **Done when**: main process writes structured JSON logs to disk

### T2.3 OIDC auth flow
- Create `packages/main/src/auth/oidc.ts` using `openid-client`
- Implement PKCE flow with loopback redirect server bound only during the flow
- On success, store refresh token in `keytar`, hold access token in memory
- Implement token refresh on expiry
- **Done when**: launching the app opens the system browser, completes login against a test IdP, and returns to a logged-in state

### T2.4 Auth state and tier resolution
- Parse ID token claims to extract user identity and tier (Tier 1 / Tier 2)
- Expose `authService.getCurrentUser()` and `authService.getTier()` to other main-process modules
- Add `IpcChannel.AuthGetTier` handler that returns tier to renderer for UX gating only
- **Done when**: renderer can call `window.api.invoke(IpcChannel.AuthGetTier)` and receive the user's tier

### T2.5 PKNXT REST client
- Create `packages/main/src/pknxt/restClient.ts` using undici
- Add bearer token interceptor pulling from auth service
- Add zod validation at the response boundary
- Add structured error types (auth, network, validation, server)
- Add unit tests with mocked transport
- **Done when**: a test endpoint can be called and returns a typed, validated response

### T2.6 PKNXT gRPC client
- Add proto files to `packages/main/src/pknxt/proto/` (placeholders until real protos arrive)
- Create `packages/main/src/pknxt/grpcClient.ts` using `@grpc/grpc-js` and `@grpc/proto-loader`
- Add bearer token via gRPC metadata
- Implement server-streaming wrapper that exposes an async iterator
- Add reconnect with exponential backoff
- Add unit tests against a local mock gRPC server
- **Done when**: a test streaming call against the mock server delivers events and recovers from a forced disconnect

### T2.7 Mock PKNXT server for tests
- Create `tests/mocks/pknxt/` with both REST (using undici-compatible mock) and gRPC server implementations
- Serve fixture data for one ticker end-to-end
- **Done when**: unit and e2e tests can run against the mock without any real network access

---

## Phase 3 — Security Overview Vertical Slice (one panel end-to-end)

The goal of this phase is to prove the full path — IPC, auth, PKNXT, validation, render — with one real panel before scaling out. **Pick the Security Header panel** because it exercises both streaming (price) and static metadata.

### T3.1 Define Security entity and IPC contract
- In `shared/src/entities/Security.ts`, define the `Security` interface from `plan.md`
- In `shared/src/ipc/channels.ts`, add `SecurityGetHeader` request/response types
- Add `IpcStream.PriceTicks` payload type
- **Done when**: types compile and are imported by both main and renderer without duplication

### T3.2 Security service in main
- Create `packages/main/src/services/securityService.ts`
- Implement `getHeader(ticker, clientId)` calling PKNXT REST and returning a validated `Security`
- Implement `subscribePriceTicks(ticker)` returning an async iterator from the gRPC client
- Apply tier-based field masking before returning
- Unit tests with mocked PKNXT client
- **Done when**: service tests pass with both Tier 1 and Tier 2 fixtures

### T3.3 Wire IPC handlers for security header
- Register `IpcChannel.SecurityGetHeader` handler in the IPC router
- Register `IpcStream.PriceTicks` in the SubscriptionManager, sourced from `securityService.subscribePriceTicks`
- **Done when**: renderer can invoke the handler and subscribe to the stream

### T3.4 Build SecurityHeader panel component
- Create `packages/renderer/src/panels/SecurityHeader/`
- Use `useIpcQuery` for the static fields (name, sector, badges, earnings)
- Use `useIpcSubscription` for the price tick stream, merging into local state
- Render with token-driven Tailwind classes matching the mock layout
- Show loading, success, stale, and error states
- Show a freshness indicator
- **Done when**: panel renders against the mock PKNXT server with live-updating price

### T3.5 Build the SecurityOverview screen shell
- Create `packages/renderer/src/screens/SecurityOverview/index.tsx`
- Add header bar with ticker search input, client selector, tier indicator, timestamp
- Add Zustand store for `selectedTicker` and `selectedClient`
- Mount the SecurityHeader panel inside the screen
- **Done when**: typing a ticker in the search updates the store and the SecurityHeader panel reloads

### T3.6 End-to-end smoke test for vertical slice
- Playwright Electron test: launch app, log in against mock IdP, search ticker, assert SecurityHeader panel renders all fields, assert price updates
- **Done when**: test passes in CI

**Phase 3 gate**: do not start Phase 4 until the vertical slice is green in CI and reviewed by the manager. This is the moment to validate the architecture before scaling out.

---

## Phase 4 — Remaining Polled Panels

Each panel below follows the same sub-task pattern: define entity in `shared`, add IPC channel, implement service method in main with tier masking, register IPC handler, build React panel with `useIpcQuery`, add loading/stale/error states, add freshness indicator, add component test. List one task per panel for brevity.

### T4.1 Our Book panel
### T4.2 Street Picture panel
### T4.3 Rate vs. Vendors panel
### T4.4 Clients in Name panel
### T4.5 Short Interest — Predicted panel (numeric portion)
### T4.6 Corporate Actions panel
### T4.7 Data Changes panel
### T4.8 Vendor Data panel
### T4.9 Bloomberg Chat suggestion panel (copy-only, no posting)

**Done when**: all polled panels render against the mock PKNXT server, each at its spec-defined cadence, with tier masking verified for both tiers.

---

## Phase 5 — Streaming Chart Panels

Each chart panel uses the SubscriptionManager and merges incoming ticks into a bounded time series in renderer state.

### T5.1 Rate history chart
- Add `IpcStream.RateHistory` and payload types
- Service method returning historical seed + live updates
- Recharts line chart with our rate vs. street average
- Reconnect and stale state handling

### T5.2 Quantity on Loan and Short Interest chart
- Add `IpcStream.QtyOnLoanSeries` and payload types
- Dual-axis Recharts chart
- Same reconnect and stale handling

### T5.3 Bloomberg print vs. prediction chart
- Add `IpcStream.PredictionSeries` and payload types
- Recharts chart with forecast shading region
- Same reconnect and stale handling

**Done when**: all three charts stream live against the mock PKNXT server, recover from forced disconnects, and show stale indicators during outages.

---

## Phase 6 — Layout, Polish, and Cross-Cutting Concerns

### T6.1 Full SecurityOverview layout
- Compose all panels into the screen using a responsive grid matching the Bloomberg-style mock
- Ensure dense information layout works at 1440px and scales reasonably
- **Done when**: full screen renders with all panels populated

### T6.2 Client selector and tier UX gating
- Wire client selector to update the Zustand store and trigger panel reloads
- Hide panels and fields the user's tier cannot access
- **Done when**: switching tiers in the mock IdP visibly changes available panels

### T6.3 Error boundary and error reporting
- Add a top-level React error boundary
- Forward caught errors to main via IPC for logging
- Render a non-blocking error UI
- **Done when**: a deliberately thrown error in a panel is logged to the main process log file

### T6.4 Performance instrumentation
- Add panel-level performance marks (mount → first data)
- Forward marks to main via IPC and log
- **Done when**: log file shows per-panel timings on each ticker load

### T6.5 Stub Client Overview screen
- Create the screen with a placeholder and navigation entry
- **Done when**: user can navigate to Client Overview and back

---

## Phase 7 — Packaging, Auto-Update, and Release

### T7.1 Configure electron-builder
- Add `electron-builder.yml` with Windows (`.exe` and `.msi`) and macOS (`.dmg`) targets
- Configure app id, product name, icons, file associations
- **Done when**: `pnpm package` produces unsigned installers locally

### T7.2 Code signing
- Wire Windows EV cert and macOS Developer ID cert from CI secrets
- Verify signed installers on a clean Windows and macOS machine
- **Done when**: installers pass OS signature verification

### T7.3 Auto-update via electron-updater
- Configure update feed URL from `AppConfig`
- Check for updates on launch and every 4 hours
- Show a non-blocking update-available indicator; install on next quit
- **Done when**: installing an older version and pointing it at a feed with a newer version triggers a successful update

### T7.4 CI pipeline
- Build, lint, unit test, e2e test, package on every PR
- Sign and publish on tagged release
- **Done when**: a tagged commit produces signed installers in the release artifacts

### T7.5 Installer smoke test on clean machines
- Install on a clean Windows machine, launch, log in, load a ticker
- Repeat on a clean macOS machine
- **Done when**: both machines reach a working SecurityOverview screen with live data from the staging PKNXT environment

---

## Phase 8 — Hardening Before Handoff

### T8.1 Full-day stability soak test
- Run the app against staging PKNXT for a full trading day
- Monitor memory, reconnect counts, error rate
- **Done when**: no memory growth, no unrecovered disconnects, no unexplained errors

### T8.2 Security review
- Verify CSP, context isolation, no node integration, no remote module
- Verify no tokens in renderer, no secrets in renderer bundle
- Verify all IPC channels are typed and validated
- **Done when**: security checklist signed off

### T8.3 Documentation
- Write `quickstart.md` for new developers
- Document IPC channels, services, and the streaming model
- Document the build, sign, and release process
- **Done when**: a new developer can clone, install, and run the app following only the docs

---

## Cross-Cutting Rules for Every Task

- Every task must leave the build green and all tests passing
- Every task that touches main or renderer must respect the constitution — re-read it if unsure
- Every task that adds a dependency must update `plan.md`
- Every task that introduces a new IPC channel must define types in `shared` first
- Every task that touches PKNXT must go through the single PKNXT client in main, never inline `fetch` or gRPC calls
- No task may introduce a second server, sidecar, or spawned backend process. If a task seems to require one, stop and escalate.

## Suggested Execution Order Summary

Phase 0 → Phase 1 → Phase 2 → **Phase 3 (gate: manager review)** → Phase 4 (panels can be parallelized across developers) → Phase 5 (charts can be parallelized) → Phase 6 → Phase 7 → Phase 8.

Phases 4 and 5 are the only ones that parallelize cleanly. Everything else should run sequentially because later phases depend on earlier infrastructure.
