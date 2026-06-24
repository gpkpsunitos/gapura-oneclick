

const IMAGE_SIGNATURES: { mime: string; bytes: number[]; offset: number }[] = [
    { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
    { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0 },
    { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }, // GIF8
    { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (WebP container)
    { mime: 'image/bmp', bytes: [0x42, 0x4D], offset: 0 }, // BM
    { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2A, 0x00], offset: 0 }, // TIFF little-endian
    { mime: 'image/tiff', bytes: [0x4D, 0x4D, 0x00, 0x2A], offset: 0 }, // TIFF big-endian
];

const VIDEO_SIGNATURES: { mime: string; bytes: number[]; offset: number }[] = [
    { mime: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp (MP4 container)
    { mime: 'video/webm', bytes: [0x1A, 0x45, 0xDF, 0xA3], offset: 0 }, // EBML (WebM/Matroska)
    { mime: 'video/avi', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (AVI container)
    { mime: 'video/quicktime', bytes: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], offset: 4 }, // ftypqt
];

const ALL_SIGNATURES = [...IMAGE_SIGNATURES, ...VIDEO_SIGNATURES];

export function detectMimeType(buffer: Buffer): string | null {
    for (const sig of ALL_SIGNATURES) {
        if (buffer.length < sig.offset + sig.bytes.length) continue;
        
        let match = true;
        for (let i = 0; i < sig.bytes.length; i++) {
            if (buffer[sig.offset + i] !== sig.bytes[i]) {
                match = false;
                break;
            }
        }
        if (match) return sig.mime;
    }
    return null;
}

export function validateFileMimeType(buffer: Buffer, claimedType: string): { valid: boolean; detected: string | null } {
    const detected = detectMimeType(buffer);
    
    if (!detected) {
        return { valid: false, detected: null };
    }

    
    if (claimedType.startsWith('image/')) {
        const isImage = detected.startsWith('image/');
        
        if (claimedType === 'image/webp' && detected === 'image/webp') {
            return { valid: true, detected };
        }
        if (claimedType === 'image/svg+xml') {
            return { valid: false, detected };
        }
        return { valid: isImage, detected };
    }

    if (claimedType.startsWith('video/')) {
        const isVideo = detected.startsWith('video/');
        
        return { valid: isVideo || detected === 'image/webp' ? false : isVideo, detected };
    }

    return { valid: detected === claimedType, detected };
}

export function validateImageFile(buffer: Buffer, claimedType: string): { valid: boolean; error?: string } {
    if (!claimedType.startsWith('image/')) {
        return { valid: false, error: 'Claimed type is not an image' };
    }

    const result = validateFileMimeType(buffer, claimedType);
    
    if (!result.valid) {
        return { 
            valid: false, 
            error: `File content does not match claimed type. Claimed: ${claimedType}, Detected: ${result.detected || 'unknown'}` 
        };
    }

    return { valid: true };
}

/**
 * Memvalidasi file media (gambar atau video) yang diupload
 * Lebih toleran untuk file video karena beberapa format mungkin memiliki variasi
 * 
 * @param buffer - Buffer binary file media
 * @param claimedType - MIME type yang diklaim
 * @returns Object berisi status valid dan pesan error jika ada
 * 
 * @example
 * ```typescript
 * const result = validateMediaFile(fileBuffer, 'video/mp4');
 * if (result.valid) {
 *   console.log('File media valid!');
 * }
 * ```
 */
export function validateMediaFile(buffer: Buffer, claimedType: string): { valid: boolean; error?: string } {
    const result = validateFileMimeType(buffer, claimedType);
    
    if (!result.valid) {
        // For videos, be more lenient since MP4 ftyp detection can vary
        if (claimedType.startsWith('video/')) {
            // Check if it's at least some video format
            if (result.detected?.startsWith('video/')) {
                return { valid: true };
            }
            // Some MP4 files may not match exactly - allow if we detect ftyp at offset 4
            if (buffer.length > 8) {
                const ftypCheck = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
                if (ftypCheck && claimedType === 'video/mp4') {
                    return { valid: true };
                }
            }
        }
        return { 
            valid: false, 
            error: `File content does not match claimed type. Claimed: ${claimedType}, Detected: ${result.detected || 'unknown'}` 
        };
    }

    return { valid: true };
}
