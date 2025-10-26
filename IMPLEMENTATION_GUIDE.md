# Implementation Guide

Complete guide for implementing the AI Game Generator Factory architecture.

## Quick Start

This guide walks you through implementing each component of the system.

## Table of Contents

1. [Project Setup](#project-setup)
2. [AI Services Integration](#ai-services-integration)
3. [Game Templates](#game-templates)
4. [Assembler Implementation](#assembler-implementation)
5. [Wizard Mode UI](#wizard-mode-ui)
6. [Testing](#testing)
7. [Deployment](#deployment)

---

## Project Setup

### Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- OpenAI API key
- Vercel account (current) or Supabase account (future)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd ai-game-generator

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

Required variables in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# OpenAI
OPENAI_API_KEY="sk-..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# OAuth
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Redis
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Optional: Supabase (for future migration)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

---

## AI Services Integration

### Visual Department (DALL-E 3)

**Location**: `app/lib/services/ai/visual-department.ts`

**Implementation Steps:**

1. **Initialize OpenAI Client**
   ```typescript
   import OpenAI from "openai";

   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   ```

2. **Create Sprite Generation Method**
   ```typescript
   async generatePlayerSprite(request: SpriteGenerationRequest) {
     const response = await openai.images.generate({
       model: "dall-e-3",
       prompt: buildPrompt(request),
       size: "1024x1024",
       quality: "standard",
     });

     return response.data[0].url;
   }
   ```

3. **Build Effective Prompts**
   ```typescript
   private buildSpritePrompt(request: SpriteGenerationRequest): string {
     return `Create a game character sprite for a ${request.theme} themed 2D game.
Description: ${request.description}
Style: ${request.style}
Requirements:
- Centered on transparent/solid background
- Clear silhouette
- Suitable for game animation
- Full body view, facing forward`;
   }
   ```

4. **Handle Rate Limiting**
   ```typescript
   // Implement retry logic with exponential backoff
   async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await sleep(Math.pow(2, i) * 1000);
       }
     }
   }
   ```

### Code Department (GPT-4)

**Location**: `app/lib/services/ai/code-department.ts`

**Implementation Steps:**

1. **Generate Game Code**
   ```typescript
   async generateGameCode(request: GameCodeRequest) {
     const response = await openai.chat.completions.create({
       model: "gpt-4o-mini",
       messages: [
         { role: "system", content: SYSTEM_PROMPT },
         { role: "user", content: buildCodePrompt(request) }
       ],
       temperature: 0.7,
       response_format: { type: "json_object" }
     });

     return JSON.parse(response.choices[0].message.content);
   }
   ```

2. **Validate Generated Code**
   ```typescript
   async validateCode(code: string): Promise<ValidationResult> {
     // Check for dangerous patterns
     const dangerous = [/eval\(/gi, /new Function\(/gi];
     const errors = dangerous
       .filter(pattern => pattern.test(code))
       .map(pattern => `Dangerous pattern: ${pattern}`);

     return { valid: errors.length === 0, errors };
   }
   ```

3. **Optimize for Cost**
   - Use `gpt-4o-mini` for most tasks (1/30th the cost of GPT-4)
   - Cache common code patterns
   - Implement request deduplication

---

## Game Templates

**Location**: `public/templates/`

### Creating a New Template

1. **Directory Structure**
   ```
   public/templates/your-template/
   ├── index.html      # Main HTML file
   ├── template.js     # Game code with placeholders
   └── README.md       # Template documentation
   ```

2. **Define Placeholders**
   - Sprites: `[PLAYER_SPRITE_PATH]`, `[BG_SPRITE_PATH]`, `[ENEMY_SPRITE_PATHS]`
   - Code: `[PLAYER_LOGIC_CODE]`, `[ENEMY_LOGIC_CODE]`, `[PHYSICS_CODE]`, `[LEVEL_CODE]`

3. **Example Template Structure**
   ```javascript
   // template.js
   const config = {
     physics: {
       default: 'arcade',
       arcade: [PHYSICS_CODE]
     }
   };

   function preload() {
     this.load.image('player', '[PLAYER_SPRITE_PATH]');
     this.load.image('background', '[BG_SPRITE_PATH]');
   }

   function create() {
     player = this.physics.add.sprite(100, 450, 'player');
     // [PLAYER_LOGIC_CODE]
   }
   ```

4. **Register Template**
   ```typescript
   // app/lib/templates.ts
   export const TEMPLATES = {
     'your-template': {
       name: 'Your Template',
       description: 'Description here',
       path: '/templates/your-template'
     }
   };
   ```

### Template Best Practices

- Keep default implementations functional
- Use descriptive placeholder names
- Include comprehensive comments
- Test template without AI content
- Provide fallback values

---

## Assembler Implementation

**Location**: `app/lib/assembler/game-assembler.ts`

### Assembly Process

1. **Load Template**
   ```typescript
   async loadTemplate(templateType: string) {
     const templateDir = path.join(this.templatePath, templateType);
     const html = await fs.readFile(path.join(templateDir, 'index.html'), 'utf-8');
     const js = await fs.readFile(path.join(templateDir, 'template.js'), 'utf-8');
     return { html, js };
   }
   ```

2. **Inject Sprites**
   ```typescript
   injectSprites(jsCode: string, sprites: SpriteSet) {
     let processed = jsCode;
     processed = processed.replace(/\[PLAYER_SPRITE_PATH\]/g, 'assets/player.png');
     processed = processed.replace(/\[BG_SPRITE_PATH\]/g, 'assets/background.png');
     return processed;
   }
   ```

3. **Inject Code**
   ```typescript
   injectCode(jsCode: string, code: GeneratedCode) {
     let processed = jsCode;
     processed = processed.replace(/\/\/ \[PLAYER_LOGIC_CODE\]/, code.playerLogic);
     processed = processed.replace(/\/\/ \[ENEMY_LOGIC_CODE\]/, code.enemyLogic);
     return processed;
   }
   ```

4. **Create Package**
   ```typescript
   async createPackage(assembled: AssembledGame): Promise<Buffer> {
     const JSZip = require('jszip');
     const zip = new JSZip();

     for (const [filename, content] of Object.entries(assembled.files)) {
       zip.file(filename, content);
     }

     return await zip.generateAsync({ type: 'nodebuffer' });
   }
   ```

### Adding ZIP Support

```bash
# Install JSZip
pnpm add jszip
pnpm add -D @types/jszip
```

Update `game-assembler.ts`:
```typescript
import JSZip from 'jszip';

async createZip(assembled: AssembledGame): Promise<Buffer> {
  const zip = new JSZip();

  for (const [filename, content] of Object.entries(assembled.files)) {
    zip.file(filename, content);
  }

  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
}
```

---

## Wizard Mode UI

**Location**: `app/components/WizardMode.tsx`

### Integration Steps

1. **Import Component**
   ```typescript
   import WizardMode from '@/components/WizardMode';
   import type { GameSpecification } from '@/components/WizardMode';
   ```

2. **Add to Page**
   ```typescript
   function GameGeneratorPage() {
     const handleWizardComplete = async (spec: GameSpecification) => {
       // Convert specification to API request
       const response = await fetch('/api/generate', {
         method: 'POST',
         body: JSON.stringify(spec)
       });
     };

     return (
       <WizardMode
         onComplete={handleWizardComplete}
         isGenerating={false}
       />
     );
   }
   ```

3. **Handle Specification**
   ```typescript
   // app/api/generate/route.ts
   export async function POST(request: Request) {
     const spec: GameSpecification = await request.json();

     // Generate sprites using Visual Department
     const sprites = await visualDepartment.generateSpriteSet({
       player: {
         description: spec.playerDescription,
         theme: spec.theme,
         style: spec.style
       },
       background: spec.theme
     });

     // Generate code using Code Department
     const code = await codeDepartment.generateCompleteGame({
       gameType: spec.gameType,
       theme: spec.theme,
       mechanics: spec.mechanics,
       difficulty: spec.difficulty,
       playerDescription: spec.playerDescription
     });

     // Assemble game
     const assembled = await gameAssembler.assemble({
       template: { type: spec.gameType, files: templateFiles },
       sprites,
       code,
       metadata: {
         gameType: spec.gameType,
         theme: spec.theme,
         author: user.email,
         difficulty: spec.difficulty,
         createdAt: new Date().toISOString()
       }
     });

     return Response.json({ success: true, assembled });
   }
   ```

---

## Testing

### Unit Tests

```typescript
// app/lib/services/ai/__tests__/visual-department.test.ts
import { describe, it, expect, vi } from 'vitest';
import { VisualDepartment } from '../visual-department';

describe('VisualDepartment', () => {
  it('generates player sprite', async () => {
    const dept = new VisualDepartment();
    const sprite = await dept.generatePlayerSprite({
      description: 'ninja robot',
      theme: 'cyberpunk',
      style: 'pixel-art'
    });

    expect(sprite.url).toBeDefined();
    expect(sprite.url).toMatch(/^https?:\/\//);
  });
});
```

### Integration Tests

```typescript
// app/api/generate/__tests__/route.test.ts
import { POST } from '../route';

describe('POST /api/generate', () => {
  it('generates a complete game', async () => {
    const request = new Request('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        gameType: 'platformer',
        theme: 'space',
        playerDescription: 'astronaut',
        difficulty: 'medium',
        style: 'cartoon',
        mechanics: []
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.jobId).toBeDefined();
  });
});
```

### E2E Tests

```typescript
// e2e/game-generation.spec.ts
import { test, expect } from '@playwright/test';

test('generate game through wizard', async ({ page }) => {
  await page.goto('/');

  // Step 1: Select game type
  await page.click('text=Platformer');

  // Step 2: Enter theme
  await page.fill('input[placeholder*="theme"]', 'Cyberpunk City');
  await page.click('text=Next');

  // ... complete wizard

  // Step N: Generate
  await page.click('text=Generate My Game');

  // Wait for generation
  await expect(page.locator('text=Download')).toBeVisible({ timeout: 60000 });
});
```

---

## Deployment

### Vercel Deployment (Current)

1. **Connect Repository**
   ```bash
   vercel link
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all required env vars

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Supabase Migration (Future)

See [MIGRATION_GUIDE.md](supabase/MIGRATION_GUIDE.md) for complete migration steps.

---

## Troubleshooting

### Common Issues

**1. OpenAI Rate Limits**
```typescript
// Solution: Implement retry with exponential backoff
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status !== 429 || i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

**2. Large Asset Files**
```typescript
// Solution: Compress images before storing
import sharp from 'sharp';

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside' })
    .webp({ quality: 80 })
    .toBuffer();
}
```

**3. Slow Generation**
```typescript
// Solution: Parallelize AI calls
const [sprites, code] = await Promise.all([
  visualDepartment.generateSpriteSet(spriteRequest),
  codeDepartment.generateGameCode(codeRequest)
]);
```

---

## Next Steps

1. ✅ Complete implementation of all AI services
2. ✅ Create all game templates
3. ✅ Implement assembler
4. ⬜ Add ZIP packaging
5. ⬜ Implement job queue for background processing
6. ⬜ Add real-time status updates
7. ⬜ Migrate to Supabase
8. ⬜ Add multiplayer game templates
9. ⬜ Implement game editor for post-generation customization

---

## Resources

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Need Help?**

- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [supabase/MIGRATION_GUIDE.md](./supabase/MIGRATION_GUIDE.md) for migration
- Open an issue on GitHub
