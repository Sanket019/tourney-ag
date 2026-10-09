import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB5g-lAxOKp-aDSLdxkhhXFVyXvgx8rkUc",
  authDomain: "wow-4b1db.firebaseapp.com",
  projectId: "wow-4b1db",
  storageBucket: "wow-4b1db.firebasestorage.app",
  messagingSenderId: "258053571809",
  appId: "1:258053571809:web:4b47a9835a604e2bd9a3a0",
  measurementId: "G-6GV8YG2SDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
