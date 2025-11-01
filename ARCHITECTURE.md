# Money Tracker - Full-Stack Architecture

## Overview
Production-ready money tracking application with secure authentication, cloud database, and modern UI.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS, Framer Motion
- **Charts**: Recharts
- **State**: TanStack Query (React Query)
- **Auth**: JWT tokens stored in httpOnly cookies

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT with refresh tokens, bcrypt for password hashing
- **Validation**: Zod schemas

### Deployment
- **Frontend**: Vercel / Netlify
- **Backend**: Render / Railway / Fly.io
- **Database**: Neon.tech / Supabase / Railway Postgres

## Project Structure

```
money_management/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Auth routes
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/              # Protected routes
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── goals/
│   │   └── ...
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # React components
│   ├── auth/
│   ├── dashboard/
│   └── ...
├── lib/                         # Utilities
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── server/                      # Backend API
│   ├── src/
│   │   ├── routes/              # API routes
│   │   ├── middleware/          # Auth, validation
│   │   └── utils/               # Helpers
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   └── package.json
└── package.json                 # Frontend dependencies
```

## Database Schema

### Core Models
- **User**: Authentication and preferences
- **Transaction**: Income/expenses
- **Budget**: Category budgets
- **Goal**: Savings targets
- **Wallet**: Multiple accounts
- **RecurringTransaction**: Subscriptions
- **Receipt**: Uploaded receipts
- **SharedExpense**: Split bills
- **Notification**: User alerts

### Relationships
- User 1:N Transactions
- User 1:N Budgets
- User 1:N Goals
- User 1:N Wallets
- Transaction N:1 Wallet (optional)

## Authentication Flow

1. User signs up → hash password → create user → return JWT
2. User logs in → verify password → return JWT + refresh token
3. Frontend stores tokens in httpOnly cookies
4. Each API request includes JWT in Authorization header
5. Middleware verifies JWT
6. Refresh token used to get new JWT when expired

## API Endpoints

### Auth
- POST `/api/auth/signup` - Create account
- POST `/api/auth/login` - Sign in
- POST `/api/auth/refresh` - Refresh token
- POST `/api/auth/logout` - Sign out

### Transactions
- GET `/api/transactions` - List all
- POST `/api/transactions` - Create
- PUT `/api/transactions/:id` - Update
- DELETE `/api/transactions/:id` - Delete

### Budgets, Goals, Wallets, etc.
- Similar CRUD pattern as transactions

## Security Features

- JWT with secure httpOnly cookies
- bcrypt password hashing (10 rounds)
- CORS configuration
- Rate limiting
- Input validation with Zod
- SQL injection prevention (Prisma)
- XSS protection

## Performance Optimizations

- Database indexing on foreign keys and dates
- React Query caching
- Lazy loading charts
- Image optimization with Next.js
- API response caching
- Code splitting

## Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (server/.env)
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
PORT=3001
```

## Deployment Checklist

1. Set up PostgreSQL database (Neon/Supabase)
2. Run Prisma migrations
3. Deploy backend to Render/Railway
4. Update DATABASE_URL in backend env
5. Deploy frontend to Vercel
6. Update NEXT_PUBLIC_API_URL in frontend env
7. Test authentication flow
8. Configure CORS origins
9. Set up monitoring (Sentry, LogRocket)
10. Enable HTTPS

## Next Steps

1. Implement authentication routes
2. Create database migrations
3. Build API endpoints
4. Migrate React components to Next.js
5. Add Framer Motion animations
6. Set up deployment pipelines

