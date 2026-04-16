# Worker Web App

Next.js 14 frontend for gig delivery workers.

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

4. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Features

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Shared types from `@suraksha/shared-types`

## API Integration

Configure `NEXT_PUBLIC_API_URL` in `.env.local` to point to the FastAPI backend.
