# ⚠️ URGENT: Fix Firestore Permissions

## The Error
You're seeing `Missing or insufficient permissions` errors because Firestore security rules need to be updated in your Firebase console.

## Quick Fix (5 minutes)

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **money-management-b6107**

### Step 2: Navigate to Firestore Rules
1. Click on **"Firestore Database"** in the left sidebar
2. Click on the **"Rules"** tab at the top

### Step 3: Copy & Paste Rules
1. Copy the **entire contents** of `FIREBASE_RULES_WORKING.txt`
2. Delete all existing rules in the Firebase console
3. Paste the new rules
4. Click **"Publish"** button

### Step 4: Verify
1. Wait 10-30 seconds for rules to propagate
2. Refresh your app
3. The permission errors should disappear!

---

## Rules to Copy

Open `FIREBASE_RULES_WORKING.txt` in your project folder and copy everything from it.

Or copy this:

```
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

---

## Still Having Issues?

1. **Make sure you're logged in** to Firebase console with the correct account
2. **Check the project name** matches: `money-management-b6107`
3. **Verify rules published** - you should see "Rules published successfully" message
4. **Wait a minute** - rules can take up to 60 seconds to propagate
5. **Clear browser cache** and refresh the app

---

## What These Rules Do

- ✅ Only authenticated users can access data
- ✅ Users can only read/write their own data (where `userId` matches their `uid`)
- ✅ Prevents unauthorized access to other users' data
- ✅ Works for all collections: transactions, budgets, goals, wallets, categories, etc.

