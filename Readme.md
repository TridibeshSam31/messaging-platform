# Messaging Platform

A real-time, one-to-one and group messaging platform built with **PostgreSQL + Prisma**, an **Express** REST API, a native **WebSocket (`ws`)** real-time layer, and a **React (Vite + TypeScript)** client. The backend is organized around a strict layered architecture (routes → controllers → services → Prisma) so business logic stays fully decoupled from HTTP and transport concerns.

> **Status: Backend functionally complete, frontend not started.** Auth, users, conversations, messages, read receipts, file uploads (Cloudinary), and the WebSocket real-time layer (presence, typing, chat) are all implemented end-to-end. The React client is still the default Vite scaffold — no auth flow, conversation list, or chat UI yet. See [Project Status](#project-status).

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
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Project Status](#project-status)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
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
- React 19 + TypeScript
- Vite
- *(UI not yet built — still the default Vite starter template)*

**Tooling**
- ESLint, `tsx` for local development

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Frontend ["Frontend (React + Vite) — not yet built"]
        UI["React Components"]
        API["HTTP Client"]
        WSClient["WebSocket Client"]
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

    UI --> API --> Router --> Middleware --> Controllers --> Services --> Prisma --> PG
    UI --> WSClient --> WSServer --> Services
    Upload --> Cloudinary
```

> **Note:** the WebSocket server is currently started as its own standalone `ws` server on port `8080` inside `initializeWebSocket`, separate from the Express API's HTTP server — it does not yet share a port with the REST API.

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

**Message acknowledgement** already round-trips: after `handleChat` persists the message (now via `MessageHandlerClass.sendMessage`, which also re-verifies the sender is a conversation member before writing), it broadcasts to the rest of the room and separately sends a `message_ack` back to the sender with the full saved message — so the sender client can confirm the message was actually stored, not just sent.

**Delivered and read receipts are now live WebSocket events, not just REST.** `handleDelivered` and `handleRead` (`Server/src/socket/handlers/delivered.handler.ts` / `read.handler.ts`) push `message_delivered` and `read_receipt` events straight to every active socket of the *original sender* — not the whole room, since delivery/read status is a 1-to-1 signal and broadcasting it to every participant would leak who has or hasn't seen each message. `read_receipt` also persists through the same `MessageHandlerClass.markAsRead` used by the REST `POST /messages/:id/read` endpoint, so both entry points stay consistent. `message_delivered` is deliberately not persisted — it's treated as a live-only signal for upgrading a single-tick to a double-tick in the UI.

**Presence is now broadcast, not just tracked.** On a user's *first* socket connecting, the server sets their DB `status` to `ONLINE` and pushes a `user_online` event to every conversation they're a member of (looked up from the database, since `rooms`/`socketRooms` may still be empty at connect time if the client hasn't sent `join_room` yet). On their *last* socket disconnecting, it sets `status` to `OFFLINE` with an updated `lastseen`, and broadcasts `user_offline` (with the new `lastSeen`) the same way. A disconnect that happens without an explicit `leave_room` (e.g. the browser tab is just closed) still triggers a `user_left` broadcast to the room, using the `socketRooms` reverse index — so departures are handled correctly even when the client never gets a chance to clean up after itself.

**Room membership is now verified server-side.** `join_room` used to trust any `roomId` a client sent; now `handlePresence` checks `ConversationMember` in the database before adding the socket to a room, and rejects with an `error` event if the user isn't actually a member of that conversation — closing off a real vulnerability where any authenticated user could subscribe to any conversation's broadcasts just by knowing (or guessing) its ID.

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
- **Message** — text and/or attachment-bearing messages, with edit and soft-delete timestamps
- **Attachment** — file metadata (URL, MIME type, size) linked to a message
- **ReadReceipt** — per-user read tracking per message, unique per `(messageId, userId)`

Indexing is applied on `(conversationId, createdAt)` for efficient cursor-based message pagination.

---

## Project Structure

```
messaging-platform/
├── Client/                     # React + Vite frontend (default scaffold, not built out yet)
│   └── src/
│       ├── App.tsx
│       └── main.tsx
│
└── Server/                     # Express + Prisma backend
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

This section reflects the current state of the codebase, not the end goal.

**Implemented**
- Full Prisma schema and initial migration
- Environment variable validation (`env.ts`) and CORS configuration
- JWT signing/verification utilities (access + refresh tokens)
- Auth middleware for protected routes
- Centralized error-handling middleware (Zod, Prisma, and custom `AppError` mapping)
- Shared validation schemas (signup/login, create-conversation, send-message, etc.)
- Auth controller/service/routes: signup, login, refresh, logout (httpOnly refresh-token cookie)
- User controller/service/routes: get current user, update profile, avatar upload, search, get by id
- Conversation controller/service/routes: create private/group, get all, get by id, update, leave, add/remove member, change member role
- Message controller/service/routes: cursor-paginated fetch, send (with attachments), edit, soft-delete, read-receipt endpoint
- File upload: Multer (memory storage, type/size validation) → Cloudinary via `streamifier`, wired into avatar, message-attachment, and standalone upload endpoints
- Real-time layer: native `ws` WebSocket server (JWT-authenticated on connect) with `chat`, `typing`/`stop_typing`, `join_room`/`leave_room` (presence, now with server-side conversation-membership verification), `delivered`, and `read` handlers, backed by in-memory connection/room/presence maps, including sender-side `message_ack` on send
- Live presence broadcasting: `user_online` / `user_offline` events pushed to a user's conversations on their first/last socket connecting or disconnecting, synced with `User.status` and `lastseen` in the database
- Live delivered/read receipts: `message_delivered` and `read_receipt` WebSocket events pushed to the original sender's active sockets, alongside the existing REST read-receipt endpoint (both write through the same `MessageHandlerClass.markAsRead`)
- Per-socket rate limiting on incoming WebSocket messages (fixed-window counter, spam prevention)
- Express app entry point (`index.ts`) wiring all REST routers together
- Database seed script (`prisma/seed.ts`) — creates sample users, a private conversation, and a group conversation with messages, attachments, and a read receipt

**In progress / not started**
- Running the WebSocket server on the same HTTP server/port as the Express API — it currently boots its own server on port `8080`
- Automated tests for services, controllers, and socket handlers
- React client UI — auth flow, conversation sidebar, and chat window haven't been started; `Client/src` is still the unmodified Vite starter template

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
npm run dev
```

---

## Environment Variables

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

---

## Roadmap

- [ ] Build the React client: auth flow, conversation sidebar, chat window, real-time hooks
- [ ] Heartbeat (`ping`/`pong`) to detect and clean up dead WebSocket connections
- [ ] Client-side reconnection handling, including automatic room rejoin after a dropped connection
- [ ] Horizontal scaling via Redis pub/sub, so presence, rooms, and rate limiting work correctly across multiple backend instances
- [ ] Share a single HTTP server/port between the Express API and the `ws` WebSocket server
- [ ] Move Cloudinary env vars into the shared Zod-validated `env.ts` schema
- [ ] Add automated tests for services, controllers, and socket handlers
- [ ] Deploy backend + frontend and document a production setup

---

## License

Copyright © 2026 Tridibesh. All rights reserved.

This is a personal/private project. No license is granted for use, copying, modification, or distribution of this code without the author's explicit written permission.
