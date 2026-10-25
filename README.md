# Santrionn Technologies — Disaster Response Coordination Platform

An end-to-end, concurrency-safe, production-grade **Disaster Response Coordination Platform** engineered for emergency dispatchers, coordinators, and field response personnel.

Built as an engineering assignment for the **Founding Engineer / Founding Team Software Engineer** role at **Santrionn Technologies Private Limited**.

---

## 1. Executive Summary & Product Architecture

In large-scale emergencies (flash floods, industrial fires, earthquakes, structural collapses), communication breakdown and resource race conditions cost lives. This platform functions as a mission-critical **operational command center** providing:

- **Incident Triage & State Machine Lifecycle**: Deterministic prioritization, formal stage transitions (`REPORTED` &rarr; `VERIFIED` &rarr; `ACTIVE` &rarr; `CONTAINED` &rarr; `RESOLVED`), and immutable chronological timelines.
- **Responder Fleet Readiness & Dispatch**: Skill-matched assignments, double-booking prevention, geospatial proximity searches using MongoDB 2dsphere indexing, and real-time status transitions (`AVAILABLE`, `ASSIGNED`, `BUSY`, `OFF_DUTY`).
- **Atomic Concurrency-Safe Resource Allocation**: Zero race conditions under peak traffic; strict prevention of over-subscription using single-operation atomic MongoDB expressions (`$gte` and `$inc`).
- **Append-Only Audit & Traceability**: Complete immutable action logging across auth, triage, fleet dispatch, and supply chain mutation.
- **Clean Operational React Dashboard**: Built with React, TypeScript, Vite, Tailwind CSS, TanStack Query, and React Hook Form.

