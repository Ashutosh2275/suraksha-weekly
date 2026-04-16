# Vercel Deploy - Quick Reference

## 🚀 One-Command Deploy Test

```bash
# Clean and build all apps
npm run clean:builds && npm run build

# Verify outputs
ls -la apps/landing/out apps/worker/out apps/admin/out
```

## 📋 Pre-Deployment Checklist

### Build Verification
- [ ] `npm install` completes successfully
- [ ] `npm run build:landing` succeeds
- [ ] `npm run build:worker` succeeds  
- [ ] `npm run build:admin` succeeds
- [ ] `apps/landing/out/index.html` exists
- [ ] `apps/worker/out/index.html` exists
- [ ] `apps/admin/out/index.html` exists

### Configuration Check
- [ ] `apps/landing/next.config.ts` has `output: 'export'`
- [ ] `apps/worker/next.config.js` has `output: 'export'`
- [ ] `apps/admin/next.config.js` has `output: 'export'`
- [ ] All configs have `images: { unoptimized: true }`
- [ ] All configs have `NEXT_PUBLIC_DEMO_MODE=true`

### Vercel Setup
- [ ] Root `vercel.json` created (landing)
- [ ] `apps/worker/vercel.json` created
- [ ] `apps/admin/vercel.json` created
- [ ] All vercel.json files have correct paths
- [ ] Environment variables documented

### Demo Mode
- [ ] `.env.production` files created for all apps
- [ ] Demo mode indicators working locally
- [ ] Mock data files created
- [ ] No real API calls in demo mode

## 🌐 Vercel Projects Setup

### Project 1: Landing Page
**Name**: suraksha-weekly  
**Domain**: suraksha-weekly.vercel.app  
**Build**: `npm run build:landing`  
**Output**: `apps/landing/out`  

### Project 2: Worker App
**Name**: suraksha-worker  
**Domain**: worker.suraksha-weekly.vercel.app  
**Build**: `npm run build:worker`  
**Output**: `apps/worker/out`  

### Project 3: Admin Dashboard
**Name**: suraksha-admin  
**Domain**: admin.suraksha-weekly.vercel.app  
**Build**: `npm run build:admin`  
**Output**: `apps/admin/out`  

## ⚡ Quick Commands

```bash
# Test builds locally
npm run build

# Clean and rebuild
npm run clean:builds && npm run build

# Build individual apps
npm run build:landing
npm run build:worker
npm run build:admin

# Test with local server
npx serve apps/landing/out -p 3000
npx serve apps/worker/out -p 3001
npx serve apps/admin/out -p 3002
```

## 🔧 Environment Variables (Copy to Vercel)

### All Projects
```
NODE_VERSION=20
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_MOCK_MODE=true
NODE_ENV=production
```

### Worker & Admin Only (additional)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## ✅ Post-Deploy Test

After each project deploys:

1. **Visit URL** - Check site loads
2. **Demo indicator** - Should show at top/bottom
3. **Navigation** - Test all menu items
4. **Data display** - Should show mock data
5. **Console** - Check for errors (F12)
6. **Mobile** - Test responsive design

## 🎯 Judge Demo URLs

Share these with hackathon judges:

**Main Entry**: https://suraksha-weekly.vercel.app  
**Worker Portal**: https://worker.suraksha-weekly.vercel.app  
**Admin Dashboard**: https://admin.suraksha-weekly.vercel.app  

## 🐛 Common Issues

**Build fails**: Check build logs in Vercel dashboard  
**Blank page**: Check browser console for errors  
**404 on refresh**: Vercel auto-handles SPA routing for Next.js  
**Images broken**: Confirm `unoptimized: true` in config  
**No demo mode**: Check environment variables set  

## 📱 Test Matrix

| Device | Landing | Worker | Admin |
|--------|---------|--------|-------|
| Desktop | ✅ | ✅ | ✅ |
| Mobile | ✅ | ✅ | ✅ |
| Tablet | ✅ | ✅ | ✅ |

## ⏱️ Timeline

- **Build**: ~1-2 min per project
- **DNS**: Instant (Vercel domains)
- **SSL**: Auto-enabled
- **Total**: ~5-7 minutes all projects

## 🎉 Success Criteria

✅ All 3 projects deployed  
✅ All sites load without errors  
✅ Demo mode active on all sites  
✅ Custom domains configured  
✅ SSL certificates active  
✅ No backend dependencies  
✅ Ready for judges!