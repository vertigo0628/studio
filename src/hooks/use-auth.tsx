
"use client";

import { useState, useEffect, createContext, useContext } from "react";
import {
    signInAnonymously,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    Auth
} from "firebase/auth";
import { getAuth } from "@/lib/firebase";
import { User } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signInAnonymously: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInAnonymously: async () => { },
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Only subscribe if auth is available (client-side)
        const auth = getAuth();
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const appUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Anonymous User',
                    avatar: firebaseUser.photoURL || PlaceHolderImages[0].imageUrl,
                };
                setUser(appUser);
                setLoading(false);
            } else {
                // Auto sign-in anonymously if no user
                try {
                    await signInAnonymously(auth);
                    // onAuthStateChanged will be triggered again with the new user
                } catch (error) {
                    console.error("Error auto signing in:", error);
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const handleSignInAnonymously = async () => {
        const auth = getAuth();
        if (!auth) return;
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Error signing in anonymously:", error);
        }
    };

    const handleSignInWithGoogle = async () => {
        const auth = getAuth();
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    const handleSignOut = async () => {
        const auth = getAuth();
        if (!auth) return;
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signInAnonymously: handleSignInAnonymously,
            signInWithGoogle: handleSignInWithGoogle,
            signOut: handleSignOut
        }}>
            {children}
        </AuthContext.Provider>
    );
}
