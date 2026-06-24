# NOVA — System Architecture (Phase 1 / MVP)

## 1. Scope & Philosophy

This document defines the architecture for the **launchable MVP**, not the full
100M-user platform described in the original product brief. The brief's full
feature set (Marketplace, Events, Pages, Communities, creator monetization,
Snap Map, full E2EE, AI deepfake detection, Kubernetes/microservices at scale)
is real product strategy — it's captured in §10 as a phased roadmap — but
building it all before you have users is the most common reason social
startups never ship.

**Guiding principle:** build a **modular monolith** with clean internal
boundaries that mirror future microservices, so you can extract a service
(e.g. Messaging, Media) the day it actually needs independent scaling —
without a rewrite.

MVP feature set: Auth, Profiles, Posts/Feed, Stories, Social graph
(follow/like/comment/share), Messaging (1:1 + group, realtime), Notifications,
Search, lightweight Trust & Safety (block/mute/report).

---

## 2. Tech Stack (MVP-justified)

| Layer | Choice | Why for MVP specifically |
|---|---|---|
| Frontend | Next.js 14+ (App Router), React, TypeScript | SSR for SEO on public profiles, single codebase for web, easy path to PWA |
| Styling/Motion | Tailwind CSS, Framer Motion | Fast iteration, no design system overhead yet |
| Client state | Zustand + TanStack Query | Avoids Redux boilerplate; Query handles cache/invalidation for feed-style data |
| Realtime client | Socket.io client | Matches server choice, handles reconnection/fallback |
| Backend | Node.js, Express, TypeScript | One language across stack; Express is boring/stable, easy to hire for |
| ORM/DB access | Prisma | Type-safe queries matching the TS stack, painless migrations |
| Primary DB | PostgreSQL | Relational integrity for social graph, ACID for messaging/payments later |
| Cache/Realtime bus | Redis | Session cache, feed cache, pub/sub for Socket.io scaling |
| Search | PostgreSQL full-text search (Phase 1) → OpenSearch (Phase 2) | Avoid running a search cluster before you have search volume that needs it |
| Object storage | Cloudflare R2 (S3-compatible) | No egress fees, S3 API compatibility means easy migration |
| Media processing | FFmpeg via background job queue (BullMQ + Redis) | Decouple upload from transcoding so requests stay fast |
| Auth | JWT access + rotating refresh tokens, Argon2id hashing | Industry-standard, no vendor lock-in |
| Deployment | Docker Compose → single ECS/Fly.io/Render service | Defer Kubernetes until you have >1 service that needs independent scaling |
| CI/CD | GitHub Actions | Free tier covers MVP volume |
| CDN/Edge | Cloudflare | Free tier WAF + CDN, easy DNS |

Notably **deferred from the original brief for MVP**: WebRTC group calls,
WebAuthn passkeys, Signal-protocol E2EE, Elasticsearch, Kubernetes — see §10
for when to revisit each.

---

## 3. High-Level Component Diagram

