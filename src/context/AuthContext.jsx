import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
    browserPopupRedirectResolver,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    getAdditionalUserInfo,
    onAuthStateChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { collection, doc, onSnapshot, serverTimestamp, setDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { isStaffRole, roleHasPermission, getRoleInfo, STAFF_ROLES, DEFAULT_ROLES } from '../config/roles';

const AuthContext = createContext(null);

const AUTH_ERROR_MESSAGES = {
    'auth/invalid-email': 'И-мэйл хаягийн формат буруу байна.',
    'auth/missing-password': 'Нууц үгээ оруулна уу.',
    'auth/weak-password': 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.',
    'auth/user-not-found': 'Энэ и-мэйлээр бүртгэл олдсонгүй.',
    'auth/wrong-password': 'Нууц үг буруу байна.',
    'auth/invalid-credential': 'И-мэйл эсвэл нууц үг буруу байна.',
    'auth/email-already-in-use': 'Энэ и-мэйл аль хэдийн ашиглагдсан байна.',
    'auth/operation-not-allowed': 'Authentication provider идэвхжээгүй байна.',
    'auth/unauthorized-domain': 'Одоогийн домэйн Firebase Auth-д зөвшөөрөгдөөгүй байна.',
    'auth/popup-blocked': 'Popup цонх browser дээр блоклогдсон байна.',
    'auth/popup-closed-by-user': 'Нэвтрэх цонхыг хаасан байна.',
    'auth/cancelled-popup-request': 'Google нэвтрэх хүсэлт цуцлагдсан.',
    'auth/invalid-api-key': 'Firebase API key буруу эсвэл хүчинтэй биш байна.',
    'auth/app-not-authorized': 'Энэ апп Firebase төслөөс зөвшөөрөгдөөгүй байна.',
    'auth/network-request-failed': 'Сүлжээний алдаа гарлаа. Дахин оролдоно уу.',
    'permission-denied': 'Firestore rules зөвшөөрөхгүй байна. users/{uid} write эрхийг шалгана уу.',
};

const getAuthMessage = (error) => {
    if (!error?.code) return 'Алдаа гарлаа. Дахин оролдоно уу.';
    const baseMessage = AUTH_ERROR_MESSAGES[error.code] || 'Нэвтрэх үед алдаа гарлаа.';
    return `${baseMessage} (${error.code})`;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [roles, setRoles] = useState(DEFAULT_ROLES);

    const syncUserProfile = async (firebaseUser, options = {}) => {
        if (!firebaseUser?.uid) return;

        const fallbackName = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Хэрэглэгч';
        const userRef = doc(db, 'users', firebaseUser.uid);

        // Check if UID doc already exists
        const userSnap = await getDoc(userRef);
        let existingData = userSnap.exists() ? userSnap.data() : null;

        // If no UID doc, try finding by email (pre-assigned roles)
        if (!existingData && firebaseUser.email) {
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
                // Take the first one found by email
                existingData = querySnap.docs[0].data();
            }
        }

        const payload = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || existingData?.displayName || fallbackName,
            photoURL: firebaseUser.photoURL || existingData?.photoURL || '',
            phoneNumber: firebaseUser.phoneNumber || existingData?.phoneNumber || '',
            providerIds: (firebaseUser.providerData || [])
                .map((provider) => provider?.providerId)
                .filter(Boolean),
            updatedAt: serverTimestamp(),
            role: existingData?.role || 'customer' // Preserve role if it exists
        };

        if (options.isNewUser && !existingData) {
            payload.createdAt = serverTimestamp();
            payload.status = 'active';
            payload.role = 'customer';
            payload.loyaltyPoints = 0;
        } else if (options.isNewUser && existingData) {
            // New sign up, but already was in DB (e.g. from invited staff list)
            payload.createdAt = existingData.createdAt || serverTimestamp();
            payload.status = 'active';
            payload.loyaltyPoints = existingData.loyaltyPoints || 0;
        }

        await setDoc(userRef, payload, { merge: true });
    };

    useEffect(() => {
        setPersistence(auth, browserLocalPersistence).catch(() => {
            // Ignore and continue with default persistence.
        });

        let unsubscribeProfile = () => { };

        const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
            setUser(nextUser);
            unsubscribeProfile();

            if (nextUser) {
                try {
                    await syncUserProfile(nextUser);
                } catch (error) {
                    console.error('User profile sync failed:', error);
                }

                unsubscribeProfile = onSnapshot(
                    doc(db, 'users', nextUser.uid),
                    (snapshot) => {
                        setUserProfile(snapshot.exists() ? snapshot.data() : null);
                        setLoading(false);
                    },
                    (error) => {
                        console.error('User profile subscription failed:', error);
                        setUserProfile(null);
                        setLoading(false);
                    }
                );
                return;
            }

            setUserProfile(null);
            setLoading(false);
        });

        let unsubscribeRoles = onSnapshot(
            collection(db, 'role_definitions'),
            (snapshot) => {
                const dynamicRoles = {};
                snapshot.docs.forEach((docSnap) => {
                    const data = docSnap.data();
                    dynamicRoles[data.key] = data;
                });
                setRoles({ ...DEFAULT_ROLES, ...dynamicRoles });
            },
            (error) => {
                console.error('Roles fetch failed:', error);
                setRoles(DEFAULT_ROLES);
            }
        );

        return () => {
            unsubscribeProfile();
            unsubscribe();
            unsubscribeRoles();
        };
    }, []);

    const userRole = userProfile?.role || 'customer';
    const roleData = roles[userRole] || roles.customer;
    const isStaff = STAFF_ROLES.includes(userRole) || (roleData && roleData.key !== 'customer');
    const isAdmin = userRole === 'admin' || (roleData && roleData.permissions.includes('manage_staff_roles'));

    const hasPermission = useCallback(
        (permission) => {
            const currentRoleData = roles[userRole];
            if (!currentRoleData) return false;
            return currentRoleData.permissions.includes(permission);
        },
        [userRole, roles]
    );

    const value = useMemo(
        () => ({
            user,
            userProfile,
            roles,
            role: userRole,
            roleInfo: roleData,
            isAdmin,
            isStaff,
            hasPermission,
            loading,
            signInWithGoogle: async () => {
                try {
                    const credential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
                    const additionalInfo = getAdditionalUserInfo(credential);
                    await syncUserProfile(credential.user, { isNewUser: additionalInfo?.isNewUser });
                    return { ok: true, error: '' };
                } catch (error) {
                    console.error('Google sign-in error:', error);
                    return { ok: false, error: getAuthMessage(error) };
                }
            },
            signInWithEmail: async (email, password) => {
                try {
                    const credential = await signInWithEmailAndPassword(auth, email, password);
                    await syncUserProfile(credential.user);
                    return { ok: true, error: '' };
                } catch (error) {
                    console.error('Email sign-in error:', error);
                    return { ok: false, error: getAuthMessage(error) };
                }
            },
            signUpWithEmail: async (email, password, displayName) => {
                try {
                    const credential = await createUserWithEmailAndPassword(auth, email, password);
                    if (displayName?.trim()) {
                        await updateProfile(credential.user, { displayName: displayName.trim() });
                    }
                    await syncUserProfile(credential.user, { isNewUser: true });
                    return { ok: true, error: '' };
                } catch (error) {
                    console.error('Email sign-up error:', error);
                    return { ok: false, error: getAuthMessage(error) };
                }
            },
            logout: async () => {
                try {
                    await signOut(auth);
                    return { ok: true, error: '' };
                } catch (error) {
                    console.error('Logout error:', error);
                    return { ok: false, error: getAuthMessage(error) };
                }
            },
        }),
        [user, userProfile, loading, userRole, isAdmin, isStaff, roleData, hasPermission, roles]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
