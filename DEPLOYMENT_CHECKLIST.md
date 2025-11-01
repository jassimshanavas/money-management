# ✅ Vercel Deployment Checklist

## Before Deployment

- [x] Code is committed to Git
- [x] Build succeeds locally (`npm run build`)
- [x] All tests pass (if any)
- [x] Environment variables documented
- [x] `vercel.json` configured
- [x] `.gitignore` excludes `.env` files

## Environment Variables to Set in Vercel

### Required (Firebase)
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_FIREBASE_MEASUREMENT_ID`

### Optional (Gemini AI)
- [ ] `VITE_GEMINI_API_KEY`

## Post-Deployment Checklist

- [ ] App loads successfully at Vercel URL
- [ ] Firebase Authentication works
- [ ] Sign up/Sign in functional
- [ ] Can add transactions
- [ ] Dashboard displays correctly
- [ ] Dark mode toggle works
- [ ] Firebase authorized domains updated
- [ ] Firestore security rules reviewed
- [ ] (Optional) Custom domain configured
- [ ] (Optional) Analytics set up

## Firebase Configuration

### Add Vercel Domain to Firebase Auth
1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `your-project.vercel.app`
3. Add custom domain if applicable

### Verify Firestore Rules
- Rules allow authenticated users only
- Users can only access their own data

## Quick Commands

```bash
# Test build locally
npm run build
npm run preview

# Deploy via CLI (if using)
vercel --prod

# Check deployment status
vercel ls
```

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Blank page | Check environment variables, browser console |
| Auth errors | Verify Firebase authorized domains |
| Build fails | Check build logs, verify dependencies |
| 404 on refresh | Verify `vercel.json` rewrites config |

---

**Ready to deploy?** Follow `VERCEL_QUICK_START.md` for step-by-step instructions!

