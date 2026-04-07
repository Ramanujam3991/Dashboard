# spec.md

## Overview

A desktop application for data-heavy securities analytics, providing securities lending traders and analysts with real-time visibility into borrow availability, rates, utilization, street positioning, and predictive short interest signals. The app presents a dense, multi-panel analytics view in the spirit of a Bloomberg terminal workflow, focused on hard-to-borrow (HTB) name analysis and decision support.

The application is delivered as an Electron desktop app with a Node.js backend (main process) and a TypeScript + React renderer. It consumes data exclusively through the PKNXT Data Service, which fronts upstream systems (Summit, Hazelcast, SQL Server, Databricks) over gRPC and REST.

## Goals

- Deliver a responsive desktop experience for analyzing individual securities across multiple data dimensions on a single screen
- Surface predictive short interest signals alongside observed street/Bloomberg data
- Enable fast ticker lookup and client-context switching
- Provide a foundation that scales to additional analytics modules beyond the initial security overview
- Keep the data access layer cleanly abstracted so PKNXT changes do not ripple into the UI

## Non-Goals

- Order execution or trade placement
- Portfolio management or P&L tracking
- Historical backtesting tools (future consideration)
- Mobile or web deployment — desktop-only via Electron
- Direct renderer-to-PKNXT communication — all data flows through the Electron main process

## Target Users

- **Securities lending traders** evaluating borrow availability, rates, and utilization
- **Short interest analysts** tracking street positioning and predicting squeeze risk
- **Client coverage teams** reviewing client-specific positions and strategies

## Core User Workflows

1. **Ticker lookup** — User enters a symbol, selects a client context, and lands on the security overview screen
2. **Security analysis** — User reviews borrow metrics, street picture, vendor rate comparison, short interest predictions, and historical trends on a single dense screen
3. **Client overview** — User switches to a client-centric view showing positions and strategies
4. **Live monitoring** — Price, rate, and chart panels stream live; user sees freshness indicators and can manually refresh polled panels

## Functional Requirements

### Screen 1 — Security Search / Overview (primary screen)

**Header bar**
- Ticker search input with autocomplete
- Client selector dropdown
- Quick-access ticker chips (recent or watched)
- Tier indicator (e.g., "Tier 1")
- Live timestamp
- User avatar / account menu

**Security header panel**
- Ticker, company name, exchange, sector
- Current price and daily change (streaming)
- Status badges (HTB, borrow rate band, size indicators)
- Earnings date callout
- One-line summary, e.g., "utilization critically tight at X%, rate outperforming street by Y bps"

**Our Book panel**
- Short quantity (our book)
- Offer rate
- Available quantity
- Utilization %
- Loanable quantity
- Days to cover
- Internalization %
- Our market share
- Strategies breakdown (Long/Short Equity, Short Bias, etc.)
- Position summary (shares, notional, daily revenue)

**Street Picture panel**
- Quantity on loan (street)
- Street borrow rate
- Number of borrowers
- Street utilization
- Trend deltas vs. prior period

**Rate vs. Vendors panel**
- Our rate compared to IHS, S3, Aztec, and other vendor rates
- Delta per vendor
- Visual bar comparison

**Clients in Name panel**
- List of clients holding the position
- Per-client utilization and daily revenue

**Short Interest — Predicted panel**
- Last Bloomberg print value and date
- Predicted SI Now with confidence band
- Book coverage %
- Narrative explanation of the prediction
- Bloomberg print vs. our prediction chart with forecast shading (streaming)

**Rate history chart** (streaming)
- Our rate vs. street average over time

**Quantity on Loan & Short Interest chart** (streaming)
- Qty on loan (street) and SI (predicted) over time, dual-axis

**Corporate Actions panel**
- Upcoming events (earnings, splits, dividends)

**Data Changes panel**
- Week-over-week comparison table (short qty, avail, utilization, rate)

**Vendor Data panel**
- Week-over-week vendor snapshot (street rate, borrowers)

**Bloomberg Chat panel**
- Tier-filtered suggested chat message with current metrics interpolated
- Copy button (generates copyable text only — does not post to Bloomberg)

### Screen 2 — Client Overview

- Client-level positioning across names
- Aggregate metrics and strategy breakdown
- Detailed requirements to be elaborated in a follow-up spec iteration

## Streaming vs. Polling

Per product direction, panels containing **prices or charts stream live**; all other panels poll on a fixed cadence.

