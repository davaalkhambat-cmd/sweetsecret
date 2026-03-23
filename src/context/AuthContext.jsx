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
import { collection, doc, onSnapshot, serverTimestamp, setDoc, query, where, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { isStaffRole, getRoleInfo, DEFAULT_ROLES, resolveRoleKey } from '../config/roles';

const AuthContext = createContext(null);
const SUPER_ADMIN_EMAILS = new Set(['davaalkham.bat@gmail.com']);

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

const resolveUserRole = (roleKey, email = '') => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (SUPER_ADMIN_EMAILS.has(normalizedEmail)) {
        return 'super_admin';
    }
    return resolveRoleKey(roleKey || 'customer');
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
        const existingUIDData = userSnap.exists() ? userSnap.data() : null;

        // Try to find if there's an invitation doc for this email (status: 'invited')
        let invitationData = null;
        if (firebaseUser.email) {
            const normalizedEmail = firebaseUser.email.toLowerCase();
            const q = query(collection(db, 'users'), where('email', '==', normalizedEmail), where('status', '==', 'invited'));
            const invitationSnap = await getDocs(q);
            if (!invitationSnap.empty) {
                // Find primary invitation (favoring doc with ID starting with 'invited_')
                const bestDoc = invitationSnap.docs.find(d => d.id.startsWith('invited_')) || invitationSnap.docs[0];
                invitationData = {
                    ...bestDoc.data(),
                    docId: bestDoc.id
                };
            }
        }

        const payload = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || invitationData?.displayName || existingUIDData?.displayName || fallbackName,
            photoURL: firebaseUser.photoURL || existingUIDData?.photoURL || '',
            phoneNumber: firebaseUser.phoneNumber || invitationData?.phoneNumber || existingUIDData?.phoneNumber || '',
            providerIds: (firebaseUser.providerData || [])
                .map((provider) => provider?.providerId)
                .filter(Boolean),
            updatedAt: serverTimestamp(),
            role: resolveUserRole(invitationData?.role || existingUIDData?.role || 'customer', firebaseUser.email)
        };

        if (invitationData) {
            // USER WAS INVITED: Explicitly upgrade role and mark as active
            payload.status = 'active';
            payload.createdAt = existingUIDData?.createdAt || invitationData.createdAt || serverTimestamp();
            payload.loyaltyPoints = existingUIDData?.loyaltyPoints || invitationData.loyaltyPoints || 0;

            // Cleanup: Delete the temporary invitation document if it's separate from UID doc
            if (invitationData.docId !== firebaseUser.uid) {
                try {
                    await deleteDoc(doc(db, 'users', invitationData.docId));
                } catch (e) {
                    console.error("Cleanup invited doc failed:", e);
                }
            }
        } else if (existingUIDData) {
            // EXISTING USER: Regular sync
            payload.status = existingUIDData.status || 'active';
            payload.createdAt = existingUIDData.createdAt || serverTimestamp();
            payload.loyaltyPoints = existingUIDData.loyaltyPoints || 0;
            payload.role = resolveUserRole(existingUIDData.role || 'customer', firebaseUser.email);
        } else {
            // BRAND NEW USER: Initialize as customer
            payload.status = 'active';
            payload.createdAt = serverTimestamp();
            if (options.isNewUser) {
                payload.role = 'customer';
                payload.loyaltyPoints = 0;
            }
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
                    if (!data?.key || DEFAULT_ROLES[data.key]) return;
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

    const userRole = resolveUserRole(userProfile?.role || 'customer', userProfile?.email || user?.email);
    const roleData = getRoleInfo(userRole, roles);
    const isStaff = isStaffRole(userRole);
    const isAdmin = roleData.permissions.includes('manage_roles') || roleData.permissions.includes('manage_settings');

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
