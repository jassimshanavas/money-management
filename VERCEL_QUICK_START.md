# Quick Start: Deploy to Vercel

## 🚀 Fast Deployment Steps

### 1. Push to GitHub/GitLab/Bitbucket
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Vercel will auto-detect Vite settings ✅

### 3. Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

#### Required (Firebase):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

#### Optional (Gemini AI):
```
VITE_GEMINI_API_KEY
```

### 4. Deploy!
Click **"Deploy"** and wait 1-2 minutes.

### 5. Update Firebase Auth Domains
1. Firebase Console → Authentication → Settings
2. Add your Vercel domain: `your-project.vercel.app`

## ✅ That's it! Your app is live!

Full instructions: See `DEPLOYMENT.md`

