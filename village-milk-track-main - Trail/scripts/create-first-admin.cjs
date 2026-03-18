/**
 * Script to create the first admin account in Firebase
 * 
 * Usage:
 * 1. Make sure Firebase is properly configured in src/lib/firebase.ts
 * 2. Run this script from the project root: node scripts/create-first-admin.js
 * 3. Enter the admin details when prompted
 */

const readline = require('readline');

// Import Firebase config from the project
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration from src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyA1d6xXDzIKyMI_t7CDGvJXbBFQdpkCIjs",
  authDomain: "village-milk-track.firebaseapp.com",
  projectId: "village-milk-track",
  storageBucket: "village-milk-track.firebasestorage.app",
  messagingSenderId: "976599747315",
  appId: "1:976599747315:web:f3a1ec27dd91ba0ae58586",
  measurementId: "G-1BB99GT9R7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(prompt, resolve);
});

async function createFirstAdmin() {
  console.log('\n=== Create First Admin Account ===\n');
  console.log('This script will create the first admin account in Firebase.\n');
  console.log('Project:', firebaseConfig.projectId);
  console.log('');

  const email = await question('Enter admin email: ');
  const password = await question('Enter admin password (min 6 characters): ');
  const name = await question('Enter admin name: ');

  if (!email || !password || !name) {
    console.log('\nError: All fields are required.');
    rl.close();
    return;
  }

  if (password.length < 6) {
    console.log('\nError: Password must be at least 6 characters.');
    rl.close();
    return;
  }

  try {
    console.log('\nCreating admin account...');
    
    // Import Firebase Auth dynamically
    const { createUserWithEmailAndPassword } = require('firebase/auth');
    const { updateProfile } = require('firebase/auth');
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('User created successfully!');

    // Update display name
    if (name) {
      await updateProfile(user, { displayName: name });
    }

    // Create user document in Firestore with admin role
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      displayName: name,
      role: 'admin',
      uid: user.uid,
      createdAt: new Date(),
      createdBy: 'initial-setup'
    });

    console.log('\nAdmin account created successfully!');
    console.log('   Email:', email);
    console.log('   Name:', name);
    console.log('   UID:', user.uid);
    console.log('\nYou can now log in to the admin dashboard at /admin');

  } catch (error) {
    console.log('\nError creating admin:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('The email address is already registered.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('The email address is invalid.');
    } else if (error.code === 'auth/weak-password') {
      console.log('The password is too weak.');
    }
  }

  rl.close();
}

createFirstAdmin();
