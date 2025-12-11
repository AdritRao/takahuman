# Notes App

## Stack
- Backend: Node.js, Express, TypeScript, Prisma (SQLite), JWT, bcrypt, Zod, Jest + Supertest
- Frontend: Next.js (App Router, TypeScript), Tailwind CSS, Axios, Jest + React Testing Library

## Repo Structure
```
backend/   # REST API, Prisma schema, backend tests
frontend/  # Next.js app, components, frontend tests
```

## Prerequisites
- Node.js 18 or newer

## Backend: Setup & Run
1) Install and configure:
```
cd backend
npm install
```
Create a `.env` file in `backend/`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace_me"
```

2) Generate Prisma client & apply migrations:
```
npm run db:generate
npm run db:migrate
```

3) Start the API:
```
npm run dev
```
Backend runs on http://localhost:4000

4) Tests:
```
npm test
```

5) Monitor the database (Prisma Studio):
```
cd /Users/adritrao/Documents/takahuman/backend
npx prisma studio
```
Open http://localhost:5555 to browse `User` and `Note`.

## Frontend: Setup & Run
1) Install and configure:
```
cd frontend
npm install
```
Create `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

2) Start the app:
```
npm run dev
```
Frontend runs on http://localhost:3000

3) Tests:
```
npm test
```

4) Production build (optional):
```
npm run build
npm start
```

## API structure
- POST `/auth/signup` { email, password } → { token, user }
- POST `/auth/login` { email, password } → { token, user }
- GET `/notes` → { notes }  (Authorization: Bearer <token>)
- POST `/notes` { title, content } → { note }  (auth)
- PUT `/notes/:id` { title?, content? } → { note }  (auth)
- DELETE `/notes/:id` → { success: true }  (auth)

## key backend files
  - `backend/src/index.ts` — starts the server
  - `backend/src/app.ts` — express app, middleware, routes
  - `backend/src/routes/auth.ts` — signup/login with bcrypt + JWT
  - `backend/src/routes/notes.ts` — notes CRUD
  - `backend/src/middleware/auth.ts` — JWT verification middleware
  - `backend/src/validation/schemas.ts` — Zod request validation
  - `backend/prisma/schema.prisma` — Prisma models (`User`, `Note`)
  - `backend/tests/*.test.ts` — Jest + Supertest integration tests

notes:
- JWT is stored in `localStorage`. Axios attaches it to requests automatically.
- If you change ports, update the frontend `NEXT_PUBLIC_API_BASE_URL` and backend CORS origin.