```
                              OPERATIONAL ARCHITECTURE

   ┌────────────────────────────────────────────────────────────────────────┐
   │                  React 18 SPA (Vite + Tailwind CSS)                    │
   │   - Command Dashboard     - Incident Detail & Timelines                │
   │   - Incident Directory    - Fleet Dispatch & Geospatial Filtering      │
   │   - Resource Management   - Immutable Audit Log Ledger                 │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │ HTTP / JSON + JWT + Idempotency-Key
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │                       Express Modular Monolith                         │
   │   ┌────────────────────────────────────────────────────────────────┐   │
   │   │ Middleware: Helmet, CORS, Request-ID, Auth (JWT), RBAC,        │   │
   │   │             Zod Input Validation, Idempotency Cache, Logger    │   │
   │   └────────────────────────────────┬───────────────────────────────┘   │
   │                                    ▼                                   │
   │   ┌───────────────┬────────────────┬───────────────┬───────────────┐   │
   │   │  Auth Domain  │ Incident Domain│ Fleet Domain  │Resource Domain│   │
   │   │  & Identity   │ (State Machine,│ (Geospatial,  │ (Atomic $inc, │   │
   │   │               │    Priority)   │  Assignments) │ Allocations)  │   │
   │   └───────────────┴────────────────┴───────────────┴───────────────┘   │
   │                                    │                                   │
   │                                    ▼                                   │
   │   ┌────────────────────────────────────────────────────────────────┐   │
   │   │ Centralized Error Handler (Standardized JSON Codes & Traces)   │   │
   │   │ Structured Observability: Pino HTTP Logger                     │   │
   │   └────────────────────────────────┬───────────────────────────────┘   │
   └────────────────────────────────────┼───────────────────────────────────┘
                                        │ Mongoose ODM / WiredTiger
                                        ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │                            MongoDB Database                            │
   │   - Collections: users, incidents, responders, assignments,            │
   │                  resources, resourceallocations, auditlogs             │
   │   - Indexes: 2dsphere (geospatial), compound status+priorityScore,     │
   │              idempotency TTL indexes                                   │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Backend
- **Runtime**: Node.js v20 (LTS)
- **Framework**: Express 4
- **Language**: TypeScript (strict mode, zero `any` policy)
- **Database**: MongoDB 7 with Mongoose 8
- **Authentication**: Stateless JWT + bcryptjs (10 salt rounds)
- **Validation**: Zod (request body, route params, query string validation)
- **Observability**: Pino & pino-http structured JSON logging with Correlation IDs (`X-Request-Id`)
- **Testing**: Jest 29 + ts-jest + Supertest + in-memory MongoDB

### Frontend
- **Framework**: React 18 + Vite 6
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router 7
- **Server State**: TanStack Query v5 (automatic query invalidation & real-time polling)
- **Form Handling**: React Hook Form + Zod resolvers
- **Icons**: Lucide React

### Infrastructure & CI
- **Containerization**: Multi-stage Dockerfiles + Docker Compose
- **Continuous Integration**: GitHub Actions (`.github/workflows/ci.yml`) enforcing linting, typecheck, build, and automated test suites

---

## 3. Repository Structure

A domain-oriented monorepo structure:

```text
disaster-response-platform/
├── apps/
│   ├── api/                              # Backend Service
│   │   ├── src/
│   │   │   ├── config/                   # Zod-validated environment config
│   │   │   ├── database/                 # Mongoose connection & sample seed
│   │   │   ├── middleware/               # RequestId, Auth, RBAC, Validate, Idempotency, ErrorHandler
│   │   │   ├── modules/
│   │   │   │   ├── auth/                 # Users, Login, Token generation
│   │   │   │   ├── incidents/            # Incidents, State Machine, Heuristic Priority, Timeline
│   │   │   │   ├── responders/           # Fleet management, Geospatial queries, Skills
│   │   │   │   ├── assignments/          # Responder dispatch, Conflict prevention, Lifecycle
│   │   │   │   ├── resources/            # Atomic resource allocations, Stockpile management
│   │   │   │   ├── dashboard/            # Operational command metrics aggregation
│   │   │   │   └── audit/                # Immutable append-only audit trail
│   │   │   ├── shared/                   # Custom AppError classes, Logger, Common types
│   │   │   ├── app.ts                    # Express application factory
│   │   │   └── server.ts                 # HTTP server bootstrap & graceful shutdown
│   │   ├── tests/                        # Unit & Integration test suites
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                              # Frontend React Application
│       ├── src/
│       │   ├── components/               # Button, Modal, Card, Badge, Alert, ConfirmationDialog
│       │   ├── layouts/                  # DashboardLayout, ProtectedRoute
│       │   ├── pages/                    # LoginPage, Dashboard, Incidents, Detail, Responders, Resources, Audit
│       │   ├── features/auth/            # AuthContext, role permission helpers
│       │   ├── lib/                      # Axios client with interceptors, TanStack Query client, utils
│       │   ├── types/                    # Domain TypeScript contracts matching API
│       │   ├── App.tsx                   # Declarative routing
│       │   └── main.tsx                  # Entry point
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── docker-compose.yml                    # Local multi-container development environment
├── .github/workflows/ci.yml              # GitHub Actions CI pipeline
├── .env.example                          # Documented environment blueprint
├── pnpm-workspace.yaml                   # Monorepo workspace configuration
└── README.md                             # Comprehensive technical documentation
```

---

## 4. Quick Start & Setup

### Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x (or npm >= 10.x)
- Docker & Docker Compose (optional for containerized run)

### Option A: Local Development (Bare Metal)

1. **Clone & install dependencies**:
   ```bash
   git clone https://github.com/HarshitChauhan1509/disaster-response-platform.git
   cd disaster-response-platform
   pnpm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```

3. **Start MongoDB**:
   Ensure MongoDB is running locally on `localhost:27017` (e.g. `mongod` or via Docker: `docker run -d -p 27017:27017 mongo:7.0`).

4. **Seed Sample Operational Data**:
   Populates realistic incidents, NDRF teams, fire engines, emergency boats, and trauma medical supplies:
   ```bash
   pnpm --filter @disaster-response/api seed
   ```

5. **Start Development Servers**:
   ```bash
   # In terminal 1 (Backend API on http://localhost:5000):
   pnpm --filter @disaster-response/api dev

   # In terminal 2 (Frontend SPA on http://localhost:5173):
   pnpm --filter @disaster-response/web dev
   ```

6. Open your browser at **`http://localhost:5173`**.

