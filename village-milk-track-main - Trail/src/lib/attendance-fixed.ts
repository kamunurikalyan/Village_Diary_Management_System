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
  getDoc,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

export type AttendanceShift = 'morning' | 'evening';

export interface Attendance {
  id?: string;
  userId: string;
  farmerName: string;
  date: string;
  present: boolean;
  shift: AttendanceShift;
  remarks?: string;
  markedBy: string;
  markedAt: Date;
}

export const markAttendance = async (attendance: Omit<Attendance, 'id'>): Promise<string> => {
  const existingAttendance = await getAttendanceByFarmerAndDate(
    attendance.userId, 
    attendance.date,
    attendance.shift
  );
  
  if (existingAttendance) {
    await updateAttendance(existingAttendance.id!, {
      present: attendance.present,
      remarks: attendance.remarks,
      markedBy: attendance.markedBy,
      markedAt: new Date(),
    });
    return existingAttendance.id!;
  }
  
  const docRef = await addDoc(collection(db, 'attendance'), {
    ...attendance,
    markedAt: new Date(),
  });
  return docRef.id;
};

export const getAttendanceByFarmerAndDate = async (
  userId: string, 
  date: string,
  shift?: AttendanceShift
): Promise<Attendance | null> => {
  let q = query(
    collection(db, 'attendance'),
    where('userId', '==', userId),
    where('date', '==', date)
  );
  
  if (shift) {
    q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('date', '==', date),
      where('shift', '==', shift)
    );
  }
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as DocumentData;
    return {
      id: docSnap.id,
      ...data,
      markedAt: data.markedAt?.toDate() || new Date(),
    } as Attendance;
  }
  return null;
};

export const getAttendanceByDate = async (date: string, shift?: AttendanceShift): Promise<Attendance[]> => {
  let q;
  if (shift) {
    q = query(
      collection(db, 'attendance'),
      where('date', '==', date),
      where('shift', '==', shift),
      orderBy('farmerName', 'asc')
    );
  } else {
    q = query(
      collection(db, 'attendance'),
      where('date', '==', date),
      orderBy('farmerName', 'asc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as DocumentData;
    return {
      id: docSnap.id,
      ...data,
      markedAt: data.markedAt?.toDate() || new Date(),
    } as Attendance;
  });
};

export const getAttendanceByFarmer = async (userId: string): Promise<Attendance[]> => {
  const q = query(
    collection(db, 'attendance'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as DocumentData;
    return {
      id: docSnap.id,
      ...data,
      markedAt: data.markedAt?.toDate() || new Date(),
    } as Attendance;
  });
};

export const getAttendanceByFarmerAndMonth = async (
  userId: string, 
  year: number, 
  month: number
): Promise<Attendance[]> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = month === 12 
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  
  const allAttendance = await getAttendanceByFarmer(userId);
  return allAttendance.filter((a) => a.date >= startDate && a.date < endDate);
};

export const updateAttendance = async (attendanceId: string, data: Partial<Attendance>): Promise<void> => {
  const docRef = doc(db, 'attendance', attendanceId);
  await updateDoc(docRef, data);
};

export const deleteAttendance = async (attendanceId: string): Promise<void> => {
  const docRef = doc(db, 'attendance', attendanceId);
  await deleteDoc(docRef);
};

export const getAttendanceSummary = async (
  userId: string, 
  year: number, 
  month: number
): Promise<{ present: number; absent: number; total: number }> => {
  const attendance = await getAttendanceByFarmerAndMonth(userId, year, month);
  const present = attendance.filter(a => a.present).length;
  const daysInMonth = new Date(year, month, 0).getDate();
  const total = daysInMonth;
  const absent = total - present;
  
  return { present, absent, total };
};

export const bulkMarkAttendance = async (
  attendanceList: Omit<Attendance, 'id'>[]
): Promise<void> => {
  const promises = attendanceList.map(a => markAttendance(a));
  await Promise.all(promises);
};
