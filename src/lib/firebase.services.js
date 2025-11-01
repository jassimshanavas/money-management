import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.config';

// Generic CRUD operations

/**
 * Get all documents from a collection
 */
export const getAll = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error getting ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get a single document by ID
 */
export const getById = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting ${collectionName}/${id}:`, error);
    throw error;
  }
};

/**
 * Create a new document
 */
export const create = async (collectionName, data) => {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error creating ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document
 */
export const update = async (collectionName, id, data) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { id, ...data };
  } catch (error) {
    console.error(`Error updating ${collectionName}/${id}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 */
export const remove = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { id };
  } catch (error) {
    console.error(`Error deleting ${collectionName}/${id}:`, error);
    throw error;
  }
};

/**
 * Query documents with filters
 */
export const queryDocuments = async (collectionName, filters = []) => {
  try {
    const collectionRef = collection(db, collectionName);
    let q = collectionRef;
    
    // Apply filters
    filters.forEach((filter) => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates with optional userId filter
 */
export const subscribe = (collectionName, callback, userId = null) => {
  try {
    let q = collection(db, collectionName);
    
    // If userId is provided, filter by it
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    
    // Order by date descending for most collections
    if (collectionName === 'transactions' || collectionName === 'notifications') {
      q = query(q, orderBy('date', 'desc'));
    } else if (collectionName === 'goals') {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(data);
    });
  } catch (error) {
    console.error(`Error subscribing to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get all documents for a user (one-time fetch)
 */
export const getUserDocuments = async (collectionName, userId) => {
  try {
    if (!userId) return [];
    
    let q;
    const collectionRef = collection(db, collectionName);
    
    // Build query with ordering for collections that support it
    if (collectionName === 'transactions' || collectionName === 'notifications') {
      q = query(
        collectionRef,
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
    } else if (collectionName === 'goals') {
      q = query(
        collectionRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // For other collections, just filter by userId
      q = query(
        collectionRef,
        where('userId', '==', userId)
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error getting ${collectionName} for user:`, error);
    // If orderBy fails (missing index), try without it
    if (error.code === 'failed-precondition' || error.code === 'unavailable') {
      try {
        const q = query(
          collection(db, collectionName),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (retryError) {
        console.error(`Error retrying ${collectionName}:`, retryError);
        return [];
      }
    }
    return [];
  }
};

/**
 * Batch write operations
 */
export const batchWrite = async (operations) => {
  try {
    const batch = writeBatch(db);
    
    operations.forEach((op) => {
      const docRef = doc(db, op.collection, op.id);
      
      switch (op.type) {
        case 'create':
          batch.set(docRef, { ...op.data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          break;
        case 'update':
          batch.update(docRef, { ...op.data, updatedAt: serverTimestamp() });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error batch writing:', error);
    throw error;
  }
};

