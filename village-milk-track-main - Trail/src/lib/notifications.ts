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
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 
  | 'rate_change' 
  | 'payment' 
  | 'new_entry' 
  | 'low_quality' 
  | 'system'
  | 'attendance';

export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
  link?: string;
}

export const createNotification = async (notification: Omit<Notification, 'id' | 'read'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notifications'), {
    ...notification,
    read: false,
    createdAt: Timestamp.fromDate(notification.createdAt),
  });
  return docRef.id;
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Notification));
};

export const getUnreadNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  } as Notification));
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const notifications = await getUnreadNotifications(userId);
  return notifications.length;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const notifications = await getUnreadNotifications(userId);
  const promises = notifications.map(notification => 
    markNotificationAsRead(notification.id!)
  );
  await Promise.all(promises);
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  const docRef = doc(db, 'notifications', notificationId);
  await deleteDoc(docRef);
};

export const subscribeToNotifications = (
  userId: string, 
  callback: (notifications: Notification[]) => void
) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Notification));
    callback(notifications);
  });
};

export const createRateChangeNotification = async (
  userId: string,
  oldRate: number,
  newRate: number
) => {
  await createNotification({
    userId,
    type: 'rate_change',
    title: 'Milk Rate Updated',
    message: `Milk rate has been updated from ₹${oldRate}/L to ₹${newRate}/L`,
    createdAt: new Date(),
    link: '/farmer',
  });
};

export const createPaymentNotification = async (
  userId: string,
  amount: number,
  paymentMode: string
) => {
  await createNotification({
    userId,
    type: 'payment',
    title: 'Payment Received',
    message: `A payment of ₹${amount} has been made via ${paymentMode}`,
    createdAt: new Date(),
    link: '/farmer/payments',
  });
};

export const createLowQualityAlert = async (
  userId: string,
  fat: number,
  snf: number
) => {
  await createNotification({
    userId,
    type: 'low_quality',
    title: 'Low Quality Alert',
    message: `Your milk quality was below threshold. Fat: ${fat}%, SNF: ${snf}%`,
    createdAt: new Date(),
  });
};
