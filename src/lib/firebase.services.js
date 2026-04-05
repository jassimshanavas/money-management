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
      ...doc.data(),
      id: doc.id, // Always use Firestore doc ID, not any stored 'id' field in data
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
      return { ...docSnap.data(), id: docSnap.id }; // id last so Firestore ID wins
    }
    return null;
  } catch (error) {
    console.error(`Error getting ${collectionName}/${id}:`, error);
    throw error;
  }
};

/**
 * Create a new document
 * NOTE: Do NOT pass a temporary client-side 'id' field in data — it will be
 * stored as a Firestore field and can cause confusion. Strip it before calling.
 */
export const create = async (collectionName, data) => {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // id last: Firestore-assigned doc ID overrides any 'id' field that was in data
    return { ...data, id: docRef.id };
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
    return { ...data, id };
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
      ...doc.data(),
      id: doc.id, // Always use Firestore doc ID
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
      // NOTE: Combining where('userId') + orderBy('date') requires a composite
      // index in Firestore. To avoid that dependency, we sort client-side below.
    } else {
      // No userId filter — safe to add server-side orderBy
      if (collectionName === 'transactions' || collectionName === 'notifications') {
        q = query(q, orderBy('date', 'desc'));
      } else if (collectionName === 'goals') {
        q = query(q, orderBy('createdAt', 'desc'));
      }
    }

    return onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id, // Always use Firestore doc ID, not any stored 'id' field in data
      }));

      // Client-side sort when userId filter is applied (avoids composite index)
      if (userId) {
        if (collectionName === 'transactions' || collectionName === 'notifications') {
          data = data.sort((a, b) => {
            const da = a.date ? new Date(a.date) : new Date(0);
            const db2 = b.date ? new Date(b.date) : new Date(0);
            return db2 - da;
          });
        } else if (collectionName === 'goals') {
          data = data.sort((a, b) => {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return db2 - da;
          });
        }
      }

      callback(data);
    }, (error) => {
      console.error(`Error in onSnapshot for ${collectionName}:`, error);
      // Catch missing index errors instead of crashing the app
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
    if (collectionName === 'transactions') {
      // Prefer server-side if index exists, but we'll sort client-side regardless for consistency if it fails
      q = query(
        collectionRef,
        where('userId', '==', userId)
      );
    } else if (collectionName === 'notifications') {
      // notifications: avoid composite index — filter only, sort client-side
      q = query(
        collectionRef,
        where('userId', '==', userId)
      );
    } else if (collectionName === 'goals') {
      q = query(
        collectionRef,
        where('userId', '==', userId)
      );
    } else {
      // For other collections, just filter by userId
      q = query(
        collectionRef,
        where('userId', '==', userId)
      );
    }

    const querySnapshot = await getDocs(q);
    let data = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id, // Always use Firestore doc ID
    }));

    // Client-side sort to avoid composite index requirements
    if (collectionName === 'transactions' || collectionName === 'notifications') {
      data = data.sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0);
        const db2 = b.date ? new Date(b.date) : new Date(0);
        return db2 - da;
      });
    } else if (collectionName === 'goals') {
      data = data.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return db2 - da;
      });
    }

    return data;
  } catch (error) {
    console.error(`Error getting ${collectionName} for user:`, error);
    // Fallback search without specific ordering if not already handled
    try {
      const q = query(
        collection(db, collectionName),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
    } catch (retryError) {
      return [];
    }
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
