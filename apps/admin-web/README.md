# Admin Web Dashboard

Next.js 14 admin dashboard for Suraksha Weekly operations.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3001](http://localhost:3001)

## Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Features

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS (dark theme)
- Shared types from `@suraksha/shared-types`
- Admin-focused UI for operations and analytics

## API Integration

Configure `NEXT_PUBLIC_API_URL` in `.env.local` to point to the FastAPI backend.
