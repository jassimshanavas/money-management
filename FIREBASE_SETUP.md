# 🔥 Firebase Setup Guide

Complete guide to set up Firebase for the Money Tracker app.

## 📋 Prerequisites

1. A Firebase account (free tier is sufficient)
2. Node.js and npm installed
3. Git

## 🚀 Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `money-tracker`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"
4. (Optional) Enable **Google** sign-in:
   - Click on "Google"
   - Toggle "Enable" to ON
   - Add support email
   - Click "Save"

### 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Start in **production mode** (we'll add rules next)
4. Choose a location closest to your users
5. Click "Enable"

### 4. Configure Firestore Security Rules

1. In Firestore, go to **Rules** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /transactions/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    match /budgets/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    match /goals/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    match /wallets/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    match /recurringTransactions/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    match /receipts/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    match /sharedExpenses/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    match /notifications/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

3. Click "Publish"

### 5. Create Storage Bucket (Optional)

1. Go to **Storage**
2. Click "Get started"
3. Start in production mode
4. Use existing Firestore rules
5. Click "Done"

### 6. Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click on web icon `</>` to add web app
4. Register app with nickname "Money Tracker Web"
5. Copy the Firebase config object

### 7. Configure Environment Variables

1. Create `.env` file in project root:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

2. Update `src/lib/firebase.config.js` with your values

### 8. Install Firebase SDK

The Firebase package is already installed. If not:

```bash
npm install firebase
```

## 📊 Firestore Collections Structure

Your Firestore database will have these collections:

```
users/
  {userId}/
    email, name, currency, darkMode, createdAt, updatedAt

transactions/
  {transactionId}/
    userId, type, category, amount, description, date, createdAt

budgets/
  {budgetId}/
    userId, category, amount, createdAt

goals/
  {goalId}/
    userId, name, targetAmount, targetDate, category, achieved, notified

wallets/
  {walletId}/
    userId, name, color, icon, balance

recurringTransactions/
  {recurringId}/
    userId, description, category, amount, frequency, nextDue, reminder

receipts/
  {receiptId}/
    userId, file, merchant, total, category, uploadedAt

sharedExpenses/
  {sharedExpenseId}/
    userId, description, totalAmount, category, date, participants

notifications/
  {notificationId}/
    userId, type, title, message, read, createdAt
```

## 🔐 Authentication Flow

1. User signs up → `signUp(email, password, name)`
2. User data initialized in Firestore
3. User signs in → `signIn(email, password)`
4. Auth state persists across sessions
5. All API calls include user ID for security

## 🧪 Testing Your Setup

1. Start the app:
   ```bash
   npm run dev
   ```

2. Try signing up with email/password
3. Check Firebase Console → Authentication → Users
4. Check Firestore → Data to see your collections

## 🚨 Troubleshooting

### Error: Firebase app not initialized
- Check your `.env` file has all values
- Restart the dev server after changing `.env`

### Error: Permission denied
- Check Firestore security rules
- Make sure user is authenticated

### Error: Firebase config missing
- Verify environment variables are prefixed with `VITE_`
- Check `firebase.config.js` has fallback values

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## ✅ Next Steps

After Firebase is set up, the app will:
- Sync data across devices
- Store user data securely
- Enable real-time updates
- Support offline mode (coming soon)

---

**Need help?** Check the Firebase Console for errors and debug info!