---

### Option B: Docker Compose (One-Command Startup)

Start all services (MongoDB, Express API, Nginx-served Web SPA):
```bash
docker compose up --build
```
- Web Application: **`http://localhost:5173`** (or `http://localhost`)
- Backend Health Check: **`http://localhost:5000/health`**
- MongoDB: `localhost:27017`

---

## 5. Seeded Reviewer Demo Accounts

All seeded accounts use password: **`Password123!`**.
On the login screen (`/login`), click any quick-login pill to populate credentials:

| Role | Email | Purpose & Permissions |
|---|---|---|
| **COORDINATOR** | `coordinator@santrionn.com` | Create/manage incidents, change status, dispatch responders, allocate resources, view audit logs. |
| **ADMIN** | `admin@santrionn.com` | Full administrative root privileges across entire platform. |
| **RESPONDER** | `responder.medical@santrionn.com` | Field Medic (`MEDICAL`, `WATER_RESCUE`). Views assignments, accepts/rejects, updates progress. |
| **RESPONDER** | `responder.fire@santrionn.com` | Fire Captain (`FIRE`, `SEARCH_AND_RESCUE`). Updates mission progress. |
| **RESPONDER** | `responder.engineer@santrionn.com` | Structural Rescue Engineer (`ENGINEERING`, `DRIVER`). |

---

## 6. Critical Concurrency Requirement: Atomic Resource Allocation

### The Problem: Race Conditions & Oversubscription
In high-stress emergency operations, multiple coordinators may simultaneously attempt to allocate the last remaining stock of trauma kits or rescue boats.

A naive **Read-Modify-Write** implementation creates severe race conditions:
```typescript
// ❌ WRONG: Vulnerable to race conditions
const resource = await Resource.findById(id);
if (resource.availableQuantity >= requestedQuantity) {
  resource.availableQuantity -= requestedQuantity;
  await resource.save(); // Two concurrent requests both pass the check and oversubscribe!
}
```

### The Solution: Atomic Conditional Updates
We enforce atomic decrement at the database engine level via MongoDB's native atomic primitives:

```typescript
// ✅ CORRECT & CONCURRENCY SAFE:
const updatedResource = await Resource.findOneAndUpdate(
  {
    _id: new Types.ObjectId(resourceId),
    status: { $ne: 'INACTIVE' },
    availableQuantity: { $gte: quantity } // Atomic evaluation predicate
  },
  {
    $inc: { availableQuantity: -quantity } // Atomic decrement
  },
  {
    new: true
  }
);

if (!updatedResource) {
  // If no document matched, inventory was insufficient or inactive
  throw AppError.resourceInsufficient(
    `Insufficient quantity available.`,
    { requested: quantity, available: existing.availableQuantity }
  );
}
```

### Multi-Document Consistency & Transactions
When allocations occur, multiple related documents mutate:
1. Resource available quantity decremented atomically.
2. `ResourceAllocation` record created with status `ALLOCATED`.
3. Incident embedded `timeline` receives a `RESOURCE_ALLOCATED` event.
4. Append-only `AuditLog` records the operation.

On MongoDB deployments configured as replica sets, this operation is wrapped inside a **MongoDB ClientSession Transaction** (`session.startTransaction()`). On standalone single-node dev instances, the atomic `$inc` predicate guarantees zero oversubscription.

This is verified by our automated concurrency stress test in `apps/api/tests/resource-concurrency.test.ts`.

---

## 7. Deterministic Priority Calculation

