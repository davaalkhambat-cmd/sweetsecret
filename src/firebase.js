import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: 'AIzaSyCzcCHhVrIq9Q-_NEDE3xjmR_gE9hsVGKs',
    authDomain: 'sweet-secret-1e0c3.firebaseapp.com',
    projectId: 'sweet-secret-1e0c3',
    storageBucket: 'sweet-secret-1e0c3.firebasestorage.app',
    messagingSenderId: '961917941053',
    appId: '1:961917941053:web:88e6865f038b3d38060154',
    measurementId: 'G-40N15FLQEF',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const analyticsPromise = isSupported().then((supported) =>
    supported ? getAnalytics(app) : null
);
