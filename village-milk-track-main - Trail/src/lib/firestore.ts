import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Query,
} from 'firebase/firestore';
import { db } from './firebase';

export const createDocument = async (
  collectionName: string,
  data: DocumentData
) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

export const createDocumentWithId = async (
  collectionName: string,
  id: string,
  data: DocumentData
) => {
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return id;
  } catch (error) {
    console.error('Error creating document with ID:', error);
    throw error;
  }
};

export const getDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

export const getDocuments = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
};

export const updateDocument = async (
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const queryDocuments = async (
  collectionName: string,
  conditions: { field: string; operator: any; value: any }[] = [],
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
  limitCount?: number
) => {
  try {
    let q: Query<DocumentData> = collection(db, collectionName);

    conditions.forEach(condition => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });

    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error querying documents:', error);
    throw error;
  }
};

export const subscribeToCollection = (
  collectionName: string,
  callback: (docs: DocumentData[]) => void,
  conditions: { field: string; operator: any; value: any }[] = []
) => {
  let q: Query<DocumentData> = collection(db, collectionName);

  conditions.forEach(condition => {
    q = query(q, where(condition.field, condition.operator, condition.value));
  });

  return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs);
  });
};
