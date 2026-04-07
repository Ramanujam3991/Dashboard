# plan.md

Technical blueprint for the Securities Analytics Desktop App. This document translates `spec.md` into concrete technology choices, architecture, and implementation strategy, while respecting every rule in `constitution.md`. Read those two documents first.

## Technology Stack

### Runtime and language
- **Electron** (latest stable) — desktop shell
- **Node.js** (LTS, bundled with Electron) — main process backend
- **TypeScript** (strict mode) — main, renderer, and shared types

### Renderer (UI)
- **React** (latest stable) with function components and hooks
- **Vite** — dev server and renderer bundler
- **Tailwind CSS** — utility styling, driven by centralized theme tokens
- **Radix UI primitives** — accessible unstyled components
- **TanStack Query** — renderer-side cache and request lifecycle for IPC-backed data
- **Zustand** — lightweight UI state (selected ticker, selected client, panel layout)
- **Recharts** — charts for rate history, qty on loan, SI prediction
- **lucide-react** — icons

### Main process (backend)
- **gRPC client** (`@grpc/grpc-js` + `@grpc/proto-loader`) — streaming PKNXT calls
- **undici** — HTTP client for PKNXT REST polling
- **openid-client** — OAuth 2.0 / OIDC flow against corporate SSO
- **keytar** — OS-native secure storage for refresh tokens
- **pino** — structured logging
- **zod** — runtime validation of PKNXT responses at the boundary

### Build, test, packaging
- **electron-builder** — signed installers for Windows (`.exe` / `.msi`) and macOS (`.dmg`)
- **electron-updater** — auto-update channel
- **Vitest** — unit tests for main and renderer
- **Playwright** (with Electron support) — end-to-end smoke tests
- **ESLint + Prettier** — lint and format
- **Husky + lint-staged** — pre-commit hooks

No dependency is added without being listed here or amended into this plan.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                     │
│                  (single OS process tree)                   │
│                                                             │
│  ┌────────────────────────┐    ┌────────────────────────┐   │
│  │   Renderer Process     │    │    Main Process        │   │
│  │   (React + Vite)       │    │    (Node.js)           │   │
│  │                        │    │                        │   │
│  │  ┌──────────────────┐  │    │  ┌──────────────────┐  │   │
│  │  │  React UI        │  │    │  │  IPC Router      │  │   │
│  │  │  (panels, views) │  │    │  │                  │  │   │
│  │  └────────┬─────────┘  │    │  └────────┬─────────┘  │   │
│  │           │            │    │           │            │   │
│  │  ┌────────▼─────────┐  │    │  ┌────────▼─────────┐  │   │
│  │  │ TanStack Query + │  │    │  │  Service Layer   │  │   │
│  │  │ Zustand stores   │  │    │  │  (security,      │  │   │
│  │  └────────┬─────────┘  │    │  │   client, chat)  │  │   │
│  │           │            │    │  └────────┬─────────┘  │   │
│  │  ┌────────▼─────────┐  │    │           │            │   │
│  │  │ Typed IPC client │◄─┼────┼──►        │            │   │
│  │  │ (preload bridge) │  │    │  ┌────────▼─────────┐  │   │
│  │  └──────────────────┘  │    │  │  PKNXT Client    │  │   │
│  │                        │    │  │  (gRPC + REST)   │  │   │
│  │                        │    │  └────────┬─────────┘  │   │
│  │                        │    │           │            │   │
│  │                        │    │  ┌────────▼─────────┐  │   │
│  │                        │    │  │  Auth (OIDC)     │  │   │
│  │                        │    │  │  + Token Store   │  │   │
│  │                        │    │  └──────────────────┘  │   │
│  └────────────────────────┘    └───────────┬────────────┘   │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                                              ▼
                                       PKNXT Data Service
                                       (gRPC + REST)
