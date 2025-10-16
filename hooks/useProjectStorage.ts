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

// FIX: Added a custom error class for unrecoverable authentication issues.
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

    const createOnDrive = React.useCallback(async (data: ProjectData): Promise<{ fileId: string, name: string }> => {
        console.log("Creating new file on Google Drive via gapi.client.request...");
        
        // Step 1: Create the file with metadata only.
        const createResponse = await gapi.client.request({
            path: '/drive/v3/files',
            method: 'POST',
            body: {
                name: DRIVE_PROJECT_FILENAME,
                mimeType: 'application/json',
            }
        });

        const fileId = createResponse.result.id;
        if (!fileId) {
            console.error("Drive API Error on create:", createResponse.result);
            throw new Error("File creation failed: No ID returned from Drive API.");
        }
        console.log(`File metadata created with ID: ${fileId}`);
        
        // Step 2: Upload the content to the newly created file.
        await gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            body: JSON.stringify(data)
        });
        
        console.log("File content uploaded successfully.");
        driveFileIdRef.current = fileId;
        await idbSet(DRIVE_FILE_ID_KEY, fileId);
        return { fileId: fileId, name: createResponse.result.name };
    }, []);

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

    // FIX: Updated to no longer sign out automatically, allowing the caller to handle failures.
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
                            const userInfo = await gapi.client.request({ path: 'https://www.googleapis.com/oauth2/v3/userinfo' });
                            const profile: UserProfile = { name: userInfo.result.name, email: userInfo.result.email, picture: userInfo.result.picture };
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

    // FIX: Made saveToDrive more robust by proactively refreshing expired tokens before saving.
    const saveToDrive = React.useCallback(async (data: ProjectData) => {
        // Proactive token check to prevent save failures from expired tokens,
        // which can happen if the computer was asleep. We refresh if the token
        // is missing, expired, or will expire in the next 5 minutes.
        const token = await idbGet<StoredToken>(GAPI_AUTH_TOKEN_KEY);
        const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
        if (!token || !token.access_token || Date.now() >= (token.expires_at - FIVE_MINUTES_IN_MS)) {
            console.log("Token is missing, expired, or expiring soon. Refreshing proactively.");
            const newProfile = await refreshTokenAndGetProfile();
            if (!newProfile) {
                // If proactive refresh fails, we can't save. This is a permanent error.
                throw new PermanentAuthError("Could not refresh your Google session. Please sign in again to continue saving.");
            }
        }
        
        let fileId = driveFileIdRef.current || await idbGet<string>(DRIVE_FILE_ID_KEY);
    
        if (!fileId) {
            console.log("No Drive file ID found, creating a new file...");
            const { fileId: newFileId } = await createOnDrive(data);
            driveFileIdRef.current = newFileId;
            console.log(`New file created on Drive with ID: ${newFileId}.`);
            return;
        }
        
        driveFileIdRef.current = fileId;

        const doSaveRequest = () => gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            body: JSON.stringify(data)
        });
    
        try {
            console.log(`Initiating upload for Drive file: ${fileId} via gapi.client.request`);
            await doSaveRequest();
            console.log("File updated successfully.");
        } catch (error: any) {
            console.error("Failed to update Drive file:", error);
    
            // If it's an auth error, try to refresh the token and retry once. This is a fallback
            // in case the token was invalidated on the server-side before its expiry time.
            if (error.status === 401 || error.status === 403) {
                console.log("Save failed due to auth error. Refreshing token...");
                const newProfile = await refreshTokenAndGetProfile();
                if (newProfile) {
                    console.log("Token refreshed. Retrying save...");
                    try {
                        await doSaveRequest();
                        console.log("File updated successfully on retry.");
                        return; // Success!
                    } catch (retryError: any) {
                        console.error("Save failed even after token refresh.", retryError);
                        // If retry fails, it's a more serious problem. Throw a permanent error.
                        throw new PermanentAuthError("Could not save to Google Drive after refreshing session. Your permissions might have changed.");
                    }
                } else {
                    console.error("Token refresh failed. This is a permanent auth error.");
                    throw new PermanentAuthError("Could not refresh your Google session. Please sign in again to continue saving.");
                }
            }
            
            // Handle cases where the file might have been deleted on Drive.
            if (error.status === 404) {
                 console.log("File not found on Drive. Creating a new one.");
                 await idbDel(DRIVE_FILE_ID_KEY);
                 driveFileIdRef.current = null;
                 await createOnDrive(data);
                 return;
            }
    
            // Re-throw other errors (like network errors) so the calling hook can handle retries.
            throw error;
        }
    }, [createOnDrive, refreshTokenAndGetProfile]);

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