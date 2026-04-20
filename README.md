# The People Book

[![Watch the demo](https://img.youtube.com/vi/Li9VcNrbDqY/maxresdefault.jpg)](https://youtu.be/Li9VcNrbDqY)

A privacy-first, full-stack social network built with:
- **Frontend**: React 18 + Vite + TailwindCSS + TanStack Query + Zustand
- **Backend**: Node.js + Express + Socket.IO + Passport
- **Database**: PostgreSQL
- **Real-time**: WebSockets via Socket.IO

## Features

| Feature | Status |
|---|---|
| Posts & Feed (infinite scroll) | ✅ |
| Likes & Comments (with replies) | ✅ |
| Follow / Unfollow | ✅ |
| Real-time notifications | ✅ |
| Direct Messaging (real-time) | ✅ |
| Stories (24hr expiry) | ✅ |
| Groups & Communities | ✅ |
| Media uploads (photos/videos, auto-converted to WebP) | ✅ |
| Search (users, posts, hashtags) | ✅ |
| User profiles | ✅ |
| Account deletion (with password confirmation) | ✅ |
| Email + Password auth | ✅ |
| Google OAuth | ✅ |
| JWT (15m) + Refresh tokens in HttpOnly cookies | ✅ |
| Rate limiting, Helmet, CORS | ✅ |
| Light / Dark theme | ✅ |
| Public landing page with privacy pledge | ✅ |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally

### 1. Clone & setup backend

```bash
cd backend
cp .env.example .env
# Edit .env — set your DB URL, JWT secrets, Google OAuth credentials
npm install
```

### 2. Create the database & run migrations

```bash
# Create DB in PostgreSQL
psql -U postgres -c "CREATE DATABASE social_db;"

# Run schema
npm run db:migrate
```

### 3. Start the backend

```bash
npm run dev
# Runs on http://localhost:4000
```

### 4. Setup & start the frontend

```bash
cd ../frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Docker (Production-like)

```bash
cd D:\Code\social

# 1. Configure root-level secrets (DB credentials)
cp .env.example .env
# Edit .env — set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB

# 2. Configure backend secrets
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT secrets, Google OAuth credentials

docker compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:4000 (loopback only; not exposed externally)
- PostgreSQL → internal Docker network only (no host port binding)

---

## Project Structure

```
social/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app
│   │   ├── index.js            # HTTP server + Socket.IO
│   │   ├── config/
│   │   │   ├── db.js           # PostgreSQL pool
│   │   │   ├── passport.js     # JWT + Google OAuth strategies
│   │   │   └── migrate.js      # Run schema migrations
│   │   ├── routes/             # All route files
│   │   ├── controllers/        # Business logic
│   │   ├── middleware/         # Auth, upload, validation
│   │   └── services/           # Socket.IO, notifications
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Routes
│   │   ├── pages/              # Full page components
│   │   ├── components/         # Reusable UI
│   │   ├── hooks/              # useTheme
│   │   ├── store/              # Zustand stores
│   │   └── services/           # API client, Socket.IO
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── db/
│   └── schema.sql              # Full PostgreSQL schema
├── .env.example                # Root secrets template (DB credentials)
└── docker-compose.yml
```

---

## Environment Variables

### Root `.env` (Docker only)

| Variable | Description |
|---|---|
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name |

### `backend/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for access tokens (15m expiry) |
| `JWT_REFRESH_SECRET` | Separate long random string for refresh tokens (30d expiry) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `FRONTEND_URL` | Frontend origin (for CORS; default `http://localhost:5173`) |

> Generate secrets with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

## Security Notes

- Refresh tokens are stored in **HttpOnly cookies** (not in `localStorage`) — invisible to JavaScript, safe from XSS
- Access tokens expire in **15 minutes**; refresh tokens rotate on every use
- Refresh tokens are stored as **SHA-256 hashes** in the database — never plaintext
- All passwords hashed with **bcrypt** (cost 12)
- Account deletion requires **password confirmation** and hard-deletes all user data via DB cascade

## API Reference (Key Endpoints)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Rotate refresh token (reads from cookie) |
| POST | `/api/auth/logout` | Logout (clears cookie) |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/posts/feed` | Get paginated feed |
| POST | `/api/posts` | Create post (multipart) |
| POST | `/api/likes/post/:id` | Toggle like |
| POST | `/api/follows/:userId/toggle` | Toggle follow |
| GET | `/api/messages` | List conversations |
| POST | `/api/messages/:convId` | Send message |
| GET | `/api/search?q=term` | Search users/posts/hashtags |
| PATCH | `/api/users/me` | Update profile |
| DELETE | `/api/users/me` | Delete account permanently |
