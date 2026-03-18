import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getDocument, createDocumentWithId, updateDocument } from '../lib/firestore';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string, role?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  updateUserRole: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log('Fetching user document for UID:', firebaseUser.uid);
          let userDoc = await getDocument('users', firebaseUser.uid);
          
          if (!userDoc) {
            console.log('No document found, creating one with UID as ID...');
            await createDocumentWithId('users', firebaseUser.uid, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'User',
              role: 'farmer',
            });
            userDoc = await getDocument('users', firebaseUser.uid);
          }
          
          console.log('User document fetched:', userDoc);
          
          if (userDoc) {
            const role = (userDoc as { role?: string })?.role;
            console.log('User role from Firestore:', role);
            setUserRole(role || 'farmer');
          } else {
            console.log('Still no document, defaulting to farmer');
            setUserRole('farmer');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('farmer');
        }
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if farmer is approved (only block if explicitly marked as not approved)
      const userDoc = await getDocument('users', userCredential.user.uid);
      if (userDoc && userDoc.role === 'farmer' && userDoc.isApproved === false) {
        // Sign out unapproved farmers
        await signOut(auth);
        
        // Check if rejected or pending
        if (userDoc.status === 'rejected') {
          throw new Error('Your account has been rejected by admin. Please contact support.');
        } else {
          throw new Error('Your account is pending approval by admin. Please wait for approval.');
        }
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      return userCredential.user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    try {
      if (user) {
        await updateProfile(user, updates);
        setUser({ ...user, ...updates });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updateUserRole = async (role: string) => {
    try {
      if (user) {
        await updateDocument('users', user.uid, { role });
        setUserRole(role);
        console.log('User role updated to:', role);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    loading,
    signIn,
    signUp,
    logout,
    updateUserProfile,
    updateUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
