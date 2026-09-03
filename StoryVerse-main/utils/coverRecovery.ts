import { get as idbGet } from 'idb-keyval';
import { ProjectData, Novel } from '../types';

/**
 * Searches local backups and Google Drive revision history to find
 * a previous cover image for a novel that may have been lost.
 */
export async function findPreviousCoverImage(
    novelId: string,
    novelTitle: string,
    driveFileId?: string | null,
    getAccessToken?: () => Promise<string>
): Promise<string | null> {
    // 1. Search IndexedDB local backups
    const localKeys = [
        'storyverse-local-backup',
        'storyverse-active-project-shared',
        'storyverse-local-project-backup'
    ];

    for (const key of localKeys) {
        try {
            const data = await idbGet<ProjectData | any>(key);
            if (data && Array.isArray(data.novels)) {
                const match = data.novels.find((n: any) => n && (n.id === novelId || (novelTitle && n.title === novelTitle)));
                if (match?.coverImage && typeof match.coverImage === 'string' && match.coverImage.length > 50) {
                    console.log(`[CoverRecovery] Found cover image in local backup "${key}"`);
                    return match.coverImage;
                }
            }
        } catch (e) {
            console.warn(`[CoverRecovery] Could not read ${key}:`, e);
        }
    }

    // 2. Search localStorage emergency backup
    try {
        const raw = localStorage.getItem('storyverse-unload-backup');
        if (raw) {
            const data = JSON.parse(raw);
            if (data && Array.isArray(data.novels)) {
                const match = data.novels.find((n: any) => n && (n.id === novelId || (novelTitle && n.title === novelTitle)));
                if (match?.coverImage && typeof match.coverImage === 'string' && match.coverImage.length > 50) {
                    console.log('[CoverRecovery] Found cover image in localStorage unload backup');
                    return match.coverImage;
                }
            }
        }
    } catch (e) {
        console.warn('[CoverRecovery] Could not read unload backup:', e);
    }

    // 3. Search Google Drive revision history if available
    if (driveFileId && getAccessToken) {
        try {
            const token = await getAccessToken();
            if (token) {
                // Fetch list of revisions
                const revListResp = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/revisions?fields=revisions(id,modifiedTime)&pageSize=20`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (revListResp.ok) {
                    const revListData = await revListResp.json();
                    const revisions = revListData.revisions || [];
                    console.log(`[CoverRecovery] Checking ${revisions.length} Google Drive revisions for lost cover...`);

                    // Check revisions from newest to oldest
                    for (let i = revisions.length - 1; i >= 0; i--) {
                        const rev = revisions[i];
                        try {
                            const revContentResp = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/revisions/${rev.id}?alt=media`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (revContentResp.ok) {
                                const revData: ProjectData = await revContentResp.json();
                                if (revData && Array.isArray(revData.novels)) {
                                    const match = revData.novels.find(n => n && (n.id === novelId || (novelTitle && n.title === novelTitle)));
                                    if (match?.coverImage && typeof match.coverImage === 'string' && match.coverImage.length > 50) {
                                        console.log(`[CoverRecovery] Found cover in Drive revision ${rev.id} (${rev.modifiedTime})`);
                                        return match.coverImage;
                                    }
                                }
                            }
                        } catch (revErr) {
                            console.warn(`[CoverRecovery] Failed to inspect revision ${rev.id}:`, revErr);
                        }
                    }
                }
            }
        } catch (driveErr) {
            console.warn('[CoverRecovery] Google Drive revision lookup error:', driveErr);
        }
    }

    return null;
}