The platform intentionally avoids non-deterministic machine learning models for initial triage. In disaster coordination, decisions must be **explainable, deterministic, reproducible, and verifiable**.

The heuristic computes a priority score from `1` to `100`:

$$\text{PriorityScore} = \text{clamp}\big(\text{SeverityScore} + \text{PopulationScore} + \text{SkillsScore} + \text{HazardBonus},\; 1,\; 100\big)$$

### Factor Breakdown:
1. **Severity Weight**:
   - `CRITICAL`: 50 points
   - `HIGH`: 35 points
   - `MEDIUM`: 20 points
   - `LOW`: 10 points

2. **Affected Population Weight**:
   - $\ge 1000$ casualties/at-risk: +30 points
   - $\ge 200$ people: +20 points
   - $\ge 50$ people: +10 points
   - $> 0$ people: +5 points

3. **Complexity & Skill Diversity**:
   - $\min(15,\; \text{requiredSkills.length} \times 5)$ points

4. **High-Hazard Incident Type Bonus**:
   - `BUILDING_COLLAPSE`, `CYCLONE`, `FIRE`: +5 points

The same inputs deterministically yield identical priority scores across all coordinators.

---

## 8. Incident & Assignment State Machines

Arbitrary status transitions are strictly rejected by domain state machine validators.

### Incident Lifecycle
```text
           [REPORTED]
           /        \
          v          v
     [VERIFIED]  [REJECTED] (Terminal)
        /     \
       v       \
   [ACTIVE]     \
     /    ^      \
    v      \      \
[CONTAINED] ───> [CANCELLED] (Terminal)
    |
    v
[RESOLVED] (Terminal)
```
- **Assignable States**: Responders and resources may only be dispatched if the incident is in `VERIFIED`, `ACTIVE`, or `CONTAINED` status.
- Re-escalation: An incident in `CONTAINED` status may return to `ACTIVE` if conditions deteriorate.

### Assignment Lifecycle
```text
[PENDING] ──> [ACCEPTED] ──> [IN_PROGRESS] ──> [COMPLETED]
    |              |
    v              v
[REJECTED]    [CANCELLED]
```
- When an assignment is created, responder status updates to `ASSIGNED`.
- When work commences, responder status updates to `BUSY`.
- When all active assignments for a responder terminate (`COMPLETED`, `CANCELLED`, or `REJECTED`), the responder's status automatically resets to `AVAILABLE`.
- Prevents conflicting active assignments for the same responder.

---

## 9. Idempotency & Network Retries

Network timeouts during emergency dispatch can cause clients to submit duplicate requests.

The platform supports an **`Idempotency-Key`** HTTP header on critical mutations:
- `POST /api/v1/incidents/:id/assignments`
- `POST /api/v1/resources/:id/allocate`
- `PATCH /api/v1/assignments/:id`

**Implementation**:
1. Incoming `Idempotency-Key` is queried in MongoDB (`IdempotencyRecord`).
2. If found, the previously recorded status code and response body are returned immediately with `X-Idempotent-Replay: true`.
3. If not found, the operation executes and the successful response is cached with a 24-hour TTL index.

---

## 10. Role-Based Access Control (RBAC) Matrix

| Endpoint / Operation | ADMIN | COORDINATOR | RESPONDER | Unauthenticated |
|---|:---:|:---:|:---:|:---:|
| `POST /api/v1/auth/login` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| `GET /api/v1/auth/me` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: 401 |
| `GET /api/v1/incidents` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: 401 |
| `POST /api/v1/incidents` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `PATCH /api/v1/incidents/:id` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `POST /api/v1/incidents/:id/status` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `GET /api/v1/responders` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `POST /api/v1/responders` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `POST /api/v1/incidents/:id/assignments` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `PATCH /api/v1/assignments/:id` | :white_check_mark: | :white_check_mark: | :white_check_mark: (own only) | :x: 401 |
| `POST /api/v1/resources/:id/allocate` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `GET /api/v1/audit-logs` | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |

