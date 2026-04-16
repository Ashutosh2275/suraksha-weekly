# Vercel Deployment Guide - Suraksha Weekly

## 🎯 Deployment Overview

This project deploys to **3 separate Vercel projects** in demo mode with all data mocked locally:

1. **Landing Page**: `suraksha-weekly.vercel.app` (judges entry point)
2. **Worker App**: `worker.suraksha-weekly.vercel.app` (worker portal)
3. **Admin Dashboard**: `admin.suraksha-weekly.vercel.app` (admin panel)

All sites run in **DEMO_MODE** with mocked data. No backend required for hackathon demo.

---

## 📋 Prerequisites

- Vercel account (free tier works)
- Git repository connected to Vercel
- Node.js 20+ installed locally

---

## 🚀 Quick Deploy

### Option 1: Vercel UI (Recommended for Hackathon)

#### **Project 1: Landing Page**
1. Go to Vercel Dashboard → Add New Project
2. Import your Git repository
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave as `.` (root)
   - **Build Command**: `npm run build:landing`
   - **Output Directory**: `apps/landing/out`
   - **Install Command**: `npm install`
4. Add environment variables:
   ```
   NEXT_PUBLIC_DEMO_MODE=true
   NEXT_PUBLIC_MOCK_MODE=true
   NODE_ENV=production
   ```
5. Deploy!
6. Configure custom domain: `suraksha-weekly.vercel.app`

#### **Project 2: Worker App**
1. Create a **new project** in Vercel
2. Import same repository
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave as `.` (root)
   - **Build Command**: `npm run build:worker`
   - **Output Directory**: `apps/worker/out`
   - **Install Command**: `npm install`
4. Add environment variables:
   ```
   NEXT_PUBLIC_DEMO_MODE=true
   NEXT_PUBLIC_MOCK_MODE=true
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NODE_ENV=production
   ```
5. Deploy!
6. Configure custom domain: `worker.suraksha-weekly.vercel.app`

#### **Project 3: Admin Dashboard**
1. Create a **new project** in Vercel
2. Import same repository
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave as `.` (root)
   - **Build Command**: `npm run build:admin`
   - **Output Directory**: `apps/admin/out`
   - **Install Command**: `npm install`
4. Add environment variables:
   ```
   NEXT_PUBLIC_DEMO_MODE=true
   NEXT_PUBLIC_MOCK_MODE=true
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NODE_ENV=production
   ```
5. Deploy!
6. Configure custom domain: `admin.suraksha-weekly.vercel.app`

---

### Option 2: Vercel CLI (For Quick Testing)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy Landing Page
vercel --prod --yes

# Deploy Worker App (create new project)
cd apps/worker
vercel --prod --yes

# Deploy Admin Dashboard (create new project)
cd ../admin
vercel --prod --yes
```

---

## 🛠️ Local Testing

Before deploying, test the static exports locally:

```bash
# Install dependencies
npm install

# Build all apps for production
npm run build

# Check output directories
ls -la apps/landing/out
ls -la apps/worker/out
ls -la apps/admin/out

# Test locally with a static server (optional)
npx serve apps/landing/out -p 3000
npx serve apps/worker/out -p 3001
npx serve apps/admin/out -p 3002
```

---

## 📁 Build Output

Each app generates a static export in its `out/` directory:

```
apps/
├── landing/out/          # Landing page static files
│   ├── index.html
│   ├── _next/
│   └── ...
│
├── worker/out/           # Worker app static files
│   ├── index.html
│   ├── _next/
│   └── ...
│
└── admin/out/            # Admin dashboard static files
    ├── index.html
    ├── _next/
    └── ...
```

---

## ⚙️ Configuration Files

### Next.js Config (Static Export Enabled)

Each app has `output: 'export'` configured:

**apps/landing/next.config.ts:**
```typescript
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_DEMO_MODE: 'true',
  },
};
```

**apps/worker/next.config.js:**
```javascript
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ['@suraksha/shared-types'],
  env: {
    NEXT_PUBLIC_DEMO_MODE: 'true',
    NEXT_PUBLIC_MOCK_MODE: 'true',
  },
};
```

**apps/admin/next.config.js:** (same as worker)

### Vercel Config Files

Each app has a `vercel.json` file:

**Root vercel.json** (for landing):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/landing/out",
  "env": {
    "NEXT_PUBLIC_DEMO_MODE": "true"
  }
}
```