```

One Electron app, two processes (main + renderer), one PKNXT client, one auth context. No sidecar servers, no spawned worker servers. This is the single-server architecture mandated by the constitution.

## Folder Structure

```
securities-analytics-desktop/
├── package.json
├── electron-builder.yml
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
│
├── packages/
│   ├── shared/                    # Shared types and contracts
│   │   ├── src/
│   │   │   ├── entities/          # Security, BookPosition, StreetMetrics, ...
│   │   │   ├── ipc/               # IPC channel names + payload types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── main/                      # Electron main process (the one server)
│   │   ├── src/
│   │   │   ├── index.ts           # App entry, window creation
│   │   │   ├── ipc/               # IPC router and handlers
│   │   │   ├── services/          # security, client, chat, prediction
│   │   │   ├── pknxt/             # gRPC + REST client, proto files
│   │   │   ├── auth/              # OIDC flow, token store
│   │   │   ├── streaming/         # subscription manager
│   │   │   ├── config/            # env loading, endpoints
│   │   │   ├── logging/           # pino setup
│   │   │   └── tier/              # tier resolution + enforcement
│   │   └── package.json
│   │
│   ├── preload/                   # contextBridge preload script
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── renderer/                  # React UI
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── theme/             # tokens, Tailwind config extensions
│       │   ├── ipc/               # typed IPC client wrapping window.api
│       │   ├── state/             # Zustand stores
│       │   ├── query/             # TanStack Query setup + hooks
│       │   ├── screens/
│       │   │   ├── SecurityOverview/
│       │   │   └── ClientOverview/
│       │   ├── panels/            # OurBook, StreetPicture, RateVsVendors, ...
│       │   ├── components/        # shared UI primitives
│       │   └── charts/            # Recharts wrappers
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
└── tests/
    ├── unit/                      # Vitest for main and renderer
    └── e2e/                       # Playwright Electron tests
```

A monorepo with `packages/shared`, `packages/main`, `packages/preload`, `packages/renderer`. The "single server" rule means there is exactly one `main` package; new features become services *inside* it, never new packages with their own process.

## IPC Contract Design

All IPC channels are defined once in `packages/shared/src/ipc` and imported by both main and renderer. Two channel patterns:

**Request/response** (for polled data and commands)
```ts
// shared/src/ipc/channels.ts
export const IpcChannel = {
  SecurityGetOverview: 'security:getOverview',
  SecuritySearch: 'security:search',
  ClientGetPositions: 'client:getPositions',
  ChatGenerateSuggestion: 'chat:generateSuggestion',
  AuthGetTier: 'auth:getTier',
} as const;

export interface SecurityGetOverviewRequest {
  ticker: string;
  clientId: string;
}
export interface SecurityGetOverviewResponse {
  security: Security;
  ourBook: BookPosition;
  streetPicture: StreetMetrics;
  vendorRates: VendorRate[];
  prediction: ShortInterestPrediction;
  asOf: string;
}
```

**Subscription** (for streaming data)
```ts
export const IpcStream = {
  PriceTicks: 'stream:priceTicks',
  RateHistory: 'stream:rateHistory',
  QtyOnLoanSeries: 'stream:qtyOnLoanSeries',
  PredictionSeries: 'stream:predictionSeries',
} as const;

// Renderer subscribes via window.api.subscribe(channel, params, onMessage)
// Main process pushes events with a subscription id; renderer unsubscribes on unmount.
```

The preload script exposes a single `window.api` object with `invoke`, `subscribe`, and `unsubscribe` methods. React components never touch `ipcRenderer` directly.

## Streaming vs. Polling Implementation

Per the spec, prices and charts stream; everything else polls.

**Streaming path**
- Renderer panel mounts → calls `window.api.subscribe(IpcStream.PriceTicks, { ticker })`
- Main process opens (or reuses) a gRPC server-streaming call to PKNXT
- A `SubscriptionManager` in main multiplexes: one upstream gRPC stream per (channel, params) key, fanned out to multiple renderer subscribers if needed
- Each event is forwarded to the renderer over IPC with the subscription id
- On panel unmount or window close, the renderer unsubscribes; the manager closes the upstream gRPC call when the last subscriber leaves
- Reconnect with exponential backoff on disconnect; renderer sees a `stale` state until reconnect succeeds

**Polling path**
- Renderer panel uses a TanStack Query hook with the cadence from the spec table
- The query function calls `window.api.invoke(IpcChannel.SecurityGetOverview, { ticker, clientId })`
- Main process service layer calls PKNXT REST via undici, validates with zod, returns typed response
- TanStack Query handles caching, deduping, and stale-while-revalidate

## Auth and Tier Enforcement

- On app launch, the main process checks for a refresh token in `keytar`
- If absent or expired, it opens a system browser to the corporate IdP authorization URL (PKCE flow via `openid-client`), captures the redirect via a loopback server bound only for the duration of the flow, and exchanges the code for tokens
- Access token is held in main process memory; refresh token persisted in `keytar`
- Token is attached as a bearer to every PKNXT call (gRPC metadata or REST header)
- Tier is read from the ID token claims at login and stored in main process state
- Every IPC handler in main checks the user's tier against the requested resource and applies field-level masking before returning data
- The renderer receives tier info via a one-time `auth:getTier` IPC call at startup and uses it only to hide panels that the user can't access — never as a security boundary

The renderer never sees a token. The renderer never makes a network call.

## Data Model

Defined in `packages/shared/src/entities`. First pass:

```ts
interface Security {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  price: number;
  changePct: number;
  badges: SecurityBadge[];
  earningsDate: string | null;
  summary: string;
}

interface BookPosition {
  shortQty: number;
  offerRate: number;
  availableQty: number;
  utilization: number;
  loanableQty: number;
  daysToCover: number;
  internalizationPct: number;
  ourMarketShare: number;
  strategies: StrategyBreakdown[];
  notional: number;
  dailyRevenue: number;
}

interface StreetMetrics {
  qtyOnLoan: number;
  borrowRate: number;
  numBorrowers: number;
  utilization: number;
  deltas: PeriodDeltas;
}

interface VendorRate {
  vendor: 'IHS' | 'S3' | 'Aztec' | string;
  rate: number;
  deltaBps: number;
}

interface ShortInterestPrediction {
  lastBloombergPrint: { value: number; asOf: string };
  predictedNow: { value: number; confidenceBps: number };
  bookCoveragePct: number;
  narrative: string;
}

interface ClientInName {
  clientId: string;
  clientName: string;
  utilization: number;
  dailyRevenue: number;
}

interface CorporateAction {
  type: 'earnings' | 'split' | 'dividend' | string;
  date: string;
  details: string;
}

interface TimeSeriesPoint {
  t: string;
  value: number;
}
```

A more complete `data-model.md` will be generated during the tasks phase.

## Theme Tokens

Centralized in `packages/renderer/src/theme/tokens.ts` and surfaced to Tailwind via `tailwind.config.ts`. Tokens cover color (background, surface, border, text scales, accent, semantic up/down/warn), spacing, radius, font sizes, and panel density. No hex values appear outside this file.

## Build and Packaging

- **Dev**: `pnpm dev` runs Vite dev server for the renderer, `tsc --watch` for main and preload, and Electron pointed at the dev URL with hot reload
- **Build**: `pnpm build` compiles main, preload, and renderer to `dist/`
- **Package**: `pnpm package` runs electron-builder against `dist/` to produce signed `.exe` / `.msi` for Windows and `.dmg` for macOS
- **Code signing**: Windows EV cert and macOS Developer ID cert pulled from CI secrets, never committed
- **Auto-update**: electron-updater configured against the corporate update feed; checked on launch and every 4 hours

The shipped artifact is one signed installer per platform. Installation produces one app, one process tree, one main process. No background services, no post-install daemons.

## Testing Strategy

- **Unit (Vitest)**: PKNXT client with mocked transport, IPC handlers with mocked services, service layer with mocked PKNXT client, renderer hooks with mocked `window.api`
- **Component (Vitest + React Testing Library)**: each panel renders correctly for loading, success, stale, and error states
- **End-to-end (Playwright Electron)**: launch the packaged app against a mock PKNXT server, search a ticker, verify all panels load, verify a streaming panel updates, verify reconnect behavior
- **No test makes a real network call.** A mock PKNXT server lives in `tests/mocks/pknxt` and serves both gRPC and REST

## Observability

- Structured JSON logs from main process via pino, written to a rotating file in the user data directory and optionally to a corporate log sink
- Renderer errors caught by an error boundary and forwarded to main via IPC for logging
- Per-panel performance marks (mount → first data) collected in renderer and reported through IPC
- Crash reporter enabled, dumps sent to a corporate endpoint

## Open Items for the Tasks Phase

- Confirm exact PKNXT proto files and REST endpoints (will become `data-model.md` and `contracts/`)
- Confirm corporate IdP discovery URL and client ID
- Confirm code signing certificate provisioning in CI
- Confirm the corporate update feed URL for electron-updater

## What This Plan Does Not Do

- Does not specify task ordering or vertical slices — that is the job of `tasks.md`
- Does not lock in panel-by-panel visual design beyond the token system
- Does not address the Client Overview screen in depth (stub only for v1)