```
                               ┌─────────────────────┐
                               │   Cloudflare (CDN,   │
                               │   WAF, DNS, R2 edge) │
                               └──────────┬───────────┘
                                          │
                   ┌──────────────────────┼──────────────────────┐
                   │                      │                      │
           ┌───────▼───────┐     ┌────────▼────────┐    ┌────────▼────────┐
           │  Next.js Web   │     │  Mobile clients │    │  Public/SEO      │
           │  (SSR + PWA)   │     │  (future, same   │    │  pages (SSR)     │
           │                │     │  REST/WS API)    │    │                  │
           └───────┬────────┘     └────────┬─────────┘    └────────┬─────────┘
                   │                       │                       │
                   └───────────────┬───────┴───────────────────────┘
                                   │  HTTPS (REST) + WSS (Socket.io)
                           ┌───────▼────────┐
                           │  Nginx / LB     │
                           └───────┬────────┘
                                   │
                     ┌─────────────▼──────────────┐
                     │   NOVA API (Node/Express)   │
                     │   Modular monolith:          │
                     │   - auth module              │
                     │   - users/profiles module    │
                     │   - posts/feed module         │
                     │   - stories module            │
                     │   - messaging module (+WS)    │
                     │   - notifications module      │
                     │   - search module             │
                     │   - trust & safety module      │
                     └──────┬───────────────┬────────┘
                            │               │
               ┌────────────▼───┐   ┌───────▼─────────┐
               │  PostgreSQL     │   │  Redis            │
               │  (source of     │   │  - session cache  │
               │   truth)        │   │  - feed cache      │
               │                 │   │  - pub/sub (WS)    │
               │                 │   │  - job queue       │
               └─────────────────┘   └───────┬───────────┘
                                             │
                                   ┌─────────▼─────────┐
                                   │  Media Worker(s)   │
                                   │  (BullMQ consumer) │
                                   │  FFmpeg transcode,  │
                                   │  thumbnailing        │
                                   └─────────┬───────────┘
                                             │
                                   ┌─────────▼───────────┐
                                   │  Cloudflare R2 (S3)  │
                                   │  raw + processed     │
                                   │  media                │
                                   └──────────────────────┘
```

---

## 4. Folder Structure

```
nova/
├── apps/
│   ├── web/                      # Next.js app
│   │   ├── app/                  # App Router pages
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/                # Zustand stores
│   │   ├── lib/                   # API client, query keys
│   │   └── public/
│   └── api/                      # Express API
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.validation.ts   # zod schemas
│       │   │   │   └── auth.types.ts
│       │   │   ├── users/
│       │   │   ├── posts/
│       │   │   ├── stories/
│       │   │   ├── messaging/
│       │   │   │   ├── messaging.gateway.ts # Socket.io handlers
│       │   │   │   └── ...
│       │   │   ├── notifications/
│       │   │   ├── search/
│       │   │   └── trust-safety/
│       │   ├── shared/
│       │   │   ├── middleware/    # auth, rateLimit, errorHandler, validation
│       │   │   ├── lib/           # redis client, prisma client, logger
│       │   │   ├── jobs/          # BullMQ queues + workers
│       │   │   └── utils/
│       │   ├── config/
│       │   └── server.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
├── packages/
│   ├── shared-types/              # types shared between web & api
│   └── eslint-config/
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/workflows/
```

Each module follows the same internal layering: **routes → controller →
service → Prisma**. Controllers never touch Prisma directly — this is what
makes each module extractable into its own service later without touching
business logic.

---

## 5. Security Architecture (MVP-required, non-negotiable)

These are not "nice to have later" — they ship in v1:

- **Password hashing:** Argon2id, never bcrypt/md5/sha.
- **Auth tokens:** short-lived JWT access token (~15 min) + rotating refresh
  token stored hashed in DB, allowing server-side revocation (logout-all-devices).
- **Transport:** TLS 1.3 everywhere (terminated at Cloudflare/Nginx).
- **Headers:** CSP, HSTS, X-Content-Type-Options, X-Frame-Options via `helmet`.
- **Rate limiting:** Redis-backed, per-IP and per-account, tighter limits on
  auth endpoints (login, password reset, OTP).
- **CSRF:** SameSite=strict cookies for refresh token; CSRF token for any
  cookie-based state-changing request.
- **Input validation:** zod schemas on every endpoint, reject unknown fields.
- **SQL injection:** mitigated structurally by Prisma's parameterized queries
  — never use raw string interpolation into `$queryRawUnsafe`.
- **File upload safety:** validate MIME type by content sniffing (not just
  extension), size limits, virus scan hook (ClamAV) before media reaches the
  processing pipeline.
- **Audit logging:** every auth event, moderation action, and admin action
  written to an immutable `audit_log` table.
- **Secrets:** environment variables via a secrets manager (AWS Secrets
  Manager / Doppler), never committed, rotated on a schedule.

