# 🚨 URGENT: Fix Firestore Permissions (5 Minutes)

## The Problem
You're seeing "Missing or insufficient permissions" errors because Firestore security rules are blocking access.

## ⚡ Quick Fix Steps

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com
2. Click on your project: **money-management-b6107**

### Step 2: Go to Firestore Rules
1. In the left sidebar, click **"Firestore Database"**
2. Click the **"Rules"** tab at the top
3. You'll see current rules (probably default restrictive rules)

### Step 3: Replace Rules
**DELETE** everything in the rules editor and **PASTE** this (or copy from `FIREBASE_RULES_WORKING.txt`):

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

### Step 4: Publish
1. Click the **"Publish"** button (orange button at top)
2. Wait for "Rules published successfully" message

### Step 5: Refresh Your App
1. Go back to your app
2. Refresh the page (F5 or Ctrl+R)
3. Errors should be gone! ✅

---

## 🔍 Verify It Worked

After publishing rules:
1. Add a transaction in your app
2. Go to Firebase Console → Firestore → Data
3. You should see your data there!

---

## 🆘 Still Not Working?

### Check These:
1. **Are you logged in?** - Make sure you're signed in to the app
2. **Rules published?** - Check for "Rules published successfully"
3. **Browser cache?** - Try hard refresh (Ctrl+Shift+R)
4. **Check console** - Any other errors?

### Alternative: Test Mode (Temporary - Not Secure!)
If you want to test quickly, use these **temporary rules** (REMOVE AFTER TESTING):

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

⚠️ **WARNING:** These allow any authenticated user to access all data. Only use for testing!

---

## 📸 Visual Guide

1. **Firebase Console** → Your Project
2. **Left Sidebar** → "Firestore Database"
3. **Top Tabs** → Click "Rules"
4. **Editor** → Delete old rules, paste new rules
5. **Publish Button** → Click to save

---

**After you publish the rules, refresh your app and the errors will disappear!** 🎉

