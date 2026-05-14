// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEcHoFK9jOpbZHgbUPFCpZSQCGsXQseYw",
  authDomain: "balaji-student-online-test.firebaseapp.com",
  projectId: "balaji-student-online-test",
  storageBucket: "balaji-student-online-test.firebasestorage.app",
  messagingSenderId: "56270849210",
  appId: "1:56270849210:web:003804a410779c06ac2e83",
  measurementId: "G-XFT5ZZGDJP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Add these exports so other files can use them
export const auth = getAuth(app);       // For login/signup
export const db = getFirestore(app);    // For storing questions/results
