import { 
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
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface Payment {
  id?: string;
  userId: string;
  farmerName: string;
  farmerEmail: string;
  amount: number;
  paymentMode: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  createdByEmail: string;
  month?: string;
  year?: number;
}

export const createPayment = async (payment: Omit<Payment, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'payments'), {
    ...payment,
    createdAt: Timestamp.fromDate(payment.createdAt),
  });
  return docRef.id;
};

export const getPayments = async (): Promise<Payment[]> => {
  const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Payment));
};

export const getPaymentsByFarmer = async (userId: string): Promise<Payment[]> => {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Payment));
};

export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
  const docRef = doc(db, 'payments', paymentId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Payment;
  }
  return null;
};

export const updatePayment = async (paymentId: string, data: Partial<Payment>): Promise<void> => {
  const docRef = doc(db, 'payments', paymentId);
  await updateDoc(docRef, data);
};

export const deletePayment = async (paymentId: string): Promise<void> => {
  const docRef = doc(db, 'payments', paymentId);
  await deleteDoc(docRef);
};

export const getMonthlyPaymentSummary = async (month: string, year: number): Promise<Payment[]> => {
  const q = query(
    collection(db, 'payments'),
    where('month', '==', month),
    where('year', '==', year),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Payment));
};

export const getTotalPaymentsByFarmer = async (userId: string): Promise<number> => {
  const payments = await getPaymentsByFarmer(userId);
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
};

export const getUnpaidAmountByFarmer = async (userId: string, totalEarnings: number): Promise<number> => {
  const payments = await getPaymentsByFarmer(userId);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return totalEarnings - totalPaid;
};