**apps/worker/vercel.json:**
```json
{
  "buildCommand": "npm run build:worker",
  "outputDirectory": "apps/worker/out"
}
```

**apps/admin/vercel.json:** (similar structure)

---

## 🌍 Environment Variables

### Required for All Projects

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_VERSION` | `20` | Node.js version |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Enable demo mode |
| `NEXT_PUBLIC_MOCK_MODE` | `true` | Use mock data |
| `NODE_ENV` | `production` | Production build |

### Optional (Worker & Admin)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API URL (not used in demo) |

---

## 🎨 Custom Domains

After deployment, configure custom domains:

1. **Landing**: `suraksha-weekly.vercel.app`
2. **Worker**: `worker.suraksha-weekly.vercel.app`
3. **Admin**: `admin.suraksha-weekly.vercel.app`

**In Vercel UI:**
- Go to Project → Settings → Domains
- Add custom domain/subdomain
- Vercel automatically configures DNS

---

## ✅ Deployment Checklist

Before final deployment:

- [ ] All apps build successfully locally (`npm run build`)
- [ ] Static exports created (`apps/*/out` directories exist)
- [ ] Demo mode indicators visible in UI
- [ ] All mock data working (no API calls failing)
- [ ] Images load correctly (unoptimized)
- [ ] Navigation works (client-side routing)
- [ ] Environment variables set in Vercel UI
- [ ] Custom domains configured
- [ ] SSL certificates active (auto via Vercel)
- [ ] Test all 3 deployed sites work independently

---

## 🐛 Troubleshooting

### Build Fails on Vercel

**Issue**: Build command not found
**Solution**: Ensure `package.json` scripts exist at root level

**Issue**: Module not found
**Solution**: Check workspaces are configured correctly in root `package.json`

**Issue**: TypeScript errors
**Solution**: Configs already set to ignore TS errors during build

### Site Loads But Blank Page

**Issue**: Client-side routing not working
**Solution**: Vercel automatically handles SPA routing for Next.js

**Issue**: Images not loading
**Solution**: Verify `images: { unoptimized: true }` in next.config

### Demo Mode Not Working

**Issue**: No demo indicator visible
**Solution**: Check `NEXT_PUBLIC_DEMO_MODE=true` in environment variables

**Issue**: API calls failing
**Solution**: Verify mock data handlers are being used (check browser console)

---

## 📊 Build Performance

Expected build times on Vercel:

- **Landing**: ~1-2 minutes
- **Worker**: ~1-2 minutes
- **Admin**: ~1-2 minutes

Total deployment time: **~5-7 minutes** for all 3 projects

---

## 🎯 Post-Deployment

After successful deployment:

1. **Test all sites**:
   - Visit each URL
   - Check demo mode indicator appears
   - Verify all pages load
   - Test navigation

2. **Share with judges**:
   - Main entry: `https://suraksha-weekly.vercel.app`
   - Provide credentials (if needed for demo)

3. **Monitor**:
   - Check Vercel dashboard for errors
   - Review deploy logs if issues occur

---

## 🚀 Continuous Deployment

Vercel auto-deploys on git push:

1. Push to `main` branch
2. Vercel detects changes
3. Builds all 3 projects automatically
4. Deploys if builds succeed

**Disable auto-deploy** (optional):
- Vercel → Project settings → Git
- Turn off "Production Branch"

---

## 💡 Tips for Hackathon Demo

1. **Pre-deploy before presentation** - Don't deploy during demo
2. **Test on mobile** - Vercel sites work on all devices
3. **Prepare fallback** - Have local build ready if network fails
4. **Monitor logs** - Check Vercel logs before demo
5. **Cache clear** - Tell judges to hard refresh if changes don't appear

---

## 📞 Support

**Vercel Issues**: https://vercel.com/support
**Build Logs**: Vercel Dashboard → Deployments → View logs
**Status**: https://www.vercel-status.com/

---

## ✨ Success!

Once deployed, your 3 sites should be live:

✅ **Landing**: https://suraksha-weekly.vercel.app  
✅ **Worker**: https://worker.suraksha-weekly.vercel.app  
✅ **Admin**: https://admin.suraksha-weekly.vercel.app  

All running in demo mode with mocked data, no backend required! 🎉

---

**Last Updated**: April 2026  
**Version**: 1.0.0  
**Hackathon**: Guidewire DEVTrails 2026 Scale Phase
