// Import functions zinazohitajika
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Hii ni muhimu kwa Database
import { getAnalytics } from "firebase/analytics";

// Hizi ndizo funguo zako (ziko sahihi)
const firebaseConfig = {
    apiKey: "AIzaSyBX_YfBobCxNfK-3GeoTocd4otiWPnRF9o",
    authDomain: "smart-kido.firebaseapp.com",
    projectId: "smart-kido",
    storageBucket: "smart-kido.firebasestorage.app",
    messagingSenderId: "246161302516",
    appId: "1:246161302516:web:c285327aa25040522b0fa1",
    measurementId: "G-DSLZ61K8EB"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize na Export Database (Hii ndio tutatumia kutunza wateja)
export const db = getFirestore(app);

// Initialize Analytics (Hii ni ya ziada)
const analytics = getAnalytics(app);