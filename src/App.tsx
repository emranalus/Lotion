import { useState, useEffect, lazy, Suspense } from "react";
import Login from "./components/Login";
import "./index.css";

// Firebase imports
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, type User } from "firebase/auth";

// Lazy load the main app component (contains Firestore + dnd-kit)
const MainApp = lazy(() => import("./components/MainApp"));

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyB7xIsVFh7km2bIygL3PkPHuWXaARxDe4I",
  authDomain: "lotion-firebase.firebaseapp.com",
  projectId: "lotion-firebase",
  storageBucket: "lotion-firebase.firebasestorage.app",
  messagingSenderId: "929909504872",
  appId: "1:929909504872:web:7bc7f6616a3ebb7682b4dd",
  measurementId: "G-DZHVC5B4KC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------------------

  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------------------------
  // SIDE EFFECTS
  // ----------------------------------------------------------------------------

  /**
   * Monitor authentication state changes
   * Sets up a listener for when user signs in or out
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ----------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // ----------------------------------------------------------------------------

  /**
   * Sign out the current user
   */
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------

  // Show loading state while checking authentication
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <Login onLogin={() => { }} />;
  }

  // Main application UI (lazy-loaded)
  return (
    <Suspense fallback={<div className="loading">Loading app...</div>}>
      <MainApp user={user} onSignOut={handleSignOut} />
    </Suspense>
  );
}

export default App;
