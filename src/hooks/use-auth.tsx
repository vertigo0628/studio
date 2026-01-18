
"use client";

import { useState, useEffect, createContext, useContext } from "react";
import {
    signInAnonymously,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    Auth
} from "firebase/auth";
import { getAuth, getDb } from "@/lib/firebase";
import { User } from "@/lib/types";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { PlaceHolderImages } from "@/lib/placeholder-images";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signInAnonymously: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateUserProfile: (name: string, avatar?: string, phone?: string, about?: string, status?: User['status'], socials?: User['socials']) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInAnonymously: async () => { },
    signInWithGoogle: async () => { },
    signOut: async () => { },
    updateUserProfile: async () => { },
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
                let appUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Anonymous User',
                    avatar: firebaseUser.photoURL || PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
                    email: firebaseUser.email || null,
                    isAnonymous: firebaseUser.isAnonymous,
                    phone: null,
                    about: null,
                    status: 'online',
                    socials: null
                };

                // Sync/Fetch user from Firestore
                const db = getDb();
                if (db) {
                    try {
                        const userRef = doc(db, 'users', appUser.id);
                        const userSnap = await getDoc(userRef);

                        if (userSnap.exists()) {
                            // Merge Firestore data into appUser using a type assertion to key access safely or just spread
                            const data = userSnap.data();
                            appUser = {
                                ...appUser,
                                ...data,
                                // Ensure critical Auth fields aren't overwritten by stale Firestore data if needed, 
                                // but usually Firestore is truth for these extra fields.
                                // We keep Auth ID/Email as source of truth for identity.
                                id: firebaseUser.uid,
                                email: firebaseUser.email || null,
                            } as User;
                        }

                        // Update last seen
                        await setDoc(userRef, {
                            ...appUser,
                            lastSeen: serverTimestamp()
                        }, { merge: true });

                    } catch (error) {
                        console.error("Error syncing user to Firestore:", error);
                    }
                }

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

    const handleUpdateUserProfile = async (name: string, avatar?: string, phone?: string, about?: string, status?: User['status'], socials?: User['socials']) => {
        const auth = getAuth();
        const db = getDb();
        if (!auth || !auth.currentUser || !user || !db) return;

        try {
            // 1. Update Firebase Auth Profile (Only supports standard fields)
            await updateProfile(auth.currentUser, {
                displayName: name,
                photoURL: avatar || user.avatar
            });

            // 2. Update Firestore User Document (Supports custom fields)
            const userRef = doc(db, 'users', user.id);
            const updates = {
                name: name,
                avatar: avatar || user.avatar,
                phone: phone || user.phone || null,
                about: about || user.about || null,
                status: status || user.status || 'online',
                socials: socials || user.socials || null,
                updatedAt: serverTimestamp()
            };

            await setDoc(userRef, updates, { merge: true });

            // 3. Update Local State
            setUser(prev => prev ? {
                ...prev,
                name,
                avatar: avatar || prev.avatar,
                phone: phone || prev.phone,
                about: about || prev.about,
                status: status || prev.status,
                socials: socials || prev.socials
            } : null);

        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signInAnonymously: handleSignInAnonymously,
            signInWithGoogle: handleSignInWithGoogle,
            signOut: handleSignOut,
            updateUserProfile: handleUpdateUserProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
}
