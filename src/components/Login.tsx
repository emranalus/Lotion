import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { CheckSquare, AlertTriangle } from "lucide-react";

// ============================================================================
// LOGIN COMPONENT  
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
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            onLogin();
        } catch (err) {
            let message = 'Authentication failed.';
            let code = 'unknown';

            if (err instanceof Error) {
                // @ts-expect-error - Firebase errors often have a code property
                code = err.code || 'unknown';
                message = err.message;
            }

            const EMAIL_OR_PASSWORD_IS_INCORRECT = 'Email or password is incorrect.';

            switch (code) {
                case 'auth/email-already-in-use':
                    setError('This email is already registered.');
                    break;
                case 'auth/weak-password':
                    setError('Password should be at least 6 characters.');
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    setError(EMAIL_OR_PASSWORD_IS_INCORRECT);
                    break;
                case 'auth/invalid-email':
                    setError('Please enter a valid email address.');
                    break;
                default:
                    setError(message);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40 mb-4">
                        <CheckSquare className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to Lotion</h1>
                    <p className="text-neutral-500 mt-2 text-sm">
                        {isSignUp ? "Create an account to get started" : "Sign in to continue to your workspace"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="guest@example.com"
                            required
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="123456"
                            required
                            minLength={6}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-950/50 border border-red-900/50 text-red-200 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 transition-all transform active:scale-[0.98] mt-2"
                    >
                        {isSignUp ? "Create Account" : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        className="text-sm text-neutral-500 hover:text-indigo-400 transition-colors font-medium"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError("");
                        }}
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
