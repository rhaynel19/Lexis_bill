---
description: How to deploy LexisBill to Vercel
---

# Deploying to Vercel

1. **Build Locally (Optional but Recommended)**
   Ensure the project builds without errors:
   ```bash
   npm run build
   ```

2. **Login to Vercel**
   If you haven't logged in:
   ```bash
   npx vercel login
   ```

3. **Deploy**
   Run the deploy command:
   ```bash
   npx vercel --prod
   ```
   - Follow the prompts (Select scope, link to existing project or create new).
   - For `Output Directory`, default `Next.js` settings usually work (it auto-detects).

4. **Environment Variables**
   Ensure you set up your `.env.local` variables in the Vercel Dashboard under **Settings > Environment Variables**.
