// This file contains type definitions for the File System Access API.
// These are not included in standard TypeScript DOM library definitions yet,
// so we define them here to avoid compiler errors.

declare global {
    interface FileSystemHandlePermissionDescriptor {
        mode?: 'read' | 'readwrite';
    }

    interface FileSystemHandle {
        readonly kind: 'file' | 'directory';
        readonly name: string;
        isSameEntry(other: FileSystemHandle): Promise<boolean>;
        queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
        requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    }

    interface FileSystemFileHandle extends FileSystemHandle {
        readonly kind: 'file';
        getFile(): Promise<File>;
        createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
    }

    // This is a writable stream. The built-in WritableStream type is sufficient.
    interface FileSystemWritableFileStream extends WritableStream {}

    interface FileSystemDirectoryHandle extends FileSystemHandle {
        readonly kind: 'directory';
        getDirectoryHandle(name: string, options?: { create?: boolean; }): Promise<FileSystemDirectoryHandle>;
        getFileHandle(name: string, options?: { create?: boolean; }): Promise<FileSystemFileHandle>;
        removeEntry(name: string, options?: { recursive?: boolean; }): Promise<void>;
        resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<FileSystemHandle>;
        entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    }

    interface FilePickerAcceptType {
        description?: string;
        accept: Record<string, string | string[]>;
    }

    interface FilePickerOptions {
        types?: FilePickerAcceptType[];
        excludeAcceptAllOption?: boolean;
        id?: string;
        startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | FileSystemHandle;
    }

    interface OpenFilePickerOptions extends FilePickerOptions {
        multiple?: boolean;
    }

    interface SaveFilePickerOptions extends FilePickerOptions {
        suggestedName?: string;
    }

    interface Window {
        showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
        showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
        showDirectoryPicker(options?: {
            id?: string;
            startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | FileSystemHandle;
            mode?: 'read' | 'readwrite';
        }): Promise<FileSystemDirectoryHandle>;
    }
}

// This export statement is required to make this file a module augmentation.
export {};