| Panel | Mode | Cadence |
|---|---|---|
| Security header (price, change) | Stream | Live |
| Rate history chart | Stream | Live |
| Qty on Loan & SI chart | Stream | Live |
| Bloomberg print vs. prediction chart | Stream | Live |
| Our Book | Poll | 30s |
| Street Picture | Poll | 30s |
| Rate vs. Vendors | Poll | 60s |
| Clients in Name | Poll | 60s |
| Short Interest — Predicted (numeric) | Poll | 60s |
| Corporate Actions | Poll | 5 min |
| Data Changes | Poll | 5 min |
| Vendor Data | Poll | 5 min |
| Bloomberg Chat suggestion | Poll | 60s |

Streaming uses gRPC server-streaming where PKNXT supports it; polling uses REST. All transport is brokered by the Electron main process.

## Data Requirements

The app consumes data exclusively from the PKNXT Data Service, which aggregates upstream systems:

| Source | Role | Reached via |
|---|---|---|
| Summit | Positions / book data | PKNXT |
| Hazelcast Cache | Low-latency hot data | PKNXT |
| SQL Server | Reference and historical | PKNXT |
| Databricks | Analytics, predictions, ML models | PKNXT |

PKNXT exposes both gRPC and REST. The Electron Node.js main process is the only component that calls PKNXT; the React renderer accesses data exclusively via typed IPC channels.

**Key data entities**
- Security (ticker, identifiers, reference data)
- Book position (our side)
- Street metrics (loan qty, borrowers, utilization, rates)
- Vendor rate snapshots
- Short interest predictions
- Client positions
- Corporate actions
- Historical time series for charts

## Non-Functional Requirements

- **Latency**: Panel loads under 500ms on warm cache; under 2s cold
- **Refresh cadence**: Per the streaming/polling table above
- **Authentication**: Corporate SSO via OAuth 2.0 / OIDC against the enterprise identity provider. Tokens are acquired and held in the Electron main process and never exposed to the renderer. PKNXT calls attach a bearer token; mTLS may be layered on at the network level if required by infra.
- **Authorization tiers**: Tier 1 vs. Tier 2 access controls both panel visibility and data masking. The tier is resolved at login from the identity provider claims and enforced both in the main process (request filtering) and the renderer (panel rendering).
- **Offline behavior**: Graceful degradation with per-panel stale-data indicators when PKNXT is unreachable; automatic reconnect with exponential backoff for streaming channels
- **Security**: Electron context isolation enabled, `nodeIntegration` disabled in renderer, strict CSP, all PKNXT calls proxied through typed IPC, no remote module
- **Packaging**: Signed installers for Windows (primary) and macOS (secondary), distributed via managed corporate install
- **Observability**: Structured logging in main process, crash reporting, panel-level performance telemetry, PKNXT call metrics
- **Styling**: Greenfield design system built on a lightweight component library (e.g., Radix primitives + Tailwind), theme tokens defined centrally so the look can be aligned to corporate branding later

## Assumptions (resolutions to prior open questions)

The following decisions are taken as working assumptions for the plan and implementation phases. Any can be revisited if product or infra direction changes.

- **Auth model**: OAuth 2.0 / OIDC via corporate SSO, bearer token to PKNXT, token lifecycle managed in Electron main process
- **Streaming vs. polling**: Prices and charts stream; everything else polls (see table above)
- **Design system**: Greenfield, built on Radix + Tailwind with centralized theme tokens
- **Tier model**: Tier 1 / Tier 2 controls both panel visibility and field-level data masking, enforced server-side and reflected client-side
- **Concurrent users**: Plan for ~200 concurrent desktop users in initial rollout; PKNXT rate limits assumed sufficient and to be confirmed during integration
- **Bloomberg Chat panel**: Generates copyable text only; no direct Bloomberg posting
- **Deployment**: Managed corporate install with signed installers and auto-update channel

## Success Criteria

- A trader can look up a ticker and have a complete analytical picture on one screen without navigating away
- Predicted short interest is visibly differentiated from observed Bloomberg prints with clear confidence indication
- Streaming panels update without visible jank and recover automatically from transient disconnects
- The app runs stably for a full trading day without memory growth or reconnect issues
- New analytics panels can be added without rewriting the data layer
- All PKNXT access is brokered through the main process with zero direct renderer network calls

## Out of Scope for v1

- Client Overview screen detailed functionality (stub only)
- Customizable dashboards / user-defined layouts
- Alerting and notifications
- Export to Excel / PDF
- Multi-monitor window tear-off
