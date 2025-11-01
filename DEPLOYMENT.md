# Deployment Guide - Vercel

This guide will help you deploy your Money Tracker app to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A Firebase project (if not already set up)
3. (Optional) A Gemini API key for AI features

## Step 1: Prepare Your Repository

1. Make sure your code is committed to a Git repository (GitHub, GitLab, or Bitbucket)
2. Push your code to the repository

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect your Vite project
5. Configure environment variables (see Step 3 below)
6. Click **"Deploy"**

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project directory:
   ```bash
   vercel
   ```

4. Follow the prompts. When asked:
   - **Set up and deploy?** → Yes
   - **Which scope?** → Select your account/team
   - **Link to existing project?** → No (for first deployment)
   - **Project name?** → Press Enter (or enter a custom name)
   - **In which directory is your code located?** → `./` (current directory)

## Step 3: Configure Environment Variables

### In Vercel Dashboard:

1. Go to your project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

#### Required: Firebase Configuration

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

#### Optional: Gemini AI Configuration

```
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. Make sure to add these for **Production**, **Preview**, and **Development** environments
5. After adding variables, **redeploy** your project for changes to take effect

### How to Get Firebase Config:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon → **Project settings**
4. Scroll to **"Your apps"** section
5. If you don't have a web app, click **"Add app"** → Web (</>) icon
6. Copy the configuration values from `firebaseConfig`

### How to Get Gemini API Key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the API key

## Step 4: Configure Firebase for Production

### Update Firebase Authentication Domains:

1. Go to Firebase Console → **Authentication** → **Settings**
2. Under **Authorized domains**, make sure your Vercel domain is added:
   - `your-project.vercel.app` (automatically added)
   - Your custom domain (if you have one)

### Update Firestore Security Rules:

Make sure your Firestore rules are configured correctly for production. Review your rules at:
- Firebase Console → **Firestore Database** → **Rules**

Example rules (adjust based on your needs):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Step 5: Test Your Deployment

1. After deployment, visit your Vercel URL
2. Test the following:
   - ✅ User sign-up/sign-in
   - ✅ Adding transactions
   - ✅ Viewing dashboard
   - ✅ Dark mode toggle
   - ✅ All features work correctly

## Step 6: Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to **Settings** → **Domains**
3. Add your custom domain
4. Follow the DNS configuration instructions
5. Update Firebase authorized domains with your custom domain

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel auto-detects, but you can specify in `package.json`)

### Environment Variables Not Working

- Make sure variable names start with `VITE_` (required for Vite)
- Redeploy after adding/changing environment variables
- Check that variables are added for the correct environment (Production/Preview/Development)

### Firebase Errors

- Verify all Firebase environment variables are set correctly
- Check Firebase authorized domains include your Vercel domain
- Review Firestore security rules
- Check Firebase console for error logs

### App Shows Blank Page

- Check browser console for errors
- Verify all environment variables are set
- Check network tab for failed API calls
- Review Vercel build logs

## Continuous Deployment

Vercel automatically deploys on every push to your main branch:
- **Production**: Deploys from `main` or `master` branch
- **Preview**: Creates preview deployments for pull requests and other branches

## Useful Commands

```bash
# Deploy to production
vercel --prod

# Preview deployment
vercel

# View deployment logs
vercel logs

# List all deployments
vercel ls
```

## Support

If you encounter issues:
1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
3. Check Firebase documentation for your specific errors

---

Happy deploying! 🚀

