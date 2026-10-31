// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: "AIzaSyDDKPYsEQRmwu7ID4eNY0ZXWzaGMkiKBB4",
	authDomain: "ciji-alum.firebaseapp.com",
	databaseURL: "https://ciji-alum-default-rtdb.firebaseio.com",
	projectId: "ciji-alum",
	storageBucket: "ciji-alum.firebasestorage.app",
	messagingSenderId: "910935603363",
	appId: "1:910935603363:web:640af2c5fd9f228579a716",
	measurementId: "G-FH53D2Z6Z3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);