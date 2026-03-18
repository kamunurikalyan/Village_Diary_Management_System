import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export type CattleStatus = 'active' | 'dry' | 'sold' | 'dead';
export type CattleGender = 'male' | 'female';

export interface Cattle {
  id?: string;
  userId: string;
  tagNumber: string;
  name: string;
  breed: string;
  gender: CattleGender;
  dateOfBirth: Date;
  age: number;
  lactation: number;
  dailyMilk: number;
  lastCalvingDate?: Date;
  nextCalvingDate?: Date;
  status: CattleStatus;
  purchaseDate?: Date;
  purchasePrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createCattle = async (cattle: Omit<Cattle, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'cattle'), {
    ...cattle,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const getCattle = async (userId: string): Promise<Cattle[]> => {
  const q = query(
    collection(db, 'cattle'),
    where('userId', '==', userId),
    orderBy('tagNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dateOfBirth: doc.data().dateOfBirth?.toDate() || new Date(),
    lastCalvingDate: doc.data().lastCalvingDate?.toDate(),
    nextCalvingDate: doc.data().nextCalvingDate?.toDate(),
    purchaseDate: doc.data().purchaseDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Cattle));
};

export const getCattleById = async (cattleId: string): Promise<Cattle | null> => {
  const docRef = doc(db, 'cattle', cattleId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      dateOfBirth: docSnap.data().dateOfBirth?.toDate() || new Date(),
      lastCalvingDate: docSnap.data().lastCalvingDate?.toDate(),
      nextCalvingDate: docSnap.data().nextCalvingDate?.toDate(),
      purchaseDate: docSnap.data().purchaseDate?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    } as Cattle;
  }
  return null;
};

export const updateCattle = async (cattleId: string, data: Partial<Cattle>): Promise<void> => {
  const docRef = doc(db, 'cattle', cattleId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date(),
  });
};

export const deleteCattle = async (cattleId: string): Promise<void> => {
  const docRef = doc(db, 'cattle', cattleId);
  await deleteDoc(docRef);
};

export const getActiveCattle = async (userId: string): Promise<Cattle[]> => {
  const q = query(
    collection(db, 'cattle'),
    where('userId', '==', userId),
    where('status', '==', 'active'),
    orderBy('tagNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dateOfBirth: doc.data().dateOfBirth?.toDate() || new Date(),
    lastCalvingDate: doc.data().lastCalvingDate?.toDate(),
    nextCalvingDate: doc.data().nextCalvingDate?.toDate(),
    purchaseDate: doc.data().purchaseDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Cattle));
};

export const getTotalDailyMilk = async (userId: string): Promise<number> => {
  const cattle = await getActiveCattle(userId);
  return cattle.reduce((sum, cow) => sum + (cow.dailyMilk || 0), 0);
};

export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const predictNextCalvingDate = (lastCalvingDate: Date): Date => {
  const nextDate = new Date(lastCalvingDate);
  nextDate.setDate(nextDate.getDate() + 280);
  return nextDate;
};
