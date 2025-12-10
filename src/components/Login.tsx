import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// ============================================================================
// LOGIN COMPONENT  
// ============================================================================
// Handles user authentication with Firebase Auth.
// Supports both sign up (create new account) and sign in (existing account).
// Displays error messages for failed authentication attempts.
// ============================================================================

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    // Form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between sign in/sign up

    const auth = getAuth();

    /**
     * Handle form submission for sign in or sign up
     * @param e - Form submit event
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            if (isSignUp) {
                // Create new user account
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                // Sign in existing user
                await signInWithEmailAndPassword(auth, email, password);
            }
            onLogin();
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>🎯 Lotion</h1>
                <h2>{isSignUp ? "Create Account" : "Sign In"}</h2>

                <form onSubmit={handleSubmit}>
                    {/* Email field */}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    {/* Password field */}
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Error message display */}
                    {error && <div className="error-message">{error}</div>}

                    {/* Submit button */}
                    <button type="submit" className="submit-btn">
                        {isSignUp ? "Sign Up" : "Sign In"}
                    </button>
                </form>

                {/* Toggle between sign in and sign up */}
                <p className="toggle-mode">
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <button
                        type="button"
                        className="toggle-btn"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError("");
                        }}
                    >
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
