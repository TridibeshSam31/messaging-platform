# Messaging Platform

A real-time, one-to-one and group messaging platform built with **PostgreSQL + Prisma**, an **Express** REST API, a **Socket.IO** real-time layer, and a **React (Vite + TypeScript)** client. The backend is organized around a strict layered architecture (routes → controllers → services → Prisma) so business logic stays fully decoupled from HTTP and transport concerns.

> **Status: Work in progress.** The data model, environment/config layer, JWT utilities, and core middleware are implemented. Controllers, services, routes, and the Socket.IO event layer are scaffolded and being built out sprint by sprint — see [Project Status](#project-status).

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
- Real-time message delivery, edits, and deletions via WebSockets
- Typing indicators and online/offline presence
- Read receipts
- File and media attachments (images, video, audio, documents)
- Secure authentication with short-lived access tokens and httpOnly refresh tokens

The backend follows a strict **controller/service separation**: controllers are HTTP-only (parsing requests, validating input, mapping responses), and services are transport-agnostic (pure business logic and Prisma queries). This means the same service layer can be called from REST routes, Socket.IO handlers, or background jobs without duplicating logic.

---

## Features

| Area | Description |
|---|---|
| Authentication | Signup/login with bcrypt password hashing, dual JWT strategy (short-lived access token + httpOnly refresh token cookie) |
| User management | Profile retrieval/updates, avatar upload, username/name search |
| Conversations | Private and group conversations, admin roles, member management |
| Messaging | Text and attachment messages, cursor-based pagination, edit and soft-delete |
| Real-time layer | Socket.IO rooms per conversation, live message delivery, typing indicators, presence (online/offline + last seen) |
| Read receipts | Per-user, per-message read tracking with unread-count computation for conversation lists |
| File uploads | Multer-based multipart upload with type/size validation, pluggable storage (local disk / Cloudinary / S3) |
| Error handling | Centralized error-handling middleware mapping Zod, Prisma, and custom application errors to HTTP status codes |

---

## Tech Stack

**Backend**
- Node.js + TypeScript
- Express 5
- Prisma ORM + PostgreSQL
- Socket.IO
- JWT (`jsonwebtoken`) for auth, `bcrypt` for password hashing
- Zod for schema validation
- Multer for file uploads

**Frontend**
- React 19 + TypeScript
- Vite

**Tooling**
- ESLint, `tsx` / `nodemon` for local development

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Frontend ["Frontend (React + Vite)"]
        UI["React Components"]
        Store["Zustand Store"]
        SocketClient["Socket.IO Client"]
        API["Axios HTTP Client"]
    end

    subgraph Backend ["Backend (Express + Node.js)"]
        Router["Express Router"]
        Middleware["Auth Middleware (JWT)"]
        Controllers["Controllers"]
        Services["Service Layer"]
        SocketServer["Socket.IO Server"]
        Upload["Multer File Upload"]
    end

    subgraph Database ["Database"]
        PG["PostgreSQL"]
        Prisma["Prisma ORM"]
    end

    subgraph Storage ["File Storage"]
        S3["S3 / Cloudinary / Local Disk"]
    end

    UI --> API --> Router --> Middleware --> Controllers --> Services --> Prisma --> PG
    UI --> SocketClient --> SocketServer --> Services
    Upload --> S3
```

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

```mermaid
sequenceDiagram
    participant A as User A (Client)
    participant S as Socket.IO Server
    participant B as User B (Client)

    Note over A,B: Connection & Authentication
    A->>S: connect (with JWT in auth)
    S->>S: Verify JWT
    S->>S: Join user to their conversation rooms
    S->>S: Set user status ONLINE
    S-->>A: connected

    Note over A,B: Sending a Message
    A->>S: message:send {conversationId, content, type}
    S->>S: Save to DB via message.service
    S-->>A: message:new {message} (sender confirmation)
    S-->>B: message:new {message} (recipient delivery)

    Note over A,B: Typing Indicators
    A->>S: typing:start {conversationId}
    S-->>B: typing:start {conversationId, userId, name}
    A->>S: typing:stop {conversationId}
    S-->>B: typing:stop {conversationId, userId}

    Note over A,B: Read Receipts
    B->>S: message:read {messageId, conversationId}
    S->>S: Create ReadReceipt + update lastReadMessageId
    S-->>A: message:read {messageId, userId, readAt}

    Note over A,B: Presence
    A->>S: disconnect
    S->>S: Set user OFFLINE + update lastSeen
    S-->>B: user:offline {userId, lastSeen}
```

### File Upload Flow

```mermaid
graph LR
    A["Client"] -->|"multipart/form-data"| B["POST /api/upload"]
    B --> C{"Multer Middleware"}
    C -->|"Validate size & type"| D["Storage Adapter"]
    D -->|"Option 1"| E["Local Disk (dev)"]
    D -->|"Option 2"| F["Cloudinary"]
    D -->|"Option 3"| G["AWS S3"]
    D --> H["Return URL"]
    H --> A
    A -->|"message:send with attachment URLs"| I["Socket.IO"]
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
├── Client/                     # React + Vite frontend
│   └── src/
│       ├── App.tsx
│       └── main.tsx
│
└── Server/                     # Express + Prisma backend
    ├── prisma/
    │   ├── schema.prisma        # Data model (implemented)
    │   ├── migrations/
    │   └── seed.ts               # Seed script (placeholder)
    └── src/
        ├── config/
        │   ├── env.ts            # Zod-validated environment config (implemented)
        │   └── cors.ts           # CORS policy (implemented)
        ├── lib/
        │   ├── jwt.ts            # Token signing/verification (implemented)
        │   └── prisma.ts         # Prisma client singleton (implemented)
        ├── middleware/
        │   ├── auth.ts           # Bearer token auth guard (implemented)
        │   ├── errorHandler.ts   # Centralized error mapping (implemented)
        │   └── upload.ts         # Multer config (placeholder)
        ├── controllers/          # HTTP layer (in progress)
        ├── services/             # Business logic (in progress)
        ├── routes/                # Express routers (in progress)
        ├── socket/                # Socket.IO server + event handlers (in progress)
        └── types/                 # Shared Zod schemas and types
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
- Shared validation schemas for signup/login

**In progress / scaffolded**
- Auth, user, conversation, and message controllers
- Auth, user, conversation, and message services
- Express route definitions and app entry point (`index.ts`)
- Socket.IO server bootstrap and event handlers (chat, typing, presence)
- File upload middleware and endpoint
- Database seed script
- React client UI (auth, conversation list, and chat window not yet built)

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

Example `Server/.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/messaging_platform?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-secret"
CLIENT_URL="http://localhost:5173"
```

---

## Roadmap

- [ ] Wire up auth, user, conversation, and message routes/controllers/services
- [ ] Bootstrap the Express + HTTP + Socket.IO entry point
- [ ] Implement Socket.IO room-based real-time delivery, typing indicators, and presence
- [ ] Implement cursor-based message pagination and read receipts end-to-end
- [ ] Implement file upload endpoint and attachment handling
- [ ] Build the React client: auth flow, conversation sidebar, chat window, real-time hooks
- [ ] Add a database seed script for local development and demos
- [ ] Add automated tests for services and API routes

---

## License

Copyright © 2026 Tridibesh. All rights reserved.

This is a personal/private project. No license is granted for use, copying, modification, or distribution of this code without the author's explicit written permission.