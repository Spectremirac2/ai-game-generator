# Supabase Migration Guide

This guide explains how to migrate the AI Game Generator from the current Vercel-based stack to Supabase.

## Why Migrate to Supabase?

**Benefits:**
- **Unified Backend**: Single platform for database, storage, and serverless functions
- **Real-time Capabilities**: Built-in subscriptions for live job status updates
- **Cost Reduction**: Lower costs compared to Vercel Postgres + Vercel Blob + Upstash Redis
- **Better Developer Experience**: Integrated dashboard, logs, and monitoring
- **Built-in Auth**: Native authentication system
- **Row-Level Security**: Database-level authorization

## Current vs. Future Architecture

### Current (Vercel)
```
Next.js Frontend (Vercel)
  ↓
Next.js API Routes (Vercel Functions)
  ↓
Vercel Postgres (Database)
Vercel Blob (Storage)
Upstash Redis (Cache)
```

### Future (Supabase)
```
Next.js Frontend (Vercel)
  ↓
Supabase Edge Functions (Deno)
  ↓
Supabase PostgreSQL (Database)
Supabase Storage (Object Storage)
Supabase Realtime (Live Updates)
```

## Migration Steps

### Phase 1: Setup Supabase Project

1. **Create Supabase Project**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login
   supabase login

   # Link to existing project or create new
   supabase init
   supabase link --project-ref <your-project-ref>
   ```

2. **Run Database Migrations**
   ```bash
   # Apply seed data
   supabase db push

   # Or manually run seed.sql in Supabase Dashboard
   ```

3. **Create Storage Buckets**
   - Go to Supabase Dashboard → Storage
   - Buckets are created automatically via seed.sql
   - Verify policies are in place

### Phase 2: Migrate Database Schema

1. **Export Current Prisma Schema**
   ```bash
   # Generate SQL from Prisma
   npx prisma migrate diff \
     --from-schema-datamodel prisma/schema.prisma \
     --to-schema-datasource prisma/schema.prisma \
     --script > migration.sql
   ```

2. **Import to Supabase**
   ```bash
   # Run migration
   supabase db push

   # Or use Supabase Dashboard SQL Editor
   ```

3. **Update Connection String**
   ```env
   # .env.local
   DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
   ```

### Phase 3: Migrate Storage

1. **Copy Existing Assets**
   ```typescript
   // scripts/migrate-storage.ts
   import { createClient } from '@supabase/supabase-js';

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );

   async function migrateAssets() {
     // Fetch assets from Vercel Blob
     // Upload to Supabase Storage
   }
   ```

2. **Update Asset URLs**
   - Replace Vercel Blob URLs with Supabase Storage URLs
   - Update database records

### Phase 4: Deploy Edge Functions

1. **Deploy Orchestrator**
   ```bash
   # Deploy function
   supabase functions deploy orchestrator

   # Set secrets
   supabase secrets set OPENAI_API_KEY=your-key-here
   ```

2. **Deploy Assembler**
   ```bash
   supabase functions deploy assembler
   ```

3. **Test Functions**
   ```bash
   # Invoke locally
   supabase functions serve

   # Test
   curl -i --location --request POST 'http://localhost:54321/functions/v1/orchestrator' \
     --header 'Authorization: Bearer [anon-key]' \
     --header 'Content-Type: application/json' \
     --data '{"gameType":"platformer"}'
   ```

### Phase 5: Update Frontend

1. **Install Supabase Client**
   ```bash
   pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
   ```

2. **Create Supabase Client**
   ```typescript
   // lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';

   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   ```

3. **Update API Calls**
   ```typescript
   // Before (Vercel)
   const response = await fetch('/api/generate', {
     method: 'POST',
     body: JSON.stringify(data)
   });

   // After (Supabase)
   const { data, error } = await supabase.functions.invoke('orchestrator', {
     body: data
   });
   ```

4. **Add Real-time Updates**
   ```typescript
   // Subscribe to job status changes
   const subscription = supabase
     .channel('generation_jobs')
     .on('postgres_changes',
       {
         event: 'UPDATE',
         schema: 'public',
         table: 'generation_jobs',
         filter: `id=eq.${jobId}`
       },
       (payload) => {
         console.log('Job updated:', payload.new);
       }
     )
     .subscribe();
   ```

### Phase 6: Migrate Authentication

1. **Enable OAuth Providers in Supabase**
   - Go to Authentication → Providers
   - Enable GitHub and Google
   - Add OAuth credentials

2. **Update Auth Code**
   ```typescript
   // Before (NextAuth)
   import { signIn } from 'next-auth/react';

   // After (Supabase)
   import { supabase } from '@/lib/supabase';

   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'github'
   });
   ```

### Phase 7: Testing & Validation

1. **Test Checklist**
   - [ ] User authentication works
   - [ ] Game generation creates jobs
   - [ ] Assets are stored in Supabase Storage
   - [ ] Real-time updates work
   - [ ] Download URLs are signed and secure
   - [ ] Rate limiting works
   - [ ] Analytics are tracked

2. **Performance Testing**
   - Load test Edge Functions
   - Test parallel job processing
   - Verify storage access speeds

### Phase 8: Production Deployment

1. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
   ```

2. **Deploy to Vercel**
   ```bash
   # Frontend stays on Vercel
   vercel deploy --prod
   ```

3. **Monitor**
   - Check Supabase Dashboard logs
   - Monitor error rates
   - Track function invocations

## Rollback Plan

If migration fails:

1. **Keep Vercel setup intact during transition**
2. **Use feature flags to switch between backends**
3. **Maintain dual-write for critical data**
4. **Test rollback procedure before migration**

## Cost Comparison

### Current Stack (Monthly)
- Vercel Pro: $20
- Vercel Postgres: ~$10-50
- Vercel Blob: ~$5-20
- Upstash Redis: ~$10
- **Total: ~$45-100/month**

### Supabase (Monthly)
- Supabase Pro: $25
- Includes: Database, Storage, Auth, Functions
- **Total: ~$25/month**

**Savings: ~$20-75/month**

## Support & Resources

- [Supabase Docs](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Migrating from Vercel](https://supabase.com/docs/guides/migrations/vercel)
- [Community Discord](https://discord.supabase.com)

## Timeline

- **Phase 1-2**: 1 week (Setup & Database)
- **Phase 3-4**: 1 week (Storage & Functions)
- **Phase 5-6**: 1 week (Frontend & Auth)
- **Phase 7-8**: 1 week (Testing & Deployment)

**Total: ~4 weeks for complete migration**
