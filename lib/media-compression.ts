/**
 * @file
 * 
 * File ini berisi fungsi-fungsi untuk kompresi media (gambar dan video) menggunakan sharp dan ffmpeg
 */

import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Tipe media yang didukung
 * @type MediaType
 */
export type MediaType = 'image' | 'video';

/**
 * Opsi untuk kompresi media
 * @interface MediaCompressionOptions
 */
export interface MediaCompressionOptions {
  /** Ukuran maksimum gambar dalam KB (default: 5) */
  maxSizeKB?: number;
  /** Kualitas gambar 0-100 (default: 70) */
  quality?: number;
  /** Ukuran maksimum video dalam MB (default: 50) */
  videoMaxSizeMB?: number;
  /** CRF video untuk encoding (default: 28, lower = better quality) */
  videoCRF?: number;
}

/**
 * Hasil kompresi media
 * @interface MediaCompressionResult
 */
export interface MediaCompressionResult {
  /** Buffer data yang sudah dikompresi */
  buffer: Buffer;
  /** Ukuran hasil kompresi dalam bytes */
  size: number;
  /** Tipe media (image atau video) */
  type: MediaType;
  /** MIME type hasil */
  mimeType: string;
  /** Lebar media dalam pixels (untuk image/video) */
  width?: number;
  /** Tinggi media dalam pixels (untuk image/video) */
  height?: number;
  /** Durasi video dalam seconds (untuk video) */
  duration?: number;
  /** Ukuran asli dalam bytes */
  originalSize: number;
  /** Persentase reduksi ukuran */
  compressionRatio: number;
}

/**
 * Mendeteksi tipe media dari MIME type
 * @param mimeType - MIME type dari file
 * @returns Tipe media (image atau video)
 * @throws {Error} Jika MIME type tidak didukung
 */
export function detectMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  throw new Error(`Unsupported media type: ${mimeType}`);
}

/**
 * Mengompresi gambar menggunakan sharp
 * @param input - Buffer gambar asli
 * @param options - Opsi kompresi (opsional)
 * @returns Hasil kompresi gambar
 * @throws {Error} Jika gagal mengompresi gambar
 */
async function compressImage(
  input: Buffer,
  options: MediaCompressionOptions = {}
): Promise<MediaCompressionResult> {
  const { maxSizeKB = 5, quality = 70 } = options;

  const originalSize = input.length;
  const metadata = await sharp(input).metadata();
  
  let targetWidth = Math.min(metadata.width || 1280, 1280);
  let targetHeight = Math.min(metadata.height || 720, 720);
  
  const maxSizeBytes = maxSizeKB * 1024;
  let currentQuality = quality;
  let outputBuffer: Buffer;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    outputBuffer = await sharp(input)
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: currentQuality, lossless: false })
      .toBuffer();

    if (outputBuffer.length > maxSizeBytes && currentQuality > 10 && attempts < maxAttempts) {
      currentQuality = Math.max(10, currentQuality - 10);
      attempts++;
    } else {
      break;
    }
  } while (true);

  if (outputBuffer.length > maxSizeBytes) {
    const scaleFactor = Math.sqrt(maxSizeBytes / outputBuffer.length);
    targetWidth = Math.round(targetWidth * scaleFactor);
    targetHeight = Math.round(targetHeight * scaleFactor);

    outputBuffer = await sharp(input)
      .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: currentQuality })
      .toBuffer();
  }

  const compressionRatio = (1 - outputBuffer.length / originalSize) * 100;

  return {
    buffer: outputBuffer,
    size: outputBuffer.length,
    type: 'image',
    mimeType: 'image/webp',
    width: targetWidth,
    height: targetHeight,
    originalSize,
    compressionRatio
  };
}

/**
 * Mengompresi video menggunakan ffmpeg
 * Fallback ke validasi saja jika ffmpeg tidak tersedia
 * @param input - Buffer video asli
 * @param options - Opsi kompresi (opsional)
 * @returns Hasil kompresi video atau data asli jika ffmpeg tidak tersedia
 * @throws {Error} Jika video terlalu besar dan ffmpeg tidak tersedia
 */
