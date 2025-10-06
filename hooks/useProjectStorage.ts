import * as React from 'react';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { ProjectData, UserProfile } from '../types';

// --- Constants ---
const PROJECT_FILE_HANDLE_KEY = 'storyverse-project-file-handle';
export const DRIVE_PROJECT_FILENAME = 'StoryVerse-Project.json';
const GAPI_AUTH_TOKEN_KEY = 'storyverse-gapi-auth-token';
const DRIVE_FILE_ID_KEY = 'storyverse-drive-file-id';
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

    const saveToDrive = React.useCallback(async (data: ProjectData) => {
        let fileId = driveFileIdRef.current || await idbGet<string>(DRIVE_FILE_ID_KEY);
    
        if (!fileId) {
            console.log("No Drive file ID found, creating a new file...");
            const { fileId: newFileId } = await createOnDrive(data);
            driveFileIdRef.current = newFileId;
            console.log(`New file created on Drive with ID: ${newFileId}.`);
            return;
        }
        
        driveFileIdRef.current = fileId;
    
        try {
            console.log(`Initiating upload for Drive file: ${fileId} via gapi.client.request`);
            
            await gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: JSON.stringify(data)
            });
    
            console.log("File updated successfully.");
    
        } catch (error: any) {
            console.error("Failed to update Drive file:", error);
    
            // Handle cases where the file might have been deleted on Drive.
            if (error.status === 404) {
                 console.log("File not found on Drive. Creating a new one.");
                 await idbDel(DRIVE_FILE_ID_KEY);
                 driveFileIdRef.current = null;
                 await createOnDrive(data);
                 return;
            }
    
            // Re-throw other errors so the calling hook (useProjectFile) can handle retries and UI state.
            throw error;
        }
    }, [createOnDrive]);

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

    const signOut = React.useCallback(async () => {
        if (gapi.client) {
            gapi.client.setToken('');
        }
        await idbDel(GAPI_AUTH_TOKEN_KEY);
        await idbDel(DRIVE_FILE_ID_KEY);
        driveFileIdRef.current = null;
        google.accounts.id.disableAutoSelect();
        console.log('User signed out. Local session data cleared.');
    }, []);
    
    const initAndRestoreSession = React.useCallback(async (): Promise<UserProfile | null> => {
        console.log("Initializing GAPI client and attempting to restore session...");
        await new Promise<void>((resolve, reject) => {
             // Add a timeout to prevent getting stuck if gapi fails to load
            const timeout = setTimeout(() => reject(new Error("gapi.load timed out")), 5000);
            gapi.load('client', () => { clearTimeout(timeout); resolve(); });
        });
        await gapi.client.init({ apiKey: API_KEY }).catch((err: any) => {
            console.error("GAPI client init failed:", err);
            throw new Error(`Initialization failed:\n${err.details || 'Unknown error.'}`);
        });

        const token = await idbGet<StoredToken>(GAPI_AUTH_TOKEN_KEY);
        if (token && token.access_token && Date.now() < token.expires_at) {
            console.log("Found valid, non-expired auth token, verifying...");
            gapi.client.setToken(token);
            try {
                const userInfo = await gapi.client.request({
                    path: 'https://www.googleapis.com/oauth2/v3/userinfo'
                });

                if (userInfo.result && userInfo.result.email) {
                    console.log("Session restored successfully for:", userInfo.result.email);
                    return { name: userInfo.result.name, email: userInfo.result.email, picture: userInfo.result.picture };
                } else {
                    console.warn("Token verification failed, user info was invalid.", userInfo);
                    await signOut();
                    return null;
                }
            } catch (error: any) {
                console.warn("Restoring session failed, token is likely expired or invalid. Signing out.", error);
                await signOut();
                return null;
            }
        } else if (token) {
            console.log("Found expired auth token. Clearing session.");
            await signOut();
        }
        
        console.log("No valid session found.");
        return null;
    }, [signOut]);

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
        initAndRestoreSession,
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