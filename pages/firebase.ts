
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyApQsT_zTovSfGZxRIGIcbW39uB6q0CvkY",
  authDomain: "end-dk.firebaseapp.com",
  databaseURL: "https://end-dk-default-rtdb.firebaseio.com",
  projectId: "end-dk",
  storageBucket: "end-dk.firebasestorage.app",
  messagingSenderId: "460261940940",
  appId: "1:460261940940:web:0c56f6b127ee4dbe06ec69"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
