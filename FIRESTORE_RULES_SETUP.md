# 🔥 Firestore Security Rules Setup

## ⚠️ Important: Fix "Permission Denied" Error

You're seeing this error because Firestore security rules need to be configured.

```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

## 🚀 Quick Fix (5 minutes)

### Step 1: Open Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **money-management-b6107**
3. Click **Firestore Database** in the left menu

### Step 2: Go to Rules Tab
1. Click the **Rules** tab at the top
2. You'll see the current rules (probably the default restrictive rules)

### Step 3: Update Rules
Replace the existing rules with this (or copy from `FIREBASE_RULES_WORKING.txt`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to access documents where userId matches
    match /transactions/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /budgets/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /goals/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /wallets/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /recurringTransactions/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /sharedExpenses/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /receipts/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /notifications/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /categories/{documentId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid) &&
        (request.resource == null || request.resource.data.userId == request.auth.uid);
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Important:** These rules check both `resource` (existing document) and `request.resource` (new/updated document) to handle both reads and writes correctly.

### Step 4: Publish Rules
1. Click **Publish** button
2. Wait for confirmation

### Step 5: Test
1. Refresh your app
2. Sign up/sign in
3. The permission error should be gone!

## 🔒 What These Rules Do

- ✅ Users can only read/write their own data
- ✅ All operations require authentication
- ✅ User ID must match document owner
- ✅ Secure and production-ready

## ⚠️ Development Mode (Temporary)

If you want to test quickly, you can temporarily use these **less secure rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING:** These rules allow any authenticated user to access all data. Only use for testing!

## ✅ After Setup

Your app will:
- ✅ Allow users to save transactions
- ✅ Sync data across devices
- ✅ Secure user data
- ✅ No more permission errors!

## 📚 More Info

- [Firestore Security Rules Docs](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules Playground](https://console.firebase.google.com/project/_/firestore/rules) - Test your rules

---

**After setting up rules, refresh your app and try again!** 🚀

