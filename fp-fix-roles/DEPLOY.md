# Deploy Friday Pictures Theatre Collection App

## Option 1: GitHub Push (Auto-deploys to Vercel)

Your Vercel project `dcr-manager` is connected to `github.com/goraghava-ui/dcr-manager`.
Pushing to `main` branch will auto-deploy.

```bash
# 1. Download the zip and extract it
unzip friday-pictures-deploy.zip -d friday-pictures
cd friday-pictures

# 2. Install dependencies
npm install

# 3. Push to your existing GitHub repo
git init
git add -A
git commit -m "Phase 5: Complete Theatre Collection App"
git branch -m main
git remote add origin https://github.com/goraghava-ui/dcr-manager.git
git push -f origin main

# Vercel will auto-deploy within 2 minutes!
```

## Option 2: Vercel CLI (Direct deploy)

```bash
cd friday-pictures
npm install
npx vercel login
npx vercel deploy --prod
```

## Environment Variables (set in Vercel dashboard)

```
VITE_SUPABASE_URL=https://tlwodgygfillyiewrcrs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...(already in .env)
VITE_SENTRY_DSN=(optional - add your Sentry DSN)
```

## Vercel Project Settings

- Framework: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

These are already configured in `vercel.json`.

## Live URLs

- Production: https://dcr-manager.vercel.app
- Preview: https://dcr-manager-goraghava-1699s-projects.vercel.app
