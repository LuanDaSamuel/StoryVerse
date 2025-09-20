import { useCallback, useRef } from 'react';
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

// --- Helper Functions ---
async function verifyPermission(handle: FileSystemHandle) {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if ((await handle.requestPermission(options)) === 'granted') return true;
    return false;
}

export function useProjectStorage() {
    const driveFileIdRef = useRef<string | null>(null);
    const projectFileHandleRef = useRef<FileSystemFileHandle | null>(null);

    const createOnDrive = useCallback(async (data: ProjectData): Promise<{ fileId: string, name: string }> => {
        console.log("Creating new file on Google Drive...");
        const boundary = '-------314159265358979323846';
        const metadata = { name: DRIVE_PROJECT_FILENAME, mimeType: 'application/json' };

        const multipartRequestBody = [
            `--${boundary}`,
            'Content-Type: application/json; charset=UTF-8',
            '',
            JSON.stringify(metadata),
            `--${boundary}`,
            'Content-Type: application/json',
            '',
            JSON.stringify(data, null, 2),
            `--${boundary}--`
        ].join('\r\n');


        const response = await gapi.client.request({
            path: 'https://www.googleapis.com/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
            body: multipartRequestBody
        });

        if (!response.result.id) {
            throw new Error("File creation failed: No ID returned from Drive API.");
        }
        
        console.log("File created successfully on Drive:", response.result);
        driveFileIdRef.current = response.result.id;
        await idbSet(DRIVE_FILE_ID_KEY, response.result.id);
        return { fileId: response.result.id, name: response.result.name };
    }, []);

    const saveToDrive = useCallback(async (data: ProjectData) => {
        const fileId = driveFileIdRef.current || await idbGet<string>(DRIVE_FILE_ID_KEY);
        if (!fileId) {
            console.log("No Drive file ID found locally, creating a new file...");
            await createOnDrive(data);
            console.log("New file created on Drive.");
        } else {
            driveFileIdRef.current = fileId;
            console.log(`Updating existing Drive file with media upload: ${fileId}`);
            try {
                await gapi.client.request({
                    path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data, null, 2),
                });
    
                console.log("File updated successfully via media upload.");
            } catch (error: any) {
                console.error("Failed to update Drive file:", error);
                // If the file was not found (e.g., deleted by the user), create a new one.
                if (error.status === 404) {
                    console.log("File not found on Drive, creating a new one.");
                    await idbDel(DRIVE_FILE_ID_KEY); // Clear the stale ID
                    driveFileIdRef.current = null;
                    await createOnDrive(data);
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }
    }, [createOnDrive]);

    const loadFromDrive = useCallback(async (): Promise<{ name: string, data: ProjectData } | null> => {
        // First, try to load using a stored file ID for efficiency and robustness.
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
                 console.error("Failed to load file from stored ID, it might have been deleted. Clearing ID.", error);
                 await idbDel(DRIVE_FILE_ID_KEY);
            }
        }

        // If loading by ID fails, fall back to searching by name.
        console.log("Searching for project file by name on Google Drive...");
        const listResponse = await gapi.client.request({
            path: 'https://www.googleapis.com/drive/v3/files',
            params: {
                q: `name='${DRIVE_PROJECT_FILENAME}' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            }
        });

        if (listResponse.result.files && listResponse.result.files.length > 0) {
            const file = listResponse.result.files[0];
            console.log(`Found project file by name with ID: ${file.id}`);
            driveFileIdRef.current = file.id;
            await idbSet(DRIVE_FILE_ID_KEY, file.id); // Store the found ID for next time
            
            const contentResponse = await gapi.client.request({
                path: `https://www.googleapis.com/drive/v3/files/${file.id}`,
                params: { alt: 'media' }
            });

            return { name: file.name, data: contentResponse.result };
        }
        console.log("No project file found on Google Drive.");
        return null;
    }, []);

    const signIn = useCallback(async (): Promise<UserProfile> => {
      return new Promise((resolve, reject) => {
        try {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: async (tokenResponse: TokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        await idbSet(GAPI_AUTH_TOKEN_KEY, tokenResponse);
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
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (error) {
            reject(error);
        }
      });
    }, []);

    const signOut = useCallback(async () => {
        const token = gapi.client?.getToken();
        if (token && token.access_token) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Google token revoked.');
            });
        }
        if (gapi.client) {
            gapi.client.setToken('');
        }
        await idbDel(GAPI_AUTH_TOKEN_KEY);
        await idbDel(DRIVE_FILE_ID_KEY);
        driveFileIdRef.current = null;
        google.accounts.id.disableAutoSelect();
        console.log('User signed out and session data cleared.');
    }, []);
    
    const initAndRestoreSession = useCallback(async (): Promise<UserProfile | null> => {
        console.log("Initializing GAPI client and attempting to restore session...");
        await new Promise<void>((resolve, reject) => gapi.load('client', () => resolve()));
        await gapi.client.init({ apiKey: API_KEY }).catch((err: any) => {
            console.error("GAPI client init failed:", err);
            throw new Error(`Initialization failed:\n${err.details || 'Unknown error.'}`);
        });

        const token = await idbGet<TokenResponse>(GAPI_AUTH_TOKEN_KEY);
        if (token && token.access_token) {
            console.log("Found saved auth token, verifying...");
            gapi.client.setToken(token);
            try {
                // Verify the token is still valid by making a lightweight API call
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
        }
        console.log("No saved session found.");
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
            await writable.write(JSON.stringify(data, null, 2));
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
