# Fix: Firebase Unauthorized Domain Error

## Problem
When deploying to Vercel, you get this error:
```
FirebaseError: Firebase: Error (auth/unauthorized-domain)
```

This happens because Firebase Authentication requires you to explicitly authorize domains for security.

## Solution: Add Vercel Domain to Firebase

### Step 1: Get Your Vercel Domain
Your Vercel domain will be one of:
- `your-project-name.vercel.app` (default)
- Custom domain (if you configured one)

You can find it in your Vercel dashboard under your project's "Domains" section.

### Step 2: Add Domain to Firebase

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your project (`money-management-b6107`)

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click the **Settings** tab (gear icon at top)
   - Scroll down to **Authorized domains**

3. **Add Your Vercel Domain**
   - Click **Add domain** button
   - Enter your Vercel domain (e.g., `your-project.vercel.app`)
   - Click **Add**
   - **No verification needed** - it's added immediately

### Step 3: Verify All Domains

Make sure these domains are authorized:
- ✅ `localhost` (for local development)
- ✅ `your-project.vercel.app` (your Vercel deployment)
- ✅ Any custom domain you're using

### Step 4: Test

1. Go to your deployed Vercel app
2. Try signing in with Google
3. It should work now! 🎉

## Common Domains to Authorize

```
localhost
your-project-name.vercel.app
www.your-custom-domain.com (if using custom domain)
your-custom-domain.com (if using custom domain)
```

## Important Notes

- **No redeploy needed** - Changes take effect immediately
- **Works for both email/password and Google sign-in**
- You can add multiple domains
- Localhost is usually added by default
- Custom domains must be added manually

## Troubleshooting

### Still getting the error?

1. **Double-check the domain** - Copy it exactly from Vercel dashboard
2. **Check for typos** - Include subdomain if applicable
3. **Wait a moment** - Sometimes takes a few seconds to propagate
4. **Clear browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
5. **Check Firebase project** - Make sure you're editing the correct project

### For Multiple Environments

If you have:
- Production: `money-tracker.vercel.app`
- Preview: `money-tracker-git-main.vercel.app`

Add **both** domains to Firebase authorized domains.

## Visual Guide

```
Firebase Console
├── Authentication
    ├── Settings
        └── Authorized domains
            ├── localhost (default)
            ├── your-project.vercel.app ← ADD THIS
            └── [Add domain button]
```

---

**That's it!** Once you add the domain, Google sign-in will work immediately.

