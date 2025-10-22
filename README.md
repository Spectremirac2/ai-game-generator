# 🎮 AI Game Generator

Generate playable 2D games from text prompts using OpenAI GPT-4 and DALL-E 3.

## Features

- 🤖 AI-powered game code generation (Phaser.js)
- 🎨 AI-generated game sprites (DALL-E 3)
- 🎮 5 game templates (Platformer, Puzzle, Shooter, Racing, Custom)
- 💾 Redis caching for cost optimization
- 🔐 GitHub/Google OAuth authentication
- 📊 Analytics dashboard
- ⚡ Background job processing
- 🔒 Sandboxed game execution

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI:** OpenAI GPT-4o-mini, DALL-E 3
- **Database:** PostgreSQL (Vercel Postgres)
- **Cache:** Redis (Upstash)
- **Auth:** NextAuth.js v5
- **ORM:** Prisma
- **Deployment:** Vercel

## Prerequisites

- Node.js 20+
- pnpm
- OpenAI API key
- Vercel account (for Postgres)
- Upstash account (for Redis)
- GitHub OAuth App
- Google OAuth credentials

## Environment Variables

See `.env.example` for required variables.

## Installation

```bash
# Clone repository
git clone <repo-url>
cd ai-game-generator

# Install dependencies
pnpm install

# Setup database
npx prisma generate
npx prisma db push

# Start development server
pnpm dev
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - TypeScript check
- `pnpm test` - Run tests
- `pnpm db:studio` - Open Prisma Studio

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

## License

MIT

## Contributing

Contributions welcome! Please open an issue first.

## Support

For issues and questions, open a GitHub issue.
