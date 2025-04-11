import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqcRsc_mvY4ntDax1eAd4OhrRdjxkl6dQ",
  authDomain: "new-game-poker.firebaseapp.com",
  projectId: "new-game-poker",
  storageBucket: "new-game-poker.appspot.com",
  messagingSenderId: "955268474970",
  appId: "1:955268474970:web:7d24cb76c1afc686225063",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
