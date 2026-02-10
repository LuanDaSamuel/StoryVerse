
import * as React from 'react';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { ProjectData, UserProfile } from '../types';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, enableIndexedDbPersistence } from 'firebase/firestore';

// --- Constants ---
const PROJECT_FILE_HANDLE_KEY = 'storyverse-project-file-handle';
const USER_PROFILE_KEY = 'storyverse-user-profile';

const firebaseConfig = {
  apiKey: "AIzaSyCXcue1SOX_GN1a6LKkZeXxbWwN8-YT6Vg",
  authDomain: "gemini-dev-461308.firebaseapp.com",
  projectId: "gemini-dev-461308",
  storageBucket: "gemini-dev-461308.firebasestorage.app",
  messagingSenderId: "54041417021",
  appId: "1:54041417021:web:0a77ee20ba3ed35023e154"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
          console.warn("Firestore persistence failed: Multiple tabs open.");
      } else if (err.code === 'unimplemented') {
          console.warn("Firestore persistence is not supported in this browser.");
      }
  });
} catch (e) {
  console.warn("Persistence setup error", e);
}

async function verifyPermission(handle: FileSystemHandle) {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if ((await handle.requestPermission(options)) === 'granted') return true;
    return false;
}

export function useProjectStorage() {
    const projectFileHandleRef = React.useRef<FileSystemFileHandle | null>(null);

    const signOut = React.useCallback(async () => {
        try {
            await firebaseSignOut(auth);
            await idbDel(USER_PROFILE_KEY);
        } catch (error) {
            console.error("Sign out error:", error);
        }
    }, []);

    const getStoredProfile = React.useCallback(async (): Promise<UserProfile | null> => {
        const user = auth.currentUser;
        if (user) {
            return {
                name: user.displayName || 'User',
                email: user.email || '',
                picture: user.photoURL || ''
            };
        }
        return idbGet<UserProfile>(USER_PROFILE_KEY);
    }, []);

    const signIn = React.useCallback(async (): Promise<UserProfile> => {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const profile = {
                name: user.displayName || 'User',
                email: user.email || '',
                picture: user.photoURL || ''
            };
            await idbSet(USER_PROFILE_KEY, profile);
            return profile;
        } catch (error: any) {
            console.error("Firebase Sign-In Error:", error);
            if (error.code === 'auth/popup-blocked') {
                alert("Sign-in popup was blocked by your browser. Please allow popups for this site.");
            } else if (error.code === 'auth/unauthorized-domain') {
                const currentDomain = window.location.hostname;
                alert(`Domain "${currentDomain}" is not authorized for Google Sign-In.\n\nTo fix this:\n1. Go to the Firebase Console for project "gemini-dev-461308".\n2. Navigate to Authentication > Settings > Authorized Domains.\n3. Add "${currentDomain}" to the list.`);
            } else {
                alert(`Sign-in failed: ${error.message}`);
            }
            throw error;
        }
    }, []);

    const saveToCloud = React.useCallback(async (data: ProjectData) => {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in for cloud save");
        
        const projectRef = doc(db, 'users', user.uid, 'projects', 'default');
        await setDoc(projectRef, data);
    }, []);

    const loadFromCloud = React.useCallback(async (): Promise<{ name: string, data: ProjectData } | null> => {
        const user = auth.currentUser;
        if (!user) return null;

        const projectRef = doc(db, 'users', user.uid, 'projects', 'default');
        const docSnap = await getDoc(projectRef);

        if (docSnap.exists()) {
            return { name: 'Cloud Sync', data: docSnap.data() as ProjectData };
        }
        return null;
    }, []);

    const subscribeToAuthState = React.useCallback((callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, callback);
    }, []);

    // --- Local File System Functions ---
    const getHandleFromIdb = async () => idbGet<FileSystemFileHandle>(PROJECT_FILE_HANDLE_KEY);
    const saveHandleToIdb = async (handle: FileSystemFileHandle) => {
        projectFileHandleRef.current = handle;
        await idbSet(PROJECT_FILE_HANDLE_KEY, handle);
    };
    const clearHandleFromIdb = async () => {
        projectFileHandleRef.current = null;
        await idbDel(PROJECT_FILE_HANDLE_KEY);
    };
    const loadFromFileHandle = async (handle: FileSystemFileHandle): Promise<{ name: string; data: any } | null> => {
        if (await verifyPermission(handle)) {
            projectFileHandleRef.current = handle;
            const file = await handle.getFile();
            const content = await file.text();
            return { name: handle.name, data: JSON.parse(content) };
        }
        return null;
    };
    const saveToFileHandle = async (data: ProjectData) => {
        const handle = projectFileHandleRef.current ?? await getHandleFromIdb();
        if (handle && await verifyPermission(handle)) {
            projectFileHandleRef.current = handle;
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(data));
            await writable.close();
        }
    };

    return {
        signIn,
        signOut,
        saveToCloud,
        loadFromCloud,
        subscribeToAuthState,
        getStoredProfile,
        getHandleFromIdb,
        saveHandleToIdb,
        clearHandleFromIdb,
        loadFromFileHandle,
        saveToFileHandle,
    };
}