async function compressVideo(
  input: Buffer,
  options: MediaCompressionOptions = {}
): Promise<MediaCompressionResult> {
  const { videoMaxSizeMB = 50, videoCRF = 28 } = options;
  
  const originalSize = input.length;
  const maxSizeBytes = videoMaxSizeMB * 1024 * 1024;

  // Check if ffmpeg is available
  let ffmpegAvailable = false;
  try {
    await execAsync('which ffmpeg');
    ffmpegAvailable = true;
  } catch {
    console.warn('[VIDEO] ffmpeg not available, skipping compression');
  }

  if (!ffmpegAvailable) {
    // Just validate size and return original
    if (originalSize > maxSizeBytes) {
      throw new Error(`Video too large (${(originalSize / 1024 / 1024).toFixed(2)}MB). Max: ${videoMaxSizeMB}MB`);
    }

    return {
      buffer: input,
      size: input.length,
      type: 'video',
      mimeType: 'video/mp4',
      originalSize,
      compressionRatio: 0
    };
  }

  // Create temp files for processing
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-compress-'));
  const inputPath = path.join(tmpDir, 'input.mp4');
  const outputPath = path.join(tmpDir, 'output.mp4');

  try {
    // Write input buffer to temp file
    await fs.writeFile(inputPath, input);

    // Get video metadata
    const metadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
    const duration = metadata.format.duration;
    const width = videoStream?.width;
    const height = videoStream?.height;

    console.log(`[VIDEO] Original: ${width}x${height}, ${duration}s, ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

    // Compress video
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .size(`${Math.min(width, 1920)}x?`)
        .outputOptions([
          '-crf', String(videoCRF),
          '-preset', 'medium',
          '-movflags', '+faststart',
          '-maxrate', '5M',
          '-bufsize', '10M'
        ])
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Read compressed video
    const compressedBuffer = await fs.readFile(outputPath);
    const compressionRatio = (1 - compressedBuffer.length / originalSize) * 100;

    console.log(`[VIDEO] Compressed: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% reduction)`);

    // Check if still too large
    if (compressedBuffer.length > maxSizeBytes) {
      console.warn(`[VIDEO] Still larger than ${videoMaxSizeMB}MB after compression`);
    }

    return {
      buffer: compressedBuffer,
      size: compressedBuffer.length,
      type: 'video',
      mimeType: 'video/mp4',
      width: Math.min(width, 1920),
      height,
      duration,
      originalSize,
      compressionRatio
    };

  } finally {
    // Cleanup temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Mengompresi media berdasarkan tipe (image atau video)
 * @param input - Buffer media asli
 * @param mimeType - MIME type dari media
 * @param options - Opsi kompresi (opsional)
 * @returns Hasil kompresi media
 * @throws {Error} Jika MIME type tidak didukung atau kompresi gagal
 */
export async function compressMedia(
  input: Buffer,
  mimeType: string,
  options: MediaCompressionOptions = {}
): Promise<MediaCompressionResult> {
  const type = detectMediaType(mimeType);

  if (type === 'image') {
    return compressImage(input, options);
  } else {
    return compressVideo(input, options);
  }
}

/**
 * Memvalidasi file media
 * @param file - File yang akan divalidasi
 * @param options - Opsi validasi (opsional)
 * @param options.maxImageSizeMB - Ukuran maksimum gambar dalam MB (default: 10)
 * @param options.maxVideoSizeMB - Ukuran maksimum video dalam MB (default: 100)
 * @returns Object dengan status valid dan error message jika ada
 */
export function validateMedia(
  file: File,
  options: { maxImageSizeMB?: number; maxVideoSizeMB?: number } = {}
): { valid: boolean; error?: string } {
  const { maxImageSizeMB = 10, maxVideoSizeMB = 100 } = options;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    return { valid: false, error: 'Only image and video files are allowed' };
  }

  const maxSize = isImage ? maxImageSizeMB * 1024 * 1024 : maxVideoSizeMB * 1024 * 1024;

  if (file.size > maxSize) {
    const maxSizeMB = isImage ? maxImageSizeMB : maxVideoSizeMB;
    return { 
      valid: false, 
      error: `${isImage ? 'Image' : 'Video'} too large (max ${maxSizeMB}MB)` 
    };
  }

  return { valid: true };
}