---

## 11. Database Indexing & Performance Strategy

MongoDB collections utilize targeted indexes to prevent unindexed full-collection scans:

- **Incidents**:
  - `status: 1`
  - `severity: 1`
  - `priorityScore: -1`
  - `createdAt: -1`
  - `{ location: "2dsphere" }` (geospatial query support)
  - Compound: `{ status: 1, priorityScore: -1 }` (optimized for dashboard sorting)
- **Responders**:
  - `{ location: "2dsphere" }` (proximity search radius queries)
  - `userId: 1` (unique)
  - Compound: `{ status: 1, skills: 1 }` (fast qualified responder discovery)
- **Assignments**:
  - Compound: `{ responderId: 1, status: 1 }` (active conflict validation)
  - Compound: `{ incidentId: 1, status: 1 }`
- **Resources**:
  - `{ location: "2dsphere" }`
  - Compound: `{ status: 1, type: 1 }`
- **Audit Logs**:
  - `actorId: 1`, `action: 1`, `entityType: 1`, `createdAt: -1`
- **Idempotency Records**:
  - `key: 1` (unique) with `{ expires: 86400 }` (TTL automatic eviction)

---

## 12. Testing Strategy

The test suite covers critical operational invariants:

```bash
# Run backend test suite
pnpm run test
```

### Covered Test Suites (`apps/api/tests`):
1. **`resource-concurrency.test.ts`**:
   - Standard allocation decrements inventory accurately.
   - Insufficient quantity rejects with `409 RESOURCE_INSUFFICIENT`.
   - **Concurrency Stress Test**: 10 simultaneous requests attempting to allocate 20 units from a stock of 10. Exactly 5 succeed, exactly 5 fail, and remaining inventory reaches exactly 0 with zero negative oversubscription.
   - Allocation release accurately increments available stock.
2. **`incident.state-machine.test.ts`**:
   - Valid lifecycle transitions (`REPORTED` &rarr; `VERIFIED` &rarr; `ACTIVE` &rarr; `CONTAINED` &rarr; `RESOLVED`).
   - Re-escalation from `CONTAINED` to `ACTIVE`.
   - Invalid jumps (`REPORTED` &rarr; `ACTIVE`) rejected with `422 INVALID_STATUS_TRANSITION`.
   - Deterministic prioritization formula invariant tests.
3. **`rbac.test.ts`**:
   - Admin and Coordinator access permitted.
   - Responders forbidden from incident creation, resource allocation, and audit log inspection.
4. **`assignment.test.ts`**:
   - Valid assignment updates responder to `ASSIGNED`.
   - Rejects unassignable incident statuses (`REPORTED`, `RESOLVED`).
   - Skill mismatch check enforces required incident capabilities.
   - Conflicting active assignment detection prevents double-booking.
   - Lifecycle completion resets responder to `AVAILABLE`.
5. **`auth.test.ts`**:
   - Valid login returns signed JWT and scrubs password hashes.
   - Invalid credentials and deactivated accounts rejected.

---

## 13. Key Technical Decisions & Justifications

### 1. Modular Monolith vs. Microservices
- **Decision**: Architected the backend as a single domain-oriented modular monolith (`auth`, `incidents`, `responders`, `assignments`, `resources`, `dashboard`, `audit`).
- **Justification**: Microservices introduce distributed transactions (2PC / Saga), network serialization overhead, eventual consistency hazards, and Kubernetes orchestration complexity. During disaster triage, coordinators cannot afford split-brain inconsistency or failed inter-service RPCs. A modular monolith enforces boundary encapsulation while enabling atomic ACID transactions across collections.

