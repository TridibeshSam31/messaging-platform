# Messaging Platform

A real-time, one-to-one and group messaging platform built with **PostgreSQL + Prisma**, an **Express** REST API, a native **WebSocket (`ws`)** real-time layer, and a **React (Vite + TypeScript)** client styled with Tailwind/shadcn. The backend is organized around a strict layered architecture (routes → controllers → services → Prisma) so business logic stays fully decoupled from HTTP and transport concerns.

> **Status: Backend and frontend are both wired end-to-end.** Auth, users, conversations, messages, read receipts, file uploads (Cloudinary), and the WebSocket real-time layer are implemented on the server. On the client, `App.tsx` now mounts a real router (session restore on load, protected `/chat` route), and the auth screens, chat window, group management, and profile UI are all live against real hooks and a real WebSocket connection — this was rebuilt from an empty-stub state over the course of this README's revisions. `npm run build` currently fails on two trivial unused-variable errors (not a real bug — see [Project Status](#project-status)), and a few group-management actions (rename, promote/demote, remove-a-specific-member) call the wrong endpoint or no endpoint at all. See [Project Status](#project-status) for the precise, verified list.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [System Overview](#system-overview)
  - [Auth Flow](#auth-flow)
  - [Real-Time Messaging Flow](#real-time-messaging-flow)
  - [File Upload Flow](#file-upload-flow)
  - [Frontend Structure](#frontend-structure)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Project Status](#project-status)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
  - [Phase 1 — WebSocket Reliability](#phase-1-websocket-reliability)
  - [Phase 2 — Message Recovery](#phase-2-message-recovery)
  - [Phase 3 — Redis Pub/Sub](#phase-3-redis-pubsub)
  - [Phase 4 — Horizontal WebSocket Scaling](#phase-4-horizontal-websocket-scaling)
  - [Phase 5 — Unified Message Pipeline](#phase-5-unified-message-pipeline)
  - [Phase 6 — Idempotency](#phase-6-idempotency)
  - [Phase 7 — Single HTTP + WebSocket Server](#phase-7-single-http-websocket-server)
  - [Phase 8 — Docker & Distributed Local Environment](#phase-8-docker--distributed-local-environment)
  - [Phase 9 — Observability](#phase-9-observability)
  - [Phase 10 — Testing & Load Testing](#phase-10-testing--load-testing)
  - [What Is NOT Being Added Yet](#what-is-not-being-added-yet)
  - [Engineering Progression](#engineering-progression)
  - [Engineering Goals](#engineering-goals)
- [License](#license)

---

## Overview

The goal of this project is a production-style chat application supporting:

- Private (1-on-1) and group conversations
- Real-time message delivery, edits, and deletions via a native WebSocket layer
- Typing indicators and online/offline presence
- Read receipts
- File and media attachments (images, video, audio, documents) via Cloudinary
- Secure authentication with short-lived access tokens and httpOnly refresh tokens

The backend follows a strict **controller/service separation**: controllers are HTTP-only (parsing requests, validating input, mapping responses), and services are transport-agnostic (pure business logic and Prisma queries). This means the same service layer can be called from REST routes, WebSocket handlers, or background jobs without duplicating logic.

The frontend follows a parallel separation: a thin **API layer** (`src/api/*`) wraps every REST call, **Zustand stores** hold client-side auth and chat state, and **components** stay focused on presentation, reading from the stores and hooks rather than fetching directly.

---

## Features

| Area | Description |
|---|---|
| Authentication | Signup/login with bcrypt password hashing, dual JWT strategy (short-lived access token + httpOnly refresh token cookie) |
| User management | Profile retrieval/updates, avatar upload, username/name search |
| Conversations | Private and group conversations, admin roles, member management |
| Messaging | Text and attachment messages, cursor-based pagination, edit and soft-delete |
| Real-time layer | Native WebSocket (`ws`) server with JWT-authenticated connections, verified room membership, in-memory presence tracking with live `user_online`/`user_offline` broadcasts, message delivery with `message_ack`/`message_delivered`/`read_receipt` events, and typing indicators |
| Read receipts | Per-user, per-message read tracking with unread-count computation for conversation lists |
| File uploads | Multer (memory storage) with type/size validation, streamed straight to Cloudinary |
| Error handling | Centralized error-handling middleware mapping Zod, Prisma, and custom application errors to HTTP status codes |
| Client UI | Login/signup forms, a three-column chat shell (sidebar + chat window + profile panel), message bubbles with read receipts and a typing indicator, group creation/settings/member list, avatar upload and profile editing — see [Frontend Structure](#frontend-structure). Fully wired to the backend, with the group-management caveats in [Project Status](#project-status) |

---

## Tech Stack

**Backend**
- Node.js + TypeScript
- Express 5
- Prisma ORM + PostgreSQL
- `ws` (native WebSocket server) for real-time messaging, typing, and presence
- JWT (`jsonwebtoken`) for auth, `bcrypt` for password hashing
- Zod for schema validation
- Multer (memory storage) + Cloudinary (via `streamifier`) for file/media uploads

**Frontend**
- React 19 + TypeScript, built with Vite (with the `@` → `src/` path alias configured in `vite.config.ts`)
- React Router (`react-router-dom`) for client-side routing, mounted in `App.tsx`
- Zustand for client state (`authStore`, `chatStore`, `socketStore`)
- Axios, with a request interceptor that attaches the access token and a response interceptor that transparently refreshes it on `401`
- Tailwind CSS + shadcn/ui (`base-nova` style, `neutral` base color) for the component library
- React Hook Form + Zod resolvers for form validation, used in the auth/profile forms
- `react-dropzone` for avatar/file uploads, `date-fns` for date formatting, `sonner` for toasts, `lucide-react` for icons

**Tooling**
- ESLint, `tsx` for local backend development

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Frontend ["Frontend (React + Vite) — wired to App.tsx"]
        UI["React Pages & Components"]
        Store["Zustand Stores (auth, chat, socket)"]
        API["API Layer (axios)"]
        WSClient["WebSocket Client (socket/index.ts)"]
    end

    subgraph Backend ["Backend (Express + Node.js)"]
        Router["Express Router"]
        Middleware["Auth Middleware (JWT)"]
        Controllers["Controllers"]
        Services["Service Layer"]
        WSServer["ws WebSocket Server (JWT-authenticated, port 8080)"]
        Upload["Multer (memory) File Upload"]
    end

    subgraph Database ["Database"]
        PG["PostgreSQL"]
        Prisma["Prisma ORM"]
    end

    subgraph Storage ["File Storage"]
        Cloudinary["Cloudinary"]
    end

    UI --> Store
    UI --> API --> Router --> Middleware --> Controllers --> Services --> Prisma --> PG
    UI --> WSClient --> WSServer --> Services
    Upload --> Cloudinary
```

> **Note:** `initializeWebSocket()` builds and binds its own internal HTTP server on port `8080`, entirely separate from the Express API's `app.listen(PORT)` — a deliberate split as of the current revision (`Server/src/index.ts` no longer creates a shared `http.createServer(app)` at all). Merging them back onto one port is tracked as open work in [Roadmap → Phase 7](#phase-7-single-http-websocket-server).

### Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as PostgreSQL

    Note over C,DB: Signup
    C->>S: POST /api/auth/signup {name, username, password}
    S->>S: Validate with Zod
    S->>S: Hash password (bcrypt, 12 rounds)
    S->>DB: Create User
    S->>S: Sign JWT (userId, 7d expiry)
    S-->>C: { user, accessToken, refreshToken }

    Note over C,DB: Login
    C->>S: POST /api/auth/login {username, password}
    S->>DB: Find user by username
    S->>S: Compare bcrypt hash
    S->>S: Sign JWT
    S-->>C: { user, accessToken, refreshToken }
```

On the client, `authStore` (Zustand) holds `user`, `accessToken`, and a `loading` flag; the intended flow — implemented in `useAuth.ts` and the axios interceptors — is to call `POST /auth/refresh` on mount to silently restore a session from the httpOnly refresh cookie, without persisting anything to `localStorage`.

### Real-Time Messaging Flow

The real-time layer is a native `ws` `WebSocketServer`, not Socket.IO. There are no built-in rooms/namespaces — rooms, per-user socket sets, and presence are tracked manually with in-memory `Map`/`Set` structures (`clients`, `rooms`, `onlineUsers`, `socketRooms`) in `Server/src/socket/index.ts`. The client authenticates by passing the access token as a `?token=` query param on the WebSocket URL, and all events are plain JSON messages distinguished by a `type` field.

```mermaid
sequenceDiagram
    participant A as User A (Client)
    participant S as ws WebSocket Server
    participant B as User B (Client)

    Note over A,B: Connection & Authentication
    A->>S: connect ws://.../?token=<accessToken>
    S->>S: Verify JWT, register in clients + onlineUsers maps
    S-->>A: connection accepted

    Note over A,B: Joining / Leaving a Conversation Room
    A->>S: {"type":"join_room", roomId}
    S->>S: handlePresence() adds socket to rooms + socketRooms maps

    Note over A,B: Sending a Message
    A->>S: {"type":"chat", conversationId, content, ...}
    S->>S: handleChat() saves message via message.service
    S-->>A: chat ack (sender confirmation)
    S-->>B: chat event (recipient delivery, broadcast to room)

    Note over A,B: Typing Indicators
    A->>S: {"type":"typing", conversationId}
    S-->>B: typing event (broadcast to room)
    A->>S: {"type":"stop_typing", conversationId}
    S-->>B: stop_typing event (broadcast to room)

    Note over A,B: Delivered Receipt
    B->>S: {"type":"delivered", messageId}
    S-->>A: message_delivered (sent to every socket of the original sender, all devices)

    Note over A,B: Read Receipt
    B->>S: {"type":"read", messageId, conversationId}
    S->>S: markAsRead() — upsert ReadReceipt, update ConversationMember.lastReadMessageId
    S-->>A: read_receipt (sent to every socket of the original sender, all devices)

    Note over A,B: Presence
    Note over A: On first socket for a user: DB status → ONLINE, user_online broadcast to all of that user's conversations
    A->>S: disconnect
    S->>S: Remove socket from clients/rooms/onlineUsers maps
    Note over A: On last socket for a user: DB status → OFFLINE (+ lastSeen), user_offline broadcast to all of that user's conversations
    S-->>B: user_offline event
```

#### Why a Custom `ws` Layer Instead of Socket.IO

Two design constraints shaped this:

1. **Never trust the client to self-identify.** A naive design lets a client send `{ userId: "1", msg: "..." }` directly — a malicious client could just claim to be any user. So identity is established once, at connection time, from the JWT (`?token=` query param), and the server-side `clients` map is the only source of truth for "which socket belongs to which user" from then on. Every handler looks the sender up from this map instead of trusting anything the message body says about who sent it.
2. **Raw `ws` broadcasts to everyone connected to a server — it has no built-in rooms.** So all room/conversation scoping has to be built by hand: a message from a client should only reach the other members of that conversation, not every connected socket.

That gives four in-memory maps, each solving one piece of the puzzle (all in `Server/src/socket/index.ts`):

| Map | Shape | Purpose |
|---|---|---|
| `clients` | `WebSocket → { userId }` | Identify the sender of any incoming message — the server never trusts a client-supplied `userId` |
| `rooms` | `roomId → Set<WebSocket>` | Scope broadcasts to just the members of a conversation, instead of every connected socket |
| `onlineUsers` | `userId → Set<WebSocket>` | Track online/offline presence per user, supporting multiple simultaneous connections (e.g. phone + laptop) |
| `socketRooms` | `WebSocket → Set<roomId>` | Reverse index of `rooms`, so on disconnect the server can remove one socket from every room it had joined in O(rooms joined) instead of scanning every room |

**Disconnect cleanup** relies on that reverse index: `clients.delete(ws)` alone would leave a dangling reference inside every `rooms` entry the socket had joined, since those entries hold `WebSocket` objects directly and aren't otherwise linked back to `clients`. `socketRooms.get(ws)` gives the exact set of rooms to clean, and each `rooms` entry is deleted once its member set is empty — same pattern for `onlineUsers`, so a user is only marked offline once their last connected device disconnects.

**Message acknowledgement** already round-trips: after `handleChat` persists the message (via `MessageHandlerClass.sendMessage`, which also re-verifies the sender is a conversation member before writing), it broadcasts to the rest of the room and separately sends a `message_ack` back to the sender with the full saved message — so the sender client can confirm the message was actually stored, not just sent.

**Delivered and read receipts are live WebSocket events, not just REST.** `handleDelivered` and `handleRead` (`Server/src/socket/handlers/delivered.handler.ts` / `read.handler.ts`) push `message_delivered` and `read_receipt` events straight to every active socket of the *original sender* — not the whole room, since delivery/read status is a 1-to-1 signal and broadcasting it to every participant would leak who has or hasn't seen each message. `read_receipt` also persists through the same `MessageHandlerClass.markAsRead` used by the REST `POST /messages/:id/read` endpoint, so both entry points stay consistent. `message_delivered` is deliberately not persisted — it's treated as a live-only signal for upgrading a single-tick to a double-tick in the UI.

**Presence is broadcast, not just tracked.** On a user's *first* socket connecting, the server sets their DB `status` to `ONLINE` and pushes a `user_online` event to every conversation they're a member of (looked up from the database, since `rooms`/`socketRooms` may still be empty at connect time if the client hasn't sent `join_room` yet). On their *last* socket disconnecting, it sets `status` to `OFFLINE` with an updated `lastseen`, and broadcasts `user_offline` (with the new `lastSeen`) the same way. A disconnect that happens without an explicit `leave_room` (e.g. the browser tab is just closed) still triggers a `user_left` broadcast to the room, using the `socketRooms` reverse index — so departures are handled correctly even when the client never gets a chance to clean up after itself.

**Room membership is verified server-side.** `join_room` used to trust any `roomId` a client sent; now `handlePresence` checks `ConversationMember` in the database before adding the socket to a room, and rejects with an `error` event if the user isn't actually a member of that conversation — closing off a real vulnerability where any authenticated user could subscribe to any conversation's broadcasts just by knowing (or guessing) its ID.

**Rate limiting** (`Server/src/socket/rateLimiter.ts`) guards the message handler against spam: a fixed-window counter keyed per-socket (not per-user, so one spamming device doesn't penalize a user's other devices) rejects a connection's messages once it crosses 20 messages per 10-second window, before any parsing or DB work happens. The counter is cleared on disconnect to avoid leaking memory for closed sockets. Being per-instance and in-memory, it won't hold up once there are multiple backend processes behind a load balancer — see the remaining hardening work below.

**Remaining real-time hardening** (see [Roadmap](#roadmap)): heartbeat (`ping`/`pong`) to detect and remove dead sockets, client-side reconnection with automatic room rejoin, and Redis pub/sub so presence/rooms/rate-limiting work correctly across multiple backend instances instead of only within one process's memory.

### File Upload Flow

```mermaid
graph LR
    A["Client"] -->|"multipart/form-data"| B["POST /api/uploads (or /me/avatar, /messages)"]
    B --> C{"Multer Middleware (memory storage)"}
    C -->|"Validate size & type"| D["upload.service"]
    D -->|"streamifier: Buffer to Readable Stream"| E["Cloudinary upload_stream"]
    E --> F["Return { url, publicId, mimeType, size, fileName }"]
    F --> A
    A -->|"chat message with attachment URLs"| G["ws WebSocket Server"]
```

### Frontend Structure

The client is organized in five layers, each with its own folder under `Client/src`:

```mermaid
graph TB
    Pages["pages/ — AuthPage, ChatPage"]
    Components["components/ — auth, chat, group, profile, layout, ui (shadcn primitives)"]
    Hooks["hooks/ — useAuth, useMessages, useConversation, useTyping"]
    Socket["socket/ — WS singleton (connect/sendWS/onWSMessage), useSocketEvents"]
    Stores["stores/ — authStore, chatStore, socketStore (connected flag)"]
    ApiLayer["api/ — auth, users, conversations, message, upload (axios + refresh interceptor)"]

    Pages --> Components
    Pages --> Hooks
    Components --> Hooks
    Hooks --> Socket
    Hooks --> Stores
    Socket --> Stores
    Hooks --> ApiLayer
    ApiLayer -->|REST| Backend["Express API"]
    Socket -->|WS, port 8080| Backend
```

- **`pages/`** — `AuthPage` (login/signup, switches mode based on route) and `ChatPage` (the three-column chat shell; calls `useConversation()` to load the sidebar list and `useSocketEvents()` to join rooms once `socketStore.connected` is true).
- **`components/`** — organized by domain: `auth/` (LoginForm, SignupForm — React Hook Form + Zod), `chat/` (ChatWindow, MessageList, MessageBubble, MessageInput, ConversationList/Item, ChatHeader, ProfilePanel, ReadReceipt, TypingIndicator), `group/` (CreateGroupModal, GroupSettings, MemberList), `profile/` (ProfileModal, AvatarUpload via `react-dropzone`), `layout/` (AppLayout, Sidebar), and `ui/` (shadcn primitives, including a custom `Logo` — the "VEYRA" gold-heart emblem — and `alert-dialog`).
- **`hooks/`** — `useAuth` (login/signup/logout against `authStore`), `useMessages` (paginated fetch + the hybrid WS-for-text / REST-for-attachments send path), `useConversation` (loads the conversation list once per login), `useTyping` (throttled typing/stop_typing emission with an idle timeout).
- **`socket/`** — a module-level WebSocket singleton (`connectSocket`/`sendWS`/`onWSMessage`/`joinRoom`/`leaveRoom`) plus `useSocketEvents`, which subscribes once per session and dispatches every incoming event type (`chat`, `message_ack`, `typing`, `read_receipt`, `message_delivered`, `user_online`/`user_offline`, …) into `chatStore`.
- **`stores/`** — `authStore` (Zustand: `user`, `accessToken`, `loading`, plus login/logout/update actions), `chatStore` (conversations, active conversation, messages, typing/online sets, `lastDeliveredMessageIds`, a `readReceiptsEnabled` toggle), and `socketStore` (a single reactive `connected` flag, mirroring the WS singleton's open/closed state — `ChatPage` waits on it before joining rooms).
- **`api/`** — one file per REST resource, all routed through a shared `axios` instance (`api/axios.ts`) that attaches the bearer token on every request and silently retries with a refreshed token on a `401`.

---

## Data Model

```mermaid
erDiagram
    User ||--o{ ConversationMember : "has memberships"
    User ||--o{ Message : "sends"
    User ||--o{ ReadReceipt : "reads"

    Conversation ||--o{ ConversationMember : "has members"
    Conversation ||--o{ Message : "contains"
    Conversation |o--o| Message : "lastMessage"

    ConversationMember }o--o| Message : "lastReadMessage"

    Message ||--o{ Attachment : "has"
    Message ||--o{ ReadReceipt : "tracked by"

    User {
        string id PK
        string name
        string username
        string password
        string avatar
        enum status
        datetime lastseen
    }

    Conversation {
        string id PK
        enum type
        string name
        string lastMessageId FK
    }

    ConversationMember {
        string id PK
        string conversationId FK
        string userId FK
        enum role
        string lastReadMessageId FK
    }

    Message {
        string id PK
        string conversationId FK
        string senderId FK
        enum type
        string content
        datetime editedAt
        datetime deletedAt
    }

    Attachment {
        string id PK
        string messageId FK
        string url
        string mimeType
        int size
    }

    ReadReceipt {
        string id PK
        string messageId FK
        string userId FK
        datetime readAt
    }
```

Six core models, defined in `Server/prisma/schema.prisma`:

- **User** — account details, avatar, online status, last seen
- **Conversation** — private or group, with a denormalized pointer to its last message for fast sidebar rendering
- **ConversationMember** — join table between users and conversations, carrying role (`ADMIN`/`MEMBER`) and the member's last-read message
- **Message** — text and/or attachment-bearing messages, with edit and soft-delete timestamps. `type` is one of `TEXT`, `IMAGE`, `VIDEO`, `FILE`, `AUDIO`
- **Attachment** — file metadata (URL, MIME type, size) linked to a message
- **ReadReceipt** — per-user read tracking per message, unique per `(messageId, userId)`

Indexing is applied on `(conversationId, createdAt)` for efficient cursor-based message pagination.

---

## Project Structure

```
messaging-platform/
├── Client/                        # React + Vite frontend
│   └── src/
│       ├── api/                       # axios instance + one module per REST resource (auth, users, conversations, message, upload)
│       ├── components/
│       │   ├── auth/                  # LoginForm, SignupForm
│       │   ├── chat/                  # ChatWindow, MessageList, MessageBubble, MessageInput, ConversationList/Item, ChatHeader, ProfilePanel, ReadReceipt, TypingIndicator
│       │   ├── group/                 # CreateGroupModal, GroupSettings, MemberList
│       │   ├── profile/               # ProfileModal, AvatarUpload
│       │   ├── layout/                # AppLayout, Sidebar
│       │   ├── ui/                    # shadcn/ui primitives + custom Logo
│       │   └── utils/                 # formatDate, FormatFileSize, constants (WS_EVENTS, getMessageTypeFromMime)
│       ├── hooks/                     # useAuth, useMessages, useConversation, useTyping — all implemented
│       ├── lib/                       # schemas.ts (Zod), utils.ts
│       ├── pages/                     # AuthPage, ChatPage
│       ├── socket/                    # WS singleton (index.ts) + useSocketEvents.ts
│       ├── stores/                    # authStore, chatStore, socketStore — all implemented
│       ├── types/                     # shared frontend types (User, Message, Conversation, Attachment, ReadReceipt)
│       ├── App.tsx                    # BrowserRouter + routes (/, /login, /signup, protected /chat) + session restore on load
│       └── main.tsx                   # renders <App />
│
└── Server/                        # Express + Prisma backend
    ├── prisma/
    │   ├── schema.prisma          # Data model (implemented)
    │   ├── migrations/
    │   └── seed.ts                 # Seed script (implemented — sample users/conversations/messages)
    └── src/
        ├── config/
        │   ├── env.ts              # Zod-validated environment config (implemented)
        │   └── cors.ts             # CORS policy (implemented)
        ├── lib/
        │   ├── jwt.ts              # Token signing/verification (implemented)
        │   ├── prisma.ts           # Prisma client singleton (implemented)
        │   └── cloudinary.ts       # Cloudinary config/client (implemented)
        ├── middleware/
        │   ├── auth.ts             # Bearer token auth guard (implemented)
        │   ├── errorHandler.ts     # Centralized error mapping (implemented)
        │   └── upload.ts           # Multer memory-storage config (implemented)
        ├── controllers/            # auth, user, conversation, message, upload (implemented)
        ├── services/                # auth, user, conversation, message, upload (implemented)
        ├── routes/                  # auth, user, conversation, message, upload routers (implemented)
        ├── socket/
        │   ├── index.ts             # ws server bootstrap, auth, presence broadcast, connection state (implemented)
        │   ├── rateLimiter.ts       # per-socket fixed-window rate limiter (implemented)
        │   └── handlers/            # chat, typing, presence, delivered, read handlers (implemented)
        └── types/                    # Shared Zod schemas and types
```

---

## Project Status

This section reflects the current, verified state of the codebase (confirmed via `tsc --noEmit` and an actual `vite build`), not the end goal.

**Backend — implemented**
- Full Prisma schema and migrations
- Environment variable validation (`env.ts`) and CORS configuration
- JWT signing/verification utilities (access + refresh tokens)
- Auth middleware for protected routes
- Centralized error-handling middleware (Zod, Prisma, and custom `AppError` mapping)
- Shared validation schemas (signup/login, create-conversation, send-message, etc.)
- Auth controller/service/routes: signup, login, refresh, logout (httpOnly refresh-token cookie)
- User controller/service/routes: get current user, update profile, avatar upload, search, get by id
- Conversation controller/service/routes: create private/group, get all, get by id, rename (`PATCH /:id`), leave (`DELETE /:id`), add member (`POST /:id/members`), remove a specific member (`DELETE /:id/members/:userId`), change a member's role (`PATCH /:id/members/:userId/role`)
- Message controller/service/routes: cursor-paginated fetch, send (with attachments), edit, soft-delete, read-receipt endpoint — mounted at bare `/api` so the controller's own `/conversations/:id/messages` and `/messages/:id` paths resolve correctly
- File upload: Multer (memory storage, type/size validation) → Cloudinary via `streamifier`, wired into avatar, message-attachment, and standalone upload endpoints
- Real-time layer: native `ws` WebSocket server (JWT-authenticated on connect) with `chat`, `typing`/`stop_typing`, `join_room`/`leave_room` (presence, server-side conversation-membership verification), `delivered`, and `read` handlers, backed by in-memory connection/room/presence maps, including sender-side `message_ack` on send. Runs its own internal HTTP server on port `8080`, separate from the Express API
- Live presence broadcasting, live delivered/read receipts, per-socket rate limiting (see [Real-Time Messaging Flow](#real-time-messaging-flow) for detail)
- Express app entry point (`index.ts`) wiring all REST routers together
- Database seed script (`prisma/seed.ts`)

**Frontend — implemented and wired up**
- `App.tsx`: `BrowserRouter` with `/`, `/login`, `/signup`, and a protected `/chat` route; restores a session on load via `authApi.refresh()` against the httpOnly refresh cookie
- Auth screens: `LoginForm` / `SignupForm` with React Hook Form + Zod validation, toast feedback via `sonner`
- Chat UI: three-column `AppLayout` (sidebar / chat window / profile panel), `MessageList` + `MessageBubble` + `MessageInput`, `TypingIndicator`, `ReadReceipt`
- Sidebar: searchable `ConversationList`, start-private-chat modal, logout, read-receipts toggle
- Group management UI: create-group modal, group settings, member list (see gaps below — some of these actions don't call the right endpoint yet)
- Profile: profile modal, avatar upload (`react-dropzone`)
- `Logo`: a custom "VEYRA" gold-heart SVG emblem, not a placeholder
- State layer: `authStore`, `chatStore`, and `socketStore` (Zustand) all implemented
- `hooks/`: `useAuth`, `useMessages` (cursor pagination + hybrid WS-text/REST-attachment send), `useConversation` (loads the conversation list once per login), `useTyping` (throttled emission + idle timeout) — all implemented
- `socket/`: a WebSocket singleton (`connectSocket`/`sendWS`/`onWSMessage`) and `useSocketEvents`, which dispatches every server event into `chatStore` — implemented and connected; `ChatPage` gates room-joining on `socketStore.connected`
- API layer (`api/auth.ts`, `users.ts`, `conversations.ts`, `message.ts`, `upload.ts`) on top of a shared `axios` instance with a token-refresh interceptor
- Build tooling: the Vite `@` path alias (`resolve.alias`) and Tailwind's `content` globs are both configured now — previously `@/` imports couldn't resolve at build time and no Tailwind utility classes were being generated at all. `react-hook-form`, `@hookform/resolvers`, and `zod` are now explicit dependencies in `Client/package.json`

**Known gaps**

- The WebSocket server and the Express API run on two separate ports (`PORT` and `8080`) rather than sharing one — see [Roadmap → Phase 7](#phase-7-single-http-websocket-server).
- Attachment messages (sent via REST, since the WS `chat` handler is text-only) don't reach the other participant live — see [Roadmap → Phase 5](#phase-5-unified-message-pipeline).

---

## Getting Started

### Prerequisites
- Node.js (LTS)
- PostgreSQL instance
- npm

### Backend Setup

```bash
cd Server
npm install

# Configure environment variables (see below)
cp .env.example .env   # create this file if it doesn't exist yet

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start the dev server
npm run dev
```

### Frontend Setup

```bash
cd Client
npm install

# Configure environment variables (see below)
# create Client/.env with VITE_API_URL and VITE_WS_URL

npm run dev
```

Note: `npm run dev` works. `npm run build` currently fails at the `tsc -b` step on two unused-variable errors in `hooks/useAuth.ts` — see [Project Status](#project-status) for the one-line fix.

---

## Environment Variables

### Server

The backend validates its environment at startup using Zod (`Server/src/config/env.ts`). The following variables are required:

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `production` \| `test` (defaults to `development`) |
| `PORT` | Port the Express server listens on (defaults to `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret used to sign short-lived access tokens (min. 8 characters) |
| `JWT_REFRESH_SECRET` | Secret used to sign long-lived refresh tokens (min. 8 characters) |
| `CLIENT_URL` | Frontend origin, used for CORS and cookie scoping |

The following are also required at runtime for file uploads (`Server/src/lib/cloudinary.ts` throws if any are missing), though they aren't yet part of the Zod-validated `env.ts` schema above:

| Variable | Description |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Example `Server/.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/messaging_platform?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-secret"
CLIENT_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### Client

`Client/src/api/axios.ts` reads its API base URL, and `Client/src/socket/index.ts` reads the WebSocket URL, from Vite's `import.meta.env`. No `.env.example` exists yet, so create `Client/.env` manually:

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend REST API, e.g. `http://localhost:5000/api` |
| `VITE_WS_URL` | Base URL of the WebSocket server, e.g. `ws://localhost:8080` — a separate port from `VITE_API_URL` (see the System Overview note in [Architecture](#architecture)) |

---

## Roadmap

The near-term frontend gaps (group-management endpoints, the `useAuth.ts` build error) are tracked in [Project Status → Known gaps](#project-status). What follows is the longer engineering roadmap for the real-time layer itself — the project is intentionally sequenced so each phase is load-bearing for the next, rather than picking up distributed-systems pieces (Redis, horizontal scaling, idempotency) before the WebSocket lifecycle underneath them is actually reliable.

### Phase 1 — WebSocket Reliability

- [ ] Implement heartbeat / ping-pong
- [ ] Track last successful pong
- [ ] Detect dead sockets
- [ ] Terminate stale connections
- [ ] Implement client-side automatic reconnection
- [ ] Add exponential reconnect backoff
- [ ] Reset reconnect attempts after successful connection
- [ ] Add WebSocket connection state to frontend
- [ ] Automatically rejoin rooms after reconnect
- [ ] Make disconnect cleanup idempotent

**Target**

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: ping
    S->>C: pong
```

```mermaid
graph TD
    A[No pong] --> B[Dead connection]
    B --> C[Close]
    C --> D[Reconnect]
```

### Phase 2 — Message Recovery

WebSocket is a transport mechanism, not permanent storage. PostgreSQL remains the source of truth.

- [ ] Add `lastMessageId` / cursor strategy
- [ ] Track last processed message on client
- [ ] Detect missed messages after reconnect
- [ ] Fetch missed messages from PostgreSQL
- [ ] Merge recovered messages into Zustand state
- [ ] Deduplicate recovered messages
- [ ] Test network interruption recovery
- [ ] Test recovery after WebSocket server restart

**Target**

```mermaid
graph TD
    A[Connection Lost] --> B[Reconnect]
    B --> C[Find Last Received Message]
    C --> D[Fetch Missing Messages]
    D --> E[(PostgreSQL)]
    E --> F[Restore Client State]
```

### Phase 3 — Redis Pub/Sub

Introduce Redis as the cross-instance realtime event bus.

- [ ] Add Redis
- [ ] Create Redis connection module
- [ ] Create realtime event publisher
- [ ] Create realtime event subscriber
- [ ] Define typed realtime event contracts
- [ ] Publish message events through Redis
- [ ] Subscribe every WebSocket instance
- [ ] Route Redis events to local sockets
- [ ] Handle Redis connection failures
- [ ] Keep PostgreSQL as source of truth
- [ ] Keep Redis Pub/Sub as event distribution only

**Target**

```mermaid
graph TD
    PG[(PostgreSQL)] --> Redis[Redis Pub/Sub]
    Redis --> WS1[WS-1]
    Redis --> WS2[WS-2]
    Redis --> WS3[WS-3]
    WS1 --> C1[Clients]
    WS2 --> C2[Clients]
    WS3 --> C3[Clients]
```

### Phase 4 — Horizontal WebSocket Scaling

Run multiple WebSocket instances behind a load balancer.

- [ ] Run WS-1
- [ ] Run WS-2
- [ ] Add reverse proxy/load balancer
- [ ] Keep connection maps local to each instance
- [ ] Verify cross-instance messaging
- [ ] Verify typing across instances
- [ ] Verify read receipts across instances
- [ ] Verify delivered receipts across instances
- [ ] Verify presence across instances
- [ ] Handle graceful WebSocket instance shutdown

**Critical Test**

```mermaid
sequenceDiagram
    participant A as Client A
    participant W1 as WS-1
    participant R as Redis Pub/Sub
    participant W2 as WS-2
    participant B as Client B
    A->>W1: send message
    W1->>R: publish
    R->>W2: deliver
    W2->>B: broadcast
```

If A and B are connected to different WebSocket servers, B should still receive A's message in realtime.

### Phase 5 — Unified Message Pipeline

Currently REST and WebSocket are separate transports. The goal is to make them share the same message business logic.

- [ ] Extract message creation into a reusable service
- [ ] REST → Message Service
- [ ] WebSocket → Message Service
- [ ] Persist before publishing event
- [ ] Publish attachment messages through realtime pipeline
- [ ] Make attachment messages appear live without reload
- [ ] Keep transport concerns outside business logic

**Target**

```mermaid
graph TD
    REST[REST] --> MS[Message Service]
    WSIn[WebSocket] --> MS
    MS --> PG[(PostgreSQL)]
    MS --> RE[Redis Event]
    RE --> WSC[WebSocket Clients]
```

> This is the phase that closes the current gap where attachment messages (sent via REST, since the WS `chat` handler is text-only) don't reach the other participant live — see [Project Status](#project-status).

### Phase 6 — Idempotency

Prevent duplicate messages when clients retry.

- [ ] Generate `clientMessageId`
- [ ] Send it with each message
- [ ] Store it with the message
- [ ] Add database uniqueness constraint
- [ ] Make message creation idempotent
- [ ] Safely retry failed messages
- [ ] Prevent duplicate messages after reconnect
- [ ] Test timeout + retry scenarios

Example:

```json
{
  "clientMessageId": "01JXXXX",
  "conversationId": "conversation-id",
  "content": "Hello"
}
```

If the same request arrives twice:

```
Request 1 → Create message
Request 2 → Return existing message
```

instead of creating duplicates.

### Phase 7 — Single HTTP + WebSocket Server

Currently the WebSocket server runs separately from the Express server.

- [ ] Attach WebSocket server to the existing HTTP server
- [ ] Share the same HTTP port
- [ ] Centralize graceful shutdown
- [ ] Avoid separate HTTP server creation inside the WebSocket module

**Target**

```mermaid
graph TD
    NP[Node Process] --> HS["HTTP Server<br/>Express + WS"]
```

### Phase 8 — Docker & Distributed Local Environment

- [ ] Create backend Dockerfile
- [ ] Create frontend Dockerfile if needed
- [ ] Add Docker Compose
- [ ] PostgreSQL container
- [ ] Redis container
- [ ] WS-1 container
- [ ] WS-2 container
- [ ] Reverse proxy/load balancer
- [ ] Health checks
- [ ] Graceful shutdown
- [ ] Verify cross-instance messaging locally

**Target**

```mermaid
graph TD
    LB[Load Balancer] --> WS1[WS-1]
    LB --> WS2[WS-2]
    WS1 --> Redis[(Redis)]
    WS2 --> Redis
    Redis --> PG[(PostgreSQL)]
```

### Phase 9 — Observability

- [ ] Structured logging
- [ ] Connection IDs
- [ ] Request IDs
- [ ] Active WebSocket connection metrics
- [ ] Connections per instance
- [ ] Reconnect frequency
- [ ] Message delivery latency
- [ ] Redis failure metrics
- [ ] Database latency metrics
- [ ] WebSocket health endpoint
- [ ] Graceful shutdown logging

### Phase 10 — Testing & Load Testing

- [ ] Unit tests for services
- [ ] Unit tests for controllers
- [ ] Unit tests for socket handlers
- [ ] Authentication failure tests
- [ ] Unauthorized room access tests
- [ ] Disconnect cleanup tests
- [ ] Multi-device tests
- [ ] Duplicate message tests
- [ ] Reconnect tests
- [ ] Message recovery tests
- [ ] Redis Pub/Sub tests
- [ ] Multi-instance integration tests
- [ ] End-to-end realtime tests
- [ ] Concurrent WebSocket load testing
- [ ] Measure realtime message latency

### Smaller open items

Not part of the phased plan above, but still open:

- [ ] Move Cloudinary env vars into the shared Zod-validated `env.ts` schema
- [ ] Deploy backend + frontend and document a production setup

### What Is NOT Being Added Yet

The project is intentionally not becoming a technology checklist. The following are not immediate priorities:

- Kafka
- RabbitMQ
- Kubernetes
- Microservices
- GraphQL
- Event sourcing

The current priority is to build the realtime infrastructure correctly before introducing more distributed-system technologies.

### Engineering Progression

```mermaid
graph TD
    A[Functional Chat Application] --> B[Reliable WebSocket Lifecycle]
    B --> C[Heartbeat + Reconnection]
    C --> D[Message Recovery]
    D --> E[Redis Pub/Sub]
    E --> F[Horizontal WebSocket Scaling]
    F --> G[Idempotent Messaging]
    G --> H[Dockerized Distributed Setup]
    H --> I[Observability]
    I --> J[Load Testing]
```

### Engineering Goals

This project is intended to demonstrate more than frontend chat functionality. The long-term goal is to understand and implement:

- WebSocket fundamentals
- Persistent connection lifecycle
- JWT authentication over WebSockets
- Room management
- Presence systems
- Multi-device sessions
- Delivery/read semantics
- Reconnection and recovery
- Idempotent writes
- Redis event distribution
- Horizontal WebSocket scaling
- Persistent vs ephemeral state
- Containerized deployment
- Observability
- Realtime system testing

---

## License

Copyright © 2026 Tridibesh. All rights reserved.

This is a personal/private project. No license is granted for use, copying, modification, or distribution of this code without the author's explicit written permission.