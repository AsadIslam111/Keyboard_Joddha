// Firebase Configuration - Using compat version for better browser support
// This version works without requiring a local server

// Load Firebase via compat scripts (added to window automatically)
const firebaseConfig = {
    apiKey: "AIzaSyCFqsO_vfvwcpydMQ6T-30FaA6SH8bFIIU",
    authDomain: "keyboard-joddha.firebaseapp.com",
    projectId: "keyboard-joddha",
    storageBucket: "keyboard-joddha.firebasestorage.app",
    messagingSenderId: "579463165370",
    appId: "1:579463165370:web:aa29993ca5dcb4c0d35983",
    measurementId: "G-4VESVRVPL6",
    databaseURL: "https://keyboard-joddha-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Wait for Firebase compat scripts to load, then initialize
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.log("Waiting for Firebase SDK...");
        setTimeout(initFirebase, 50);
        return;
    }

    console.log("Firebase SDK loaded, initializing...");

    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase app initialized");

        // Get Auth
        const auth = firebase.auth();
        const googleProvider = new firebase.auth.GoogleAuthProvider();

        // Get Realtime Database
        const db = firebase.database();

        // Get Firestore
        const firestore = firebase.firestore();

        // Expose Auth to window
        window.auth = auth;
        window.googleProvider = googleProvider;
        window.signInWithPopup = (auth, provider) => auth.signInWithPopup(provider);
        window.signOut = (auth) => auth.signOut();
        window.onAuthStateChanged = (auth, callback) => auth.onAuthStateChanged(callback);

        // Expose Realtime Database to window
        window.db = db;
        window.ref = (db, path) => db.ref(path);
        window.set = (ref, data) => ref.set(data);
        window.get = (ref) => ref.get();
        window.push = (ref) => ref.push();
        window.onValue = (ref, callback) => ref.on('value', callback);
        window.update = (ref, data) => ref.update(data);
        window.remove = (ref) => ref.remove();
        window.child = (ref, path) => ref.child(path);
        window.serverTimestamp = () => firebase.database.ServerValue.TIMESTAMP;

        // Expose Firestore to window
        window.firestore = firestore;
        window.collection = (db, path) => db.collection(path);
        window.doc = (db, path) => db.doc(path);
        window.setDoc = (ref, data) => ref.set(data);
        window.getDoc = (ref) => ref.get();
        window.addDoc = (collectionRef, data) => collectionRef.add(data);

        console.log("Firebase fully initialized and exposed to window");

        // Dispatch event to notify other scripts
        window.dispatchEvent(new Event('firebase-ready'));

    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

// Start initialization
initFirebase();