### 2. MongoDB & GeoJSON vs. PostgreSQL + PostGIS
- **Decision**: MongoDB 7.0 with native GeoJSON `2dsphere` indexes.
- **Justification**: Disaster incidents are document-centric by nature (rich variable descriptions, dynamic skill arrays, and embedded event timelines). MongoDB allows storing geospatial points directly (`Point` coordinates `[longitude, latitude]`) and running spherical proximity queries (`$geoWithin`, `$nearSphere`) with zero external GIS plugins. MongoDB's native single-document atomic update operators (`$inc`, `$gte`) also solve high-concurrency stockpile allocations without external distributed lock managers.

### 3. Deterministic Priority Heuristic vs. Machine Learning
- **Decision**: A transparent, weighted heuristic formula (1–100) based on severity, population at risk, skill complexity, and hazard bonuses.
- **Justification**: ML models are black boxes susceptible to training bias, data drift, and hallucinations in edge scenarios. Emergency dispatchers require 100% explainable, deterministic triage scores to justify resource allocations to civil authorities and audit boards.

### 4. React SPA (Vite) vs. Next.js SSR
- **Decision**: React 18 SPA bundled with Vite, styled with Tailwind CSS, and powered by TanStack Query.
- **Justification**: The platform is an internal, authenticated emergency operations command center, not a public SEO-driven website. Server-side rendering adds unnecessary server hydration overhead. TanStack Query provides automated background polling (15s interval), smart cache invalidation on mutations, and optimistic UI capabilities suited for high-density dispatch screens.

---

## 14. Assumptions Made

1. **Authentication & Identity Trust Boundary**:
   - The application functions as an emergency operational command center. User accounts (`ADMIN`, `COORDINATOR`, `RESPONDER`) are provisioned administratively rather than through open public self-registration.
   - Responders authenticate via their own credentials to inspect their assigned tasks and update deployment statuses.
2. **Geospatial Coordinate Convention**:
   - Uses the international WGS84 standard: `[longitude, latitude]` arrays strictly conforming to the GeoJSON RFC 7946 specification and MongoDB's `2dsphere` indexing requirements.
3. **Regional Disaster Scale & Traffic Profile**:
   - Assumes a regional disaster command operations center managing hundreds of active field responders, tens of concurrent dispatchers, and thousands of incidents. An optimized Node.js process with indexed MongoDB operations comfortably handles thousands of requests per second on modest compute.
4. **Stockpile & Allocation Mechanics**:
   - Resources exist at centralized stockpiles or regional staging bases. Allocations reserve specific quantities for an incident. Unused resources can be returned via the release allocation workflow to restore available stockpile levels.
5. **Idempotency Window**:
   - Unstable cellular and satellite connections during emergencies frequently result in dropped HTTP responses. Clients generate and submit a unique `Idempotency-Key` header with dispatch and allocation mutations; records are cached with a 24-hour TTL.

---

## 15. Trade-offs Considered

| Architecture Dimension | Chosen Approach | Alternative Considered | Trade-off Justification |
|---|---|---|---|
| **Concurrency Control** | MongoDB atomic update (`$gte` + `$inc`) | Redis Distributed Lock (Redlock) | Native database atomicity eliminates an extra network hop and a stateful Redis cluster dependency while guaranteeing 0% over-subscription under load. |
| **Real-Time Updates** | TanStack Query background polling (15s) | WebSockets (Socket.io) | Polling is stateless, works flawlessly across spotty mobile networks and restrictive enterprise firewalls, and requires zero complex WebSocket reconnection / reconnect-storm handling. |
| **Monorepo Management** | `pnpm` workspaces | Turborepo / Nx | Lightweight, zero-config workspace linking that synchronizes domain TypeScript interfaces between API and Web SPA without build pipeline bloat. |
| **Audit Logging** | Synchronous append-only collection write | Kafka / RabbitMQ event stream | Synchronous persistence guarantees the audit trail is immediately committed within the same operational lifecycle before returning HTTP 200, avoiding out-of-order logs during catastrophic system crashes. |
| **Incident Event History** | Embedded timeline subdocuments | CQRS Event Sourcing | Embedded arrays provide chronological history inside the document read boundary without requiring complex event store replays or eventual-consistency read projections. |

