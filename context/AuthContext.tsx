import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebaseConfig';

export type UserRole = 'admin' | 'professor' | null;

interface AuthContextType {
    user: User | null;
    userRole: UserRole;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userRole: null,
    isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let roleUnsubscribe: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setIsLoading(true);
            setUser(currentUser);

            // Clean up previous role listener if it exists
            if (roleUnsubscribe) {
                roleUnsubscribe();
                roleUnsubscribe = undefined;
            }

            if (currentUser) {
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);

                    roleUnsubscribe = onSnapshot(userDocRef, async (userDocSnap) => {
                        console.log("AuthContext: Snapshot received, exists:", userDocSnap.exists());
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            console.log("AuthContext: Role found:", userData.role);
                            setUserRole(userData.role === undefined ? null : (userData.role as UserRole));
                        } else {
                            console.log("AuthContext: User doc does not exist. Checking for root admin...");
                            // NO MORE AUTOMATIC ROLE GRANT for general users.
                            // Only the root admin can be auto-provisioned if necessary
                            if (currentUser.email === 'abelazo6969@gmail.com') {
                                console.log("AuthContext: Provisioning root admin...");
                                await setDoc(userDocRef, {
                                    email: currentUser.email,
                                    role: 'admin',
                                    createdAt: new Date().toISOString()
                                });
                            } else {
                                console.log("AuthContext: Not root admin, access denied.");
                                // If no doc exists, the user has NO permission (Access Denied)
                                setUserRole(null);
                            }
                        }
                        setIsLoading(false);
                    }, (error) => {
                        console.error("Error fetching user role snapshot:", error);
                        setUserRole(null);
                        setIsLoading(false);
                    });

                } catch (error) {
                    console.error("Error setting up user role listener:", error);
                    setUserRole(null);
                    setIsLoading(false);
                }
            } else {
                setUserRole(null);
                setIsLoading(false);
            }
        });

        return () => {
            if (roleUnsubscribe) roleUnsubscribe();
            unsubscribeAuth();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, userRole, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
