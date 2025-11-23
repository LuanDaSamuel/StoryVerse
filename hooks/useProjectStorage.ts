import * as React from 'react';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { ProjectData, UserProfile } from '../types';

// --- Constants ---
const PROJECT_FILE_HANDLE_KEY = 'storyverse-project-file-handle';
export const DRIVE_PROJECT_FILENAME = 'StoryVerse-Project.json';
const GAPI_AUTH_TOKEN_KEY = 'storyverse-gapi-auth-token';
const DRIVE_FILE_ID_KEY = 'storyverse-drive-file-id';
const USER_PROFILE_KEY = 'storyverse-user-profile';
const CLIENT_ID = '54041417021-36ab4qaddnugncdodmpbafss1rjvttak.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBZ-CWnQ9-Jm4Y6kRpCXPDRXMH4S-zCVh8';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

// --- Type definitions ---
declare const google: any;
declare const gapi: any;
type TokenResponse = any;
// Add a type for the stored token to include expiration data.
interface StoredToken extends TokenResponse {
    expires_at: number;
}

export class PermanentAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PermanentAuthError';
    }
}


// --- Helper Functions ---
async function verifyPermission(handle: FileSystemHandle) {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if ((await handle.requestPermission(options)) === 'granted') return true;
    return false;
}

