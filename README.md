# Notes Backend

## Prerequisites
- Node.js (v16+)
- pnpm
- MongoDB
- Clerk account

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Required environment variables:
```env
DATABASE_URL="mongodb://localhost:27017/notes"
CLERK_SECRET_KEY="your_clerk_secret_key"
GEMINI_API_KEY="your_gemini_api_key"
```

3. Initialize database:
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

4. Start development server:
```bash
pnpm dev
```

Server runs at `http://localhost:3000`

## Optional: Seed Sample Data
```bash
pnpm seed-notes your-user-id
```
