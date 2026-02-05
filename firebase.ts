
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

/**
 * تهيئة Firestore مع تحسينات الاتصال:
 * 1. تفعيل experimentalForceLongPolling لحل مشكلة الـ 10 ثواني timeout في الشبكات الضعيفة أو المقيدة.
 * 2. تفعيل التخزين المحلي المتعدد التبويبات لضمان عمل النظام بدون إنترنت بشكل كامل.
 */
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ 
    tabManager: persistentMultipleTabManager() 
  }),
  experimentalForceLongPolling: true // حل جذري لمشكلة "Could not reach Cloud Firestore backend"
});

const auth = getAuth(app);

export { db, auth };
