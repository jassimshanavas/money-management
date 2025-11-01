# 🔥 Firebase Quick Start

Get Firebase running in 5 minutes!

## ⚡ Quick Setup

### 1. Firebase Console Setup (3 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Create Project**: Click "Add project" → Name: `money-tracker`
3. **Enable Auth**: Authentication → Get started → Email/Password → Enable → Save
4. **Create Database**: Firestore Database → Create database → Start in production mode → Choose location
5. **Get Config**: Project Settings (⚙️) → Your apps → Add web app → Copy config

### 2. Firestore Security Rules (1 min)

In Firestore Console → Rules tab, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

Click **Publish**.

### 3. Environment Variables (1 min)

Create `.env` file in project root:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=money-tracker.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=money-tracker
VITE_FIREBASE_STORAGE_BUCKET=money-tracker.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 4. Test It! (30 sec)

```bash
npm run dev
```

The app now syncs with Firebase! 🎉

## 🎯 What You Got

✅ **Authentication**: Sign up/sign in with email  
✅ **Cloud Database**: All data synced  
✅ **Real-time Updates**: Changes sync instantly  
✅ **Multi-Device**: Access from anywhere  
✅ **Secure**: Only you see your data  

## 🚧 Still Using LocalStorage?

The current app works perfectly with localStorage! Firebase is optional.

To enable Firebase:
1. Complete setup above
2. Optionally switch to `AppContextFirebase.jsx`

## 📚 Need Help?

Check `FIREBASE_SETUP.md` for detailed instructions.

---

**That's it!** Your data is now in the cloud! ☁️

