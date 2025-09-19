
import { useCallback, useRef } from 'react';
import { get, set, del } from 'idb-keyval';
import { ProjectData, UserProfile } from '../types';

// --- Constants ---
const PROJECT_FILE_HANDLE_KEY = 'storyverse-project-file-handle';
export const DRIVE_PROJECT_FILENAME = 'StoryVerse-Project.json';

// --- Type definitions for Google APIs ---
declare const google: any;
declare const gapi: any;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
}

// --- Helper Functions ---
async function verifyPermission(handle: FileSystemHandle) {
    const options = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if ((await handle.requestPermission(options)) === 'granted') return true;
    return false;
}

export function useProjectStorage() {
    const projectFileHandleRef = useRef<FileSystemFileHandle | null>(null);
    const driveFileIdRef = useRef<string | null>(null);
    const gapiTokenClient = useRef<any>(null);

    // --- Google Drive API Functions ---
    
    const loadFromDrive = useCallback(async (): Promise<{ fileId: string, name: string, data: ProjectData } | null> => {
        const response = await gapi.client.drive.files.list({
            'q': `name='${DRIVE_PROJECT_FILENAME}' and trashed=false`,
            'fields': 'files(id, name)',
            'spaces': 'drive'
        });

        if (response.result.files && response.result.files.length > 0) {
            const file = response.result.files[0];
            driveFileIdRef.current = file.id;
            
            const fileContentResponse = await gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media'
            });
            
            return { fileId: file.id, name: file.name, data: fileContentResponse.result };
        }
        return null;
    }, []);

    const saveToDrive = useCallback(async (data: ProjectData) => {
        if (!driveFileIdRef.current) {
            throw new Error("No Google Drive file ID available for saving.");
        }
        
        // FIX: Replaced the complex and error-prone multipart upload with a simpler 'media' upload.
        // This is the recommended approach for updating only the file's content, making the save operation more reliable.
        await gapi.client.request({
            path: `/upload/drive/v3/files/${driveFileIdRef.current}`,
            method: 'PATCH',
            params: {
                uploadType: 'media'
            },
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data, null, 2)
        });
    }, []);

    const createOnDrive = useCallback(async (data: ProjectData): Promise<{ fileId: string, name: string }> => {
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;
        
        const metadata = {
            name: DRIVE_PROJECT_FILENAME,
            mimeType: 'application/json',
        };

        const multipartRequestBody =
            delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
            delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(data, null, 2) +
            close_delim;
            
        const response = await gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
            body: multipartRequestBody
        });

        driveFileIdRef.current = response.result.id;
        return { fileId: response.result.id, name: response.result.name };
    }, []);

    // --- Auth Functions ---
    const signIn = useCallback(() => {
        if (gapiTokenClient.current) {
            // By removing `prompt: 'consent'`, Google's library will automatically
            // attempt a silent sign-in if the user has previously granted consent.
            // The consent screen will only appear for new users or if permissions
            // need to be re-approved, streamlining the login for returning users.
            gapiTokenClient.current.requestAccessToken({});
        }
    }, []);

    const signOut = useCallback(() => {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token, () => {});
            gapi.client.setToken('');
        }
        driveFileIdRef.current = null;
    }, []);
    
    const initializeGapiClient = useCallback((onAuthSuccess: (profile: UserProfile) => void) => {
        const initGis = () => {
            try {
                gapiTokenClient.current = google.accounts.oauth2.initTokenClient({
                    client_id: '54041417021-36ab4qaddnugncdodmpbafss1rjvttak.apps.googleusercontent.com',
                    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    callback: async (tokenResponse: TokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            gapi.client.setToken(tokenResponse);
                            const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                            }).then(res => res.json());

                            const profile = { name: userInfo.name, email: userInfo.email, picture: userInfo.picture };
                            onAuthSuccess(profile);
                        }
                    },
                });
            } catch (error) {
                console.error("Error initializing Google Identity Services", error);
            }
        };

        const initGapi = () => {
            gapi.load('client', async () => {
                await gapi.client.init({
                    apiKey: 'AIzaSyBZ-CWnQ9-Jm4Y6kRpCXPDRXMH4S-zCVh8',
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                initGis();
            });
        };

        const checkApisLoaded = setInterval(() => {
            if (typeof google !== 'undefined' && typeof gapi !== 'undefined') {
                clearInterval(checkApisLoaded);
                initGapi();
            }
        }, 100);
    }, []);


    // --- Local File System Functions ---
    const getHandleFromIdb = useCallback(async () => {
        return await get<FileSystemFileHandle>(PROJECT_FILE_HANDLE_KEY);
    }, []);

    const saveHandleToIdb = useCallback(async (handle: FileSystemFileHandle) => {
        projectFileHandleRef.current = handle;
        await set(PROJECT_FILE_HANDLE_KEY, handle);
    }, []);
    
    const clearHandleFromIdb = useCallback(async () => {
        projectFileHandleRef.current = null;
        await del(PROJECT_FILE_HANDLE_KEY);
    }, []);

    const loadFromFileHandle = useCallback(async (handle: FileSystemFileHandle): Promise<{ name: string; data: any } | null> => {
        if (await verifyPermission(handle)) {
            projectFileHandleRef.current = handle;
            const file = await handle.getFile();
            const content = await file.text();
            return { name: handle.name, data: JSON.parse(content) };
        }
        return null;
    }, []);

    const saveToFileHandle = useCallback(async (data: ProjectData) => {
        if (projectFileHandleRef.current && await verifyPermission(projectFileHandleRef.current)) {
            const writable = await projectFileHandleRef.current.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        }
    }, []);

    return {
        // Drive
        loadFromDrive,
        saveToDrive,
        createOnDrive,
        // Auth
        initializeGapiClient,
        signIn,
        signOut,
        // Local
        getHandleFromIdb,
        saveHandleToIdb,
        clearHandleFromIdb,
        loadFromFileHandle,
        saveToFileHandle,
    };
}