import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyA1d6xXDzIKyMI_t7CDGvJXbBFQdpkCIjs",
  authDomain: "village-milk-track.firebaseapp.com",
  projectId: "village-milk-track",
  storageBucket: "village-milk-track.firebasestorage.app",
  messagingSenderId: "976599747315",
  appId: "1:976599747315:web:f3a1ec27dd91ba0ae58586",
  measurementId: "G-1BB99GT9R7"
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is incomplete:', firebaseConfig);
  throw new Error('Firebase configuration is invalid. Please check your firebase config.');
}

let app;
let auth;
let db;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw error;
}

export { auth, db, analytics };
export default app;
