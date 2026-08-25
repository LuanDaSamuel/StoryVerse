/**
 * Image optimization utilities for StoryVerse
 * Resizes and compresses novel cover images to prevent out-of-memory errors
 * during serialization, BroadcastChannel synchronization, and Google Drive cloud sync.
 */

export const MAX_COVER_IMAGE_BYTES = 350 * 1024; // 350 KB ceiling for base64 image data
export const MAX_UPLOAD_FILE_BYTES = 15 * 1024 * 1024; // 15 MB raw upload limit

/**
 * Checks if a base64 image string exceeds the safe byte size.
 */
export function isBase64ImageOversized(base64Str?: string | null, maxBytes: number = MAX_COVER_IMAGE_BYTES): boolean {
    if (!base64Str || typeof base64Str !== 'string') return false;
    // Fast estimation: length of base64 * 0.75 gives binary size
    return (base64Str.length * 0.75) > maxBytes;
}

/**
 * Resizes and compresses an image (File, Blob, or base64 data URL) into an optimized
 * JPEG/WebP base64 string with reasonable dimensions (default max: 800x1200, quality 0.82).
 */
export async function optimizeCoverImage(
    source: File | Blob | string,
    maxWidth: number = 800,
    maxHeight: number = 1200,
    quality: number = 0.82
): Promise<string> {
    // If source is already a small base64 string, keep it to save compute
    if (typeof source === 'string') {
        if (!source.startsWith('data:image/')) {
            // Invalid data URL format
            return '';
        }
        if (!isBase64ImageOversized(source, 150 * 1024)) {
            // Under 150KB, safe to use as-is
            return source;
        }
    } else if (source instanceof File || source instanceof Blob) {
        if (source.size > MAX_UPLOAD_FILE_BYTES) {
            throw new Error(`File is too large (${(source.size / (1024 * 1024)).toFixed(1)}MB). Please choose an image under 15MB.`);
        }
    }

    return new Promise((resolve, reject) => {
        let objectUrl: string | null = null;
        let imgSrc: string;

        if (typeof source === 'string') {
            imgSrc = source;
        } else {
            objectUrl = URL.createObjectURL(source);
            imgSrc = objectUrl;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

                if (width <= 0 || height <= 0) {
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                    resolve(typeof source === 'string' ? source : '');
                    return;
                }

                // Compute aspect-ratio preserving dimensions
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) {
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                    resolve(typeof source === 'string' ? source : '');
                    return;
                }

                // Fill background with clean white/neutral before drawing (for transparent PNG conversion)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Try converting to WebP, fallback to JPEG
                let outputDataUrl = canvas.toDataURL('image/webp', quality);
                if (!outputDataUrl.startsWith('data:image/webp')) {
                    outputDataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                // Clean up memory
                canvas.width = 0;
                canvas.height = 0;
                if (objectUrl) URL.revokeObjectURL(objectUrl);

                resolve(outputDataUrl);
            } catch (err) {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                console.warn("Image compression failed, using fallback:", err);
                resolve(typeof source === 'string' ? source : '');
            }
        };

        img.onerror = (err) => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            console.error("Failed to load image for compression:", err);
            reject(new Error("Unable to process the selected image. Please try a different file."));
        };

        img.src = imgSrc;
    });
}
