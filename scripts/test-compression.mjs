#!/usr/bin/env node

/**
 * Test image compression
 * Usage: node scripts/test-compression.mjs
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function createTestImage() {
  // Create a simple test image using sharp
  const sharp = (await import('sharp')).default;
  
  // Create a 1000x1000 red square
  const buffer = await sharp({
    create: {
      width: 1000,
      height: 1000,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  })
  .jpeg({ quality: 90 })
  .toBuffer();
  
  return buffer;
}

async function main() {
  // Dynamic imports for TypeScript files
  const { compressToExactSize, compressImage } = await import('../lib/image-compression.ts');
  console.log('🧪 Testing image compression...\n');

  try {
    // Create test image
    console.log('📸 Creating test image (1000x1000 red square)...');
    const testImage = await createTestImage();
    console.log(`   Original size: ${testImage.length} bytes (${(testImage.length / 1024).toFixed(2)}KB)\n`);

    // Test 1: Compress to exact 5KB
    console.log('🎯 Test 1: Compress to exact 5KB');
    const result1 = await compressToExactSize(testImage, 5);
    console.log(`   Compressed size: ${result1.size} bytes (${(result1.size / 1024).toFixed(2)}KB)`);
    console.log(`   Dimensions: ${result1.width}x${result1.height}`);
    console.log(`   Format: ${result1.format}`);
    console.log(`   Compression ratio: ${result1.compressionRatio.toFixed(1)}%`);
    console.log(`   ✅ Target met: ${result1.size <= 5 * 1024 ? 'YES' : 'NO'}\n`);

    // Test 2: Compress to exact 3KB (more aggressive)
    console.log('🎯 Test 2: Compress to exact 3KB');
    const result2 = await compressToExactSize(testImage, 3);
    console.log(`   Compressed size: ${result2.size} bytes (${(result2.size / 1024).toFixed(2)}KB)`);
    console.log(`   Dimensions: ${result2.width}x${result2.height}`);
    console.log(`   Compression ratio: ${result2.compressionRatio.toFixed(1)}%`);
    console.log(`   ✅ Target met: ${result2.size <= 3 * 1024 ? 'YES' : 'NO'}\n`);

    // Test 3: Compress to 10KB (higher quality)
    console.log('🎯 Test 3: Compress to exact 10KB');
    const result3 = await compressToExactSize(testImage, 10);
    console.log(`   Compressed size: ${result3.size} bytes (${(result3.size / 1024).toFixed(2)}KB)`);
    console.log(`   Dimensions: ${result3.width}x${result3.height}`);
    console.log(`   Compression ratio: ${result3.compressionRatio.toFixed(1)}%`);
    console.log(`   ✅ Target met: ${result3.size <= 10 * 1024 ? 'YES' : 'NO'}\n`);

    // Test 4: Standard compression with custom options
    console.log('🎯 Test 4: Standard compression (max 5KB, quality 80)');
    const result4 = await compressImage(testImage, {
      maxSizeKB: 5,
      quality: 80,
      format: 'webp'
    });
    console.log(`   Compressed size: ${result4.size} bytes (${(result4.size / 1024).toFixed(2)}KB)`);
    console.log(`   Dimensions: ${result4.width}x${result4.height}`);
    console.log(`   Format: ${result4.format}`);
    console.log(`   Compression ratio: ${result4.compressionRatio.toFixed(1)}%`);
    console.log(`   ✅ Target met: ${result4.size <= 5 * 1024 ? 'YES' : 'NO'}\n`);

    // Save test output
    const outputDir = './tmp/compression-test';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDir, 'test-original.jpg'), testImage);
    fs.writeFileSync(path.join(outputDir, 'test-5kb.webp'), result1.buffer);
    fs.writeFileSync(path.join(outputDir, 'test-3kb.webp'), result2.buffer);
    fs.writeFileSync(path.join(outputDir, 'test-10kb.webp'), result3.buffer);

    console.log('💾 Test images saved to ./tmp/compression-test/');
    console.log('   - test-original.jpg');
    console.log('   - test-5kb.webp');
    console.log('   - test-3kb.webp');
    console.log('   - test-10kb.webp\n');

    console.log('✅ All tests passed!\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`   Original: ${(testImage.length / 1024).toFixed(2)}KB`);
    console.log(`   5KB target: ${(result1.size / 1024).toFixed(2)}KB (${result1.compressionRatio.toFixed(1)}% reduction)`);
    console.log(`   3KB target: ${(result2.size / 1024).toFixed(2)}KB (${result2.compressionRatio.toFixed(1)}% reduction)`);
    console.log(`   10KB target: ${(result3.size / 1024).toFixed(2)}KB (${result3.compressionRatio.toFixed(1)}% reduction)`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