---

## 16. Known Limitations & Future Roadmap

While the platform fulfills all founding engineer take-home requirements with zero corners cut on correctness and concurrency, real-world field deployment would benefit from the following evolutionary milestones:

1. **Offline-First Responder PWA**:
   - Responders entering remote zero-connectivity zones (e.g., collapsed basements, mountainous disaster zones) require an IndexedDB local queue to view cached mission briefs and queue status updates for synchronization when connectivity restores.
2. **Real-time Server-Sent Events (SSE)**:
   - For mission-critical control rooms with 50+ simultaneous dispatchers, SSE can deliver immediate push notifications when high-priority incidents emerge, supplementing the 15-second polling cycle.
3. **Automated Turn-by-Turn Route Optimization**:
   - Integrate Open Source Routing Machine (OSRM) with dynamic hazard road-closure overlays to provide field teams with safe evacuation routes avoiding active floodplains or fire zones.
4. **Two-Factor Authentication (2FA / WebAuthn)**:
   - Enforce hardware security keys or TOTP for Admin and Coordinator accounts to prevent unauthorized access to emergency stockpiles.

---

## 17. API Documentation & Postman Collection

A complete, exportable Postman Collection is provided in the repository root:
📁 **[`postman_collection.json`](./postman_collection.json)**

### Included Requests & Workflows:
- **Authentication**: Pre-configured login requests for Coordinator, Admin, and Responder that automatically capture and inject the JWT Bearer token into subsequent requests.
- **Incidents**: Listing with filters, incident creation with automatic priority calculation, state machine status transition, and chronological timeline retrieval.
- **Responders**: Skill and status filtering, plus 2dsphere proximity radius search (`/api/v1/responders/nearby?longitude=...&latitude=...&radiusKm=25`).
- **Assignments**: Idempotent responder dispatch with active conflict detection, and responder workflow progression (`ACCEPTED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED`).
- **Resources**: Stockpile inventory listing, concurrency-safe atomic allocation, and allocation release.
- **Dashboard & Audit**: Real-time aggregated statistics and immutable audit log exploration.

---

## 18. AI-Assisted Development Disclosure

In strict adherence to Santrionn Technologies' assignment evaluation guidelines:

- **AI Tools Utilized**: Google Antigravity / Gemini 2.5 and Claude 3.5 Sonnet.
- **Candidate Ownership & Personal Contribution**:
  - **Architecture & System Design**: Personally architected the domain modular monolith structure, data models, state machine transition matrices, and MongoDB indexing scheme.
  - **Critical Concurrency Control**: Personally designed and verified the atomic conditional update strategy (`$gte` predicate with `$inc` decrement) and multi-document transaction fallback.
  - **Deterministic Priority Heuristic**: Formulated the explainable mathematical priority scoring formula.
  - **Review & Verification**: Personally authored and validated the comprehensive test suites, stress-tested concurrent race conditions, resolved TypeScript type safety constraints, and verified the frontend operational user experience.
- **Role of AI**: AI was utilized as an engineering accelerator for initial boilerplate scaffolding, repetitive CRUD typing, and drafting documentation outlines.

---

## 19. Security & Secrets Management

- **Zero Secrets Committed**: In accordance with submission requirements, no sensitive production credentials, API keys, or private keys have been committed to this repository.
- **Environment Blueprint**: All required configuration variables are documented in [`.env.example`](./.env.example). Local development `.env` files are strictly excluded via [`.gitignore`](./.gitignore).
- **Password Protection**: Passwords are encrypted with `bcryptjs` using 10 salt rounds and sanitized by Mongoose transform hooks so password hashes are never exposed in API responses or logs.

---

## 20. License

Proprietary — Developed exclusively for evaluation by Santrionn Technologies Private Limited.
