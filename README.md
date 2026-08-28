# Interview AI

An AI-powered interview prep tool. Upload your resume, a job description, and a short self-description, and it generates a full interview readiness report: a match score, likely technical and behavioral questions (with the interviewer's intent and how to answer them), a skill-gap analysis, and a day-by-day preparation plan — plus an ATS-friendly resume tailored to the job, exported as a PDF.

## Features

- **AI-generated interview report** — match score, technical & behavioral questions with model answers, and skill-gap analysis, produced by Google Gemini with a strict JSON schema (via Zod) so the output is always structured and predictable.
- **Tailored resume PDF** — generates an ATS-friendly, job-specific resume as HTML and renders it to PDF with Puppeteer.
- **Resume parsing** — extracts text from an uploaded resume PDF server-side.
- **Auth** — JWT-based authentication with HTTP-only cookies and a token-blacklist collection so logout actually invalidates the token (not just deletes the cookie).
- **Report history** — past interview reports are saved per user and can be revisited.

## Tech stack

**Backend:** Node.js, Express 5, MongoDB + Mongoose, JWT + bcrypt, Multer, `pdf-parse`, Puppeteer, `@google/genai` (Gemini) with Zod → JSON Schema for structured output.

**Frontend:** React 19, React Router 7, Axios, Sass, Vite.

## Project structure

```
Backend/
  server.js                # entry point
  src/
    app.js                 # express app, middleware, error handling
    config/database.js     # mongoose connection
    routes/                # auth & interview routes
    controllers/            # request handlers
    services/ai.service.js  # Gemini prompts + PDF generation
    middlewares/            # auth guard, file upload
    models/                 # Mongoose schemas
    utils/catchAsync.js     # async error wrapper

Frontend/
  src/
    features/
      auth/                # login/register, auth context & hooks
      interview/           # report generation, history, PDF download
    app.routes.jsx
```

## Getting started

### Prerequisites
- Node.js 18+
- A MongoDB instance (local or Atlas)
- A Google Gemini API key

### Backend

```bash
cd Backend
npm install
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET, GOOGLE_GENAI_API_KEY
npm run dev
```

The API runs on `http://localhost:3000`.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and expects the backend to be running on port 3000.

## API overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/logout` | Log out (blacklists the current token) |
| GET | `/api/auth/get-me` | Get the logged-in user |
| POST | `/api/interview/` | Generate an interview report (resume PDF + job description + self description) |
| GET | `/api/interview/` | List the current user's interview reports |
| GET | `/api/interview/report/:interviewId` | Get a single report |
| POST | `/api/interview/resume/pdf/:interviewReportId` | Generate and download a tailored resume PDF |

All `/api/interview/*` routes and `GET /api/auth/get-me` require authentication via the `token` cookie set on login/register.
