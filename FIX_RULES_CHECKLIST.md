# ✅ FIREBASE RULES CHECKLIST - FOLLOW THESE STEPS

## ❌ Current Problem
Your app is showing "Missing or insufficient permissions" errors. This will be fixed in 5 minutes.

---

## 📋 STEP-BY-STEP (Do each step):

### ☐ Step 1: Open Firebase Console
- Go to: **https://console.firebase.google.com**
- Make sure you're logged in with your Google account

### ☐ Step 2: Select Your Project
- Find and click: **money-management-b6107**
- (It should be in your project list)

### ☐ Step 3: Open Firestore Database
- In the left sidebar, click: **"Firestore Database"**
- (It's in the "Build" section)

### ☐ Step 4: Go to Rules Tab
- At the top, click: **"Rules"** tab
- You'll see a code editor with existing rules

### ☐ Step 5: Copy the Rules
Open the file: **`FIREBASE_RULES_WORKING.txt`** in your project folder

**OR** copy this entire block:

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

### ☐ Step 6: Replace All Rules
1. **SELECT ALL** existing text in the Firebase Rules editor (Ctrl+A / Cmd+A)
2. **DELETE** it (Delete key)
3. **PASTE** the rules you just copied
4. Make sure the entire rules block is pasted correctly

### ☐ Step 7: Publish
- Click the green **"Publish"** button at the top right
- Wait for confirmation: **"Rules published successfully"**

### ☐ Step 8: Wait & Refresh
1. Wait **30-60 seconds** for rules to propagate
2. **Refresh your app** (F5 or Ctrl+R)
3. **Check browser console** - permission errors should be gone!

---

## ✅ Success Indicators

After completing the steps, you should see:
- ✅ No more "permission-denied" errors in console
- ✅ Your transactions load correctly
- ✅ Data syncs to Firestore
- ✅ App works normally

---

## ❌ Still Not Working?

1. **Double-check** you're in the correct project: `money-management-b6107`
2. **Verify** you clicked "Publish" (not just "Validate")
3. **Check** that all rules were pasted (no syntax errors)
4. **Wait** up to 2 minutes for propagation
5. **Hard refresh** your browser (Ctrl+Shift+R / Cmd+Shift+R)
6. **Check** you're logged in to the app with the same account

---

## 📸 Visual Guide Location

Your rules file location: `FIREBASE_RULES_WORKING.txt` (in your project root)

---

**Once you complete these steps, the permission errors will stop!** 🎉

