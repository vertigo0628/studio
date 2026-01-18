
"use client";

import { useState, useEffect, createContext, useContext } from "react";
import {
    signInAnonymously,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    Auth
} from "firebase/auth";
import { auth } from "@/lib/firebase";
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
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const appUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Anonymous User',
                    avatar: firebaseUser.photoURL || PlaceHolderImages[0].imageUrl,
                };
                setUser(appUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSignInAnonymously = async () => {
        if (!auth) return;
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Error signing in anonymously:", error);
        }
    };

    const handleSignInWithGoogle = async () => {
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    const handleSignOut = async () => {
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