**Explicitly deferred to Phase 2:** WebAuthn passkeys, TOTP 2FA, full Signal-
protocol E2EE for messaging. MVP messaging is encrypted in transit (TLS) and
at rest (DB-level encryption), which is standard for Telegram "cloud chats" —
true E2EE is a Phase 2 feature once you have an established messaging base
that justifies "Secret Chat" mode.

---

## 6. Real-Time Architecture

- Single Socket.io server (namespace per concern: `/messaging`, `/notifications`,
  `/presence`) backed by the **Redis adapter**, so it horizontally scales
  later without protocol changes.
- A connected client authenticates the socket handshake with the same JWT
  access token used for REST.
- Redis pub/sub channels: `conversation:{id}`, `user:{id}:notifications`.
- Fallback: any realtime event also persists to Postgres (e.g. messages,
  notifications) so a client that reconnects after being offline can
  reconcile via REST — sockets are a delivery optimization, not the source
  of truth.

---

## 7. Media Pipeline

1. Client requests a **presigned upload URL** from the API (`POST /media/presign`).
2. Client uploads directly to R2 (bypasses API for the heavy bytes).
3. Client confirms upload; API enqueues a `processMedia` job (BullMQ/Redis).
4. Worker pulls the raw file, runs FFmpeg (transcode to H.264/AAC, generate
   thumbnail + multiple resolutions for adaptive delivery), writes outputs
   back to R2, updates `MediaAsset` row with processed URLs + status.
5. Client polls/subscribes for `media:ready` before showing the post as fully
   live (graceful "processing" state in the UI in the meantime).

This keeps the API stateless and fast, and isolates the CPU-heavy FFmpeg work
onto separate worker dynos that can scale independently of the API.

---

## 8. Caching Strategy

| What | Where | TTL / invalidation |
|---|---|---|
| Session/refresh token lookups | Redis | TTL = token expiry |
| User feed (recommended) | Redis, per-user key | 60s TTL, recomputed on write-behind |
| Profile data | Redis | Invalidated on profile update |
| Hot posts (high engagement) | Redis | 30s TTL |
| Rate-limit counters | Redis | Sliding window |
| Static assets / media | Cloudflare CDN edge | Immutable URLs (content-hashed), long TTL |

---

## 9. Testing & CI

- **Unit:** Vitest/Jest for services (business logic isolated from Express
  and Prisma via dependency injection / interfaces).
- **Integration:** supertest against a real Postgres test container (via
  Testcontainers) — catches ORM/query issues unit tests miss.
- **E2E:** Playwright against a staging deploy for critical flows (signup →
  post → like → comment → message).
- **CI gate (GitHub Actions):** lint → typecheck → unit → integration → build
  → (on main) deploy to staging → manual promote to prod.

---

## 10. Phased Roadmap (mapping the full original brief to "when")

| Phase | Trigger to start | Features added |
|---|---|---|
| **Phase 1 (MVP, this doc)** | Now | Auth, profiles, feed, stories, social graph, basic messaging, notifications, search, block/mute/report |
| **Phase 2 (Growth)** | Product-market fit signals, >10k WAU | TOTP 2FA, WebAuthn passkeys, OAuth social login, Groups/Communities, creator subscriptions/tips, OpenSearch for search, AI content moderation (spam/abuse classifiers), push notifications (mobile) |
| **Phase 3 (Scale)** | Approaching infra limits of the monolith (commonly 100k–1M MAU range, validate with real metrics rather than this number) | Extract Messaging and Media into separate services, introduce a message queue (Kafka/SQS) for event-driven fan-out, move from Docker Compose to ECS/Kubernetes, read replicas + sharding strategy for Postgres, full Signal-protocol E2EE for a "Secret Chat" mode, Snap Map, Marketplace, Events, Pages |
| **Phase 4 (Enterprise/100M+)** | Sustained scale requiring it | Full microservices + Kubernetes, multi-region active-active Postgres, Elasticsearch/OpenSearch cluster, dedicated security/threat-detection team and tooling, deepfake/scam AI detection pipelines |

The module boundaries in §4 are deliberately drawn so that Phase 3's
"extraction" is a deploy/infra change, not a rewrite of business logic.
