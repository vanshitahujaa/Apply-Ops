# ApplyOps

Job Application Automation & Optimization Platform - One place to auto-track applications, generate tailored resumes, create cover letters, and analyze your job search performance.

## Features

- **Email-Based Auto Tracking**: Connect Gmail to automatically track job applications
- **Smart Dashboard**: View all applications, status timeline, and interview dates
- **Resume Tailoring Engine**: Score ATS match and get optimization suggestions
- **Cover Letter Generator**: Generate personalized cover letters with tone selection
- **Performance Analytics**: Track response rates, interview rates, and platform performance

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, ShadCN UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT + Google OAuth

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### 1. Start Database

```bash
docker-compose up -d
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Prisma Studio: `cd backend && npx prisma studio`

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/applyops"
JWT_SECRET="your-secret-key"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
OPENAI_API_KEY=""
```

## Project Structure

```
applyops/
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Route pages
│   │   ├── services/   # API services
│   │   └── store/      # Zustand state
│   └── ...
├── backend/            # Node.js + Express API
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── middleware/ # Express middleware
│   │   └── services/   # Business logic
│   └── prisma/         # Database schema
└── docker-compose.yml  # PostgreSQL setup
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth

### Applications
- `GET /api/applications` - List all
- `POST /api/applications` - Create
- `PATCH /api/applications/:id` - Update
- `DELETE /api/applications/:id` - Delete

### Resumes
- `POST /api/resumes/upload` - Upload PDF
- `POST /api/resumes/analyze` - Analyze against JD

### Cover Letters
- `POST /api/cover-letters/generate` - Generate

### Analytics
- `GET /api/analytics/overview` - Dashboard stats

## License

MIT
# Apply-Ops
