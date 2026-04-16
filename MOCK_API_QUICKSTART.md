# Mock API Quick Start Guide

## TL;DR - 3 Steps to Demo Mode

### Step 1: Reorganize Files (30 seconds)
```bash
# Windows
.\reorganize.bat

# Or cross-platform
python setup-mock-api.py
```

### Step 2: Build Apps (2-3 minutes)
```bash
npm run build
```

### Step 3: Deploy to Vercel (10 minutes)
```bash
# Push to GitHub, then import to Vercel
# Add environment variable: NEXT_PUBLIC_DEMO_MODE=true
```

Done! Your apps now run without any backend. 🎉

---

## What Just Happened?

✅ **Mock API created** with 19 endpoints  
✅ **3 realistic workers** with Indian context  
✅ **Full insurance workflow** (policies, claims, payouts, fraud detection)  
✅ **Smart client** that auto-detects demo mode  
✅ **Zero backend** required for demo  

## Demo Login

**Phone:** +91 98765 43210  
**OTP:** 123456  
**User:** Ravi Mehta (Mumbai, Swiggy)

## File Locations

After running `reorganize.bat`:

```
apps/worker/src/lib/api/
  ├── mock-handlers.ts   # Mock data + handlers
  └── client.ts          # Smart API client

apps/admin/src/lib/api/
  ├── mock-handlers.ts   # Mock data + handlers
  └── client.ts          # Smart API client
```

## Usage Example

```typescript
import { api } from '@/lib/api/client';

// Automatically uses mock data when NEXT_PUBLIC_DEMO_MODE=true
const policies = await api.policies.list();
const claims = await api.claims.list();
const summary = await api.dashboard.summary();
```

## Environment Variables

Add to Vercel (or `.env.production`):

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_URL=https://api.suraksha-weekly.com
NEXT_PUBLIC_WORKER_URL=https://worker.suraksha-weekly.vercel.app
NEXT_PUBLIC_ADMIN_URL=https://admin.suraksha-weekly.vercel.app
NEXT_PUBLIC_LANDING_URL=https://suraksha-weekly.vercel.app
```

## Mock Data Summary

- 3 workers (Mumbai, Bengaluru, Delhi)
- 3 policies (₹49-89 premium, ₹1,200-2,000 coverage)
- 2 triggers (Heavy Rain, Severe Pollution)
- 4 claims (PAID, IN_REVIEW, APPROVED, REJECTED)
- 3 fraud assessments (LOW, MEDIUM, CRITICAL)
- UPI payouts with Indian bank IDs

## Console Logs

Open browser DevTools → Console to see:
```
[MOCK API] GET /api/v1/dashboard/summary
[MOCK API] GET /api/v1/policies/
[MOCK API] GET /api/v1/claims/
```

All API calls are logged for debugging.

## Troubleshooting

**Build fails?**
- Run `reorganize.bat` first to move files
- Check that `NEXT_PUBLIC_DEMO_MODE=true` is set

**No data showing?**
- Check browser console for API logs
- Verify `.env.production` exists
- Ensure imports use `@/lib/api/client`

**TypeScript errors?**
- Make sure files are in `src/lib/api/` not `src/lib/`
- Run `npm install` to update dependencies

## Full Documentation

- **Complete Guide:** `docs/MOCK_API_SETUP.md`
- **Summary:** `MOCK_API_SUMMARY.md`
- **Deployment:** `DEPLOYMENT.md`
- **Vercel:** `VERCEL_SETUP.md`

## Questions?

Check the comprehensive documentation in:
- `MOCK_API_COMPLETE.md` - Full implementation details
- `docs/MOCK_API_SETUP.md` - API reference

---

**Status:** ✅ Ready to build and deploy!
