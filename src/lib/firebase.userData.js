import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase.config';

/**
 * Initialize user data in Firestore when they sign up
 */
export const initializeUserData = async (userId, userData) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      email: userData.email,
      name: userData.name || userData.displayName || '',
      currency: 'USD',
      darkMode: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Initialize empty collections
    const collections = [
      'transactions',
      'budgets',
      'goals',
      'wallets',
      'recurringTransactions',
      'receipts',
      'sharedExpenses',
      'notifications',
    ];
    
    for (const collectionName of collections) {
      const collectionRef = doc(db, collectionName, `${userId}_metadata`);
      await setDoc(collectionRef, { initialized: true });
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing user data:', error);
    throw error;
  }
};

/**
 * Get user data from Firestore
 */
export const getUserData = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

/**
 * Update user data in Firestore
 */
export const updateUserData = async (userId, updates) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

