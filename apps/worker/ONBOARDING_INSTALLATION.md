# ONBOARDING WIZARD - INSTALLATION INSTRUCTIONS

## Step 1: Install Dependencies

Open a terminal/command prompt in the `apps/worker-web` directory and run:

```bash
npm install zustand canvas-confetti framer-motion
npm install --save-dev @types/canvas-confetti
```

## Step 2: Create Store Directory

In the `apps/worker-web` directory, run:

```bash
node setup-onboarding.js
```

Or manually create the directory: `apps/worker-web/src/store/`

## Step 3: Create Store File

Create `apps/worker-web/src/store/onboarding.ts` with the content provided in:
- See ONBOARDING_STORE_CODE.txt (created in this directory)

## Step 4: Replace Onboarding Page

The file `apps/worker-web/src/app/(auth)/onboarding/page.tsx` has been completely replaced with the new wizard implementation.

## Step 5: Test the Wizard

```bash
cd apps/worker-web
npm run dev
```

Then navigate to: http://localhost:3000/onboarding

## What You'll Get

✓ 4-step onboarding wizard
✓ State persistence with Zustand + localStorage
✓ Smooth Framer Motion animations
✓ Auto-computing risk profile
✓ Success flow with confetti animation
✓ Full TypeScript support

## Troubleshooting

If you see "Cannot find module 'zustand'":
- Make sure you ran the npm install commands above
- Restart your dev server after installing

If animations don't work:
- Check that framer-motion installed correctly
- Clear browser cache and reload

If store doesn't persist:
- Check browser localStorage (should see 'suraksha-onboarding' key)
- Make sure you're not in incognito mode
