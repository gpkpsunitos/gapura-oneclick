
import sharp from 'sharp';

export interface CompressionOptions {

  maxSizeKB?: number;

  quality?: number;

  width?: number;

  height?: number;

  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {

  buffer: Buffer;

  size: number;

  format: string;

  width: number;

  height: number;

  originalSize: number;

  compressionRatio: number;
}

export async function compressImage(
  input: Buffer | ArrayBuffer,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxSizeKB = 5,
    quality = 80,
    width,
    height,
    format = 'jpeg'
  } = options;

  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const originalSize = inputBuffer.length;

  let image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  let targetWidth = width || originalWidth;
  let targetHeight = height || originalHeight;

  if (originalWidth > 1920 || originalHeight > 1080) {
    const ratio = Math.min(1920 / originalWidth, 1080 / originalHeight);
    targetWidth = Math.round(originalWidth * ratio);
    targetHeight = Math.round(originalHeight * ratio);
  }

  if (width || height) {
    targetWidth = width || Math.round(originalWidth * (height! / originalHeight));
    targetHeight = height || Math.round(originalHeight * (width! / originalWidth));
  }

  const maxSizeBytes = maxSizeKB * 1024;
  let currentQuality = quality;
  let outputBuffer: Buffer;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    image = sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });

    switch (format) {
      case 'jpeg':
        image = image.jpeg({ 
          quality: currentQuality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        image = image.png({ 
          compressionLevel: 9,
          progressive: true
        });
        break;
      case 'webp':
        image = image.webp({ 
          quality: currentQuality,
          lossless: false
        });
        break;
    }

    outputBuffer = await image.toBuffer();

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

    image = sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });

    switch (format) {
      case 'jpeg':
        image = image.jpeg({ quality: currentQuality, progressive: true, mozjpeg: true });
        break;
      case 'png':
        image = image.png({ compressionLevel: 9, progressive: true });
        break;
      case 'webp':
        image = image.webp({ quality: currentQuality, lossless: false });
        break;
    }

    outputBuffer = await image.toBuffer();
  }

  const compressionRatio = (1 - outputBuffer.length / originalSize) * 100;

  return {
    buffer: outputBuffer,
    size: outputBuffer.length,
    format,
    width: targetWidth,
    height: targetHeight,
    originalSize,
    compressionRatio
  };
}

export async function compressToExactSize(
  input: Buffer | ArrayBuffer,
  targetSizeKB: number = 5
): Promise<CompressionResult> {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const originalSize = inputBuffer.length;

  let metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch (error) {
    throw new Error('Invalid image format');
  }

  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  let targetWidth = Math.min(originalWidth, 1280);
  let targetHeight = Math.min(originalHeight, 720);

  const targetSizeBytes = targetSizeKB * 1024;
  let outputBuffer: Buffer;
  let quality = 70;

  outputBuffer = await sharp(inputBuffer)
    .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  let attempts = 0;
  while (outputBuffer.length > targetSizeBytes && attempts < 15) {
    attempts++;

    if (quality > 10) {
      quality -= 10;
    } else {

      targetWidth = Math.round(targetWidth * 0.8);
      targetHeight = Math.round(targetHeight * 0.8);
    }

    outputBuffer = await sharp(inputBuffer)
      .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  }

  const compressionRatio = (1 - outputBuffer.length / originalSize) * 100;

  return {
    buffer: outputBuffer,
    size: outputBuffer.length,
    format: 'webp',
    width: targetWidth,
    height: targetHeight,
    originalSize,
    compressionRatio
  };
}

export function getOptimalFormat(mimeType: string): 'jpeg' | 'png' | 'webp' {
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('png')) return 'png';
  return 'jpeg';
}
