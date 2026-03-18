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

export interface Branch {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  managerName: string;
  managerPhone: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface QualityThreshold {
  id?: string;
  minFat: number;
  minSNF: number;
  minProtein: number;
  maxBacterialCount: number;
  maxTemperature: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityRecord {
  id?: string;
  entryId: string;
  userId: string;
  fat: number;
  snf: number;
  protein: number;
  bacterialCount?: number;
  temperature?: number;
  isLowQuality: boolean;
  remarks?: string;
  testedAt: Date;
  testedBy: string;
}

export const createBranch = async (branch: Omit<Branch, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'branches'), {
    ...branch,
    createdAt: new Date(),
    isActive: true,
  });
  return docRef.id;
};

export const getBranches = async (): Promise<Branch[]> => {
  const q = query(collection(db, 'branches'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Branch));
};

export const getActiveBranches = async (): Promise<Branch[]> => {
  const q = query(collection(db, 'branches'), where('isActive', '==', true), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Branch));
};

export const getBranchById = async (branchId: string): Promise<Branch | null> => {
  const docRef = doc(db, 'branches', branchId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Branch;
  }
  return null;
};

export const updateBranch = async (branchId: string, data: Partial<Branch>): Promise<void> => {
  const docRef = doc(db, 'branches', branchId);
  await updateDoc(docRef, data);
};

export const deleteBranch = async (branchId: string): Promise<void> => {
  const docRef = doc(db, 'branches', branchId);
  await deleteDoc(docRef);
};

export const createQualityThreshold = async (threshold: Omit<QualityThreshold, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'quality_thresholds'), {
    ...threshold,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  });
  return docRef.id;
};

export const getActiveQualityThreshold = async (): Promise<QualityThreshold | null> => {
  const q = query(collection(db, 'quality_thresholds'), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as QualityThreshold;
  }
  return null;
};

export const updateQualityThreshold = async (thresholdId: string, data: Partial<QualityThreshold>): Promise<void> => {
  const docRef = doc(db, 'quality_thresholds', thresholdId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date(),
  });
};

export const checkQuality = async (
  entryId: string,
  userId: string,
  fat: number,
  snf: number,
  protein: number,
  bacterialCount?: number,
  temperature?: number,
  testedBy: string
): Promise<{ isLowQuality: boolean; issues: string[] }> => {
  const threshold = await getActiveQualityThreshold();
  const issues: string[] = [];
  
  if (threshold) {
    if (fat < threshold.minFat) {
      issues.push(`Fat (${fat}%) is below minimum threshold (${threshold.minFat}%)`);
    }
    if (snf < threshold.minSNF) {
      issues.push(`SNF (${snf}%) is below minimum threshold (${threshold.minSNF}%)`);
    }
    if (protein < threshold.minProtein) {
      issues.push(`Protein (${protein}%) is below minimum threshold (${threshold.minProtein}%)`);
    }
    if (bacterialCount && bacterialCount > threshold.maxBacterialCount) {
      issues.push(`Bacterial count (${bacterialCount}) exceeds maximum (${threshold.maxBacterialCount})`);
    }
    if (temperature && temperature > threshold.maxTemperature) {
      issues.push(`Temperature (${temperature}°C) exceeds maximum (${threshold.maxTemperature}°C)`);
    }
  }
  
  const isLowQuality = issues.length > 0;
  
  const qualityRecord: Omit<QualityRecord, 'id'> = {
    entryId,
    userId,
    fat,
    snf,
    protein,
    bacterialCount,
    temperature,
    isLowQuality,
    remarks: issues.join('; '),
    testedAt: new Date(),
    testedBy,
  };
  
  await addDoc(collection(db, 'quality_records'), qualityRecord);
  
  return { isLowQuality, issues };
};

export const getQualityRecordsByFarmer = async (userId: string): Promise<QualityRecord[]> => {
  const q = query(collection(db, 'quality_records'), where('userId', '==', userId), orderBy('testedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    testedAt: doc.data().testedAt?.toDate() || new Date(),
  } as QualityRecord));
};

export const getLowQualityRecords = async (): Promise<QualityRecord[]> => {
  const q = query(collection(db, 'quality_records'), where('isLowQuality', '==', true), orderBy('testedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    testedAt: doc.data().testedAt?.toDate() || new Date(),
  } as QualityRecord));
};