export function useProjectStorage() {
    const driveFileIdRef = React.useRef<string | null>(null);
    const projectFileHandleRef = React.useRef<FileSystemFileHandle | null>(null);

    const signOut = React.useCallback(async () => {
        if (gapi.client) {
            gapi.client.setToken('');
        }
        await idbDel(GAPI_AUTH_TOKEN_KEY);
        await idbDel(DRIVE_FILE_ID_KEY);
        await idbDel(USER_PROFILE_KEY);
        driveFileIdRef.current = null;
        if (google?.accounts?.id) {
          google.accounts.id.disableAutoSelect();
        }
        console.log('User signed out. Local session data cleared.');
    }, []);

    const refreshTokenAndGetProfile = React.useCallback(async (): Promise<UserProfile | null> => {
        console.log("Attempting to refresh token silently...");
        return new Promise((resolve) => {
            try {
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: async (tokenResponse: TokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            console.log("Silent token refresh successful.");
                            const expires_at = Date.now() + (tokenResponse.expires_in * 1000);
                            const storedToken: StoredToken = { ...tokenResponse, expires_at };
                            await idbSet(GAPI_AUTH_TOKEN_KEY, storedToken);

                            gapi.client.setToken(tokenResponse);
                            
                            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                            });

                            if (!userInfoRes.ok) {
                                console.error("Could not fetch user info after token refresh.");
                                resolve(null);
                                return;
                            }
                            const userInfo = await userInfoRes.json();
                            const profile: UserProfile = { name: userInfo.name, email: userInfo.email, picture: userInfo.picture };
                            await idbSet(USER_PROFILE_KEY, profile);
                            resolve(profile);
                        } else {
                            console.log("Silent token refresh failed to get access_token.");
                            resolve(null);
                        }
                    },
                    error_callback: (error: any) => {
                        console.warn("Silent token refresh error:", error);
                        resolve(null);
                    }
                });
                tokenClient.requestAccessToken({ prompt: 'none' });
            } catch (error) {
                console.error("Error setting up silent token refresh.", error);
                resolve(null);
            }
        });
    }, []);

    const getAccessToken = React.useCallback(async (): Promise<string> => {
        let token = await idbGet<StoredToken>(GAPI_AUTH_TOKEN_KEY);
        const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
    
        if (!token || !token.access_token || Date.now() >= (token.expires_at - FIVE_MINUTES_IN_MS)) {
            console.log("Token is missing, expired, or expiring soon. Refreshing proactively.");
            const newProfile = await refreshTokenAndGetProfile();
            if (!newProfile) {
                throw new PermanentAuthError("Could not refresh your Google session. Please sign in again to continue saving.");
            }
            token = await idbGet<StoredToken>(GAPI_AUTH_TOKEN_KEY); // Re-fetch the token
        }
    
        if (!token || !token.access_token) {
            throw new PermanentAuthError("No valid auth token available.");
        }
    
        return token.access_token;
    }, [refreshTokenAndGetProfile]);

    const createOnDrive = React.useCallback(async (data: ProjectData): Promise<{ fileId: string, name: string }> => {
        console.log("Creating new file on Google Drive via fetch...");
        const accessToken = await getAccessToken();

        // Step 1: Create file metadata
        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: DRIVE_PROJECT_FILENAME,
                mimeType: 'application/json',
                parents: ['appDataFolder']
            })
        });

        if (!createResponse.ok) {
            const errorBody = await createResponse.json().catch(() => ({}));
            throw new Error(`File metadata creation failed: ${errorBody?.error?.message || createResponse.statusText}`);
        }

        const createResult = await createResponse.json();
        const fileId = createResult.id;
        if (!fileId) {
            throw new Error("File creation failed: No ID returned from Drive API.");
        }
        console.log(`File metadata created with ID: ${fileId}`);
        
        // Step 2: Upload content
        const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.json().catch(() => ({}));
            throw new Error(`File content upload failed: ${errorBody?.error?.message || uploadResponse.statusText}`);
        }
        
        console.log("File content uploaded successfully.");
        driveFileIdRef.current = fileId;
        await idbSet(DRIVE_FILE_ID_KEY, fileId);
        return { fileId: fileId, name: createResult.name };
    }, [getAccessToken]);
    
    const saveToDrive = React.useCallback(async (data: ProjectData) => {
        let fileId = driveFileIdRef.current || await idbGet<string>(DRIVE_FILE_ID_KEY);
    
        if (!fileId) {
            console.log("No Drive file ID found, creating a new file...");
            const { fileId: newFileId } = await createOnDrive(data);
            console.log(`New file created on Drive with ID: ${newFileId}.`);
            return;
        }
        
        driveFileIdRef.current = fileId;
    
        try {
            const accessToken = await getAccessToken();
            console.log(`Initiating upload for Drive file: ${fileId} via fetch`);
            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
    
            if (response.ok) {
                console.log("File updated successfully using fetch.");
                return; // Success
            }
    
            const errorBody = await response.json().catch(() => ({}));
    
            if (response.status === 404) {
                 console.log("File not found on Drive. Creating a new one.");
                 await idbDel(DRIVE_FILE_ID_KEY);
                 driveFileIdRef.current = null;
                 await createOnDrive(data);
                 return;
            }
    
            if (response.status === 401 || response.status === 403) {
                throw new PermanentAuthError(errorBody?.error?.message || "Google Drive authentication failed.");
            }
    
            throw new Error(errorBody?.error?.message || `HTTP error! status: ${response.status}`);
        } catch (error) {
            console.error("Failed to update Drive file with fetch:", error);
            throw error;
        }
    }, [getAccessToken, createOnDrive]);

    const loadFromDrive = React.useCallback(async (): Promise<{ name: string, data: ProjectData } | null> => {
        const storedFileId = await idbGet<string>(DRIVE_FILE_ID_KEY);
        if (storedFileId) {
            console.log(`Attempting to load project file from stored ID: ${storedFileId}`);
            try {
                const fileMetadata = await gapi.client.request({
                    path: `https://www.googleapis.com/drive/v3/files/${storedFileId}`,
                    params: { fields: 'id, name, trashed' }
                });

                if (fileMetadata.result && !fileMetadata.result.trashed) {
                    const contentResponse = await gapi.client.request({
                        path: `https://www.googleapis.com/drive/v3/files/${storedFileId}`,
                        params: { alt: 'media' }
                    });
                    driveFileIdRef.current = storedFileId;
                    console.log(`Successfully loaded file from stored ID.`);
                    return { name: fileMetadata.result.name, data: contentResponse.result };
                } else {
                    console.log("Stored file ID was trashed or invalid. Clearing it.");
                    await idbDel(DRIVE_FILE_ID_KEY);
                }
            } catch (error: any) {
                 if (error.status === 404) {
                    console.error("Failed to load file from stored ID, it was not found. Clearing ID.", error);
                 } else {
                    console.error("An error occurred loading from stored ID. Clearing ID.", error);
                 }
                 await idbDel(DRIVE_FILE_ID_KEY);
                 // Rethrow so the caller can handle auth errors
                 throw error;
            }
        }

        console.log("Searching for the most recent project file by name on Google Drive...");
        const listResponse = await gapi.client.request({
            path: 'https://www.googleapis.com/drive/v3/files',
            params: {
                q: `name='${DRIVE_PROJECT_FILENAME}' and trashed=false`,
                fields: 'files(id, name, modifiedTime)',
                orderBy: 'modifiedTime desc',
                pageSize: 1,
                spaces: 'drive'
            }
        });

        if (listResponse.result.files && listResponse.result.files.length > 0) {
            const file = listResponse.result.files[0];
            console.log(`Found most recent project file by name with ID: ${file.id}`);
            driveFileIdRef.current = file.id;
            await idbSet(DRIVE_FILE_ID_KEY, file.id);
            
            const contentResponse = await gapi.client.request({
                path: `https://www.googleapis.com/drive/v3/files/${file.id}`,
                params: { alt: 'media' }
            });

            return { name: file.name, data: contentResponse.result };
        }
        
        console.log("No project file found on Google Drive.");
        return null;
    }, []);

    const signIn = React.useCallback(async (): Promise<UserProfile> => {
      return new Promise((resolve, reject) => {
        try {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: async (tokenResponse: TokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        const expires_at = Date.now() + (tokenResponse.expires_in * 1000);
                        const storedToken: StoredToken = { ...tokenResponse, expires_at };
                        await idbSet(GAPI_AUTH_TOKEN_KEY, storedToken);

                        gapi.client.setToken(tokenResponse);
                        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                        }).then(res => res.json());
                        const profile = { name: userInfo.name, email: userInfo.email, picture: userInfo.picture };
                        await idbSet(USER_PROFILE_KEY, profile);
                        resolve(profile);
                    } else {
                        reject(new Error("Sign in failed: No access token received."));
                    }
                },
                error_callback: (error: any) => {
                    console.error("Google Sign-In Error:", error);
                    reject(new Error(`Sign in failed: ${error.type || 'Unknown error'}`));
                }
            });
            tokenClient.requestAccessToken();
        } catch (error) {
            reject(error);
        }
      });
    }, []);

    const initGapiClient = React.useCallback(async (): Promise<void> => {
        await new Promise<void>((resolve, reject) => {
            if ((window as any).gapiLoaded) return resolve();
            const timeout = setTimeout(() => reject(new Error("Google API script failed to load.")), 10000);
            window.addEventListener('gapi-loaded', () => { clearTimeout(timeout); resolve(); }, { once: true });
        });

        console.log("Initializing GAPI client...");
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("gapi.load timed out")), 5000);
            gapi.load('client', () => { clearTimeout(timeout); resolve(); });
        });
        await gapi.client.init({ apiKey: API_KEY }).catch((err: any) => {
            console.error("GAPI client init failed:", err);
            throw new Error(`Initialization failed:\n${err.details || 'Unknown error.'}`);
        });
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
        } else {
             console.error("No file handle available or permission denied.");
        }
    };

    return {
        initGapiClient,
        refreshTokenAndGetProfile,
        signIn,
        signOut,
        loadFromDrive,
        saveToDrive,
        createOnDrive,
        getHandleFromIdb,
        saveHandleToIdb,
        clearHandleFromIdb,
        loadFromFileHandle,
        saveToFileHandle,
    };
}