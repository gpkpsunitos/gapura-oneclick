'use client';

import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

interface QRCodeWithLogoProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  logoSize?: number;
  className?: string;
}

/**
 * QR Code component with Gapura logo embedded in the center.
 *
 * Uses 'H' (High) error correction level by default to ensure
 * the QR code remains scannable even with the logo overlay.
 */
export function QRCodeWithLogo({
  value,
  size = 156,
  fgColor = '#0ea5a6',
  bgColor = '#ffffff',
  level = 'H',
  logoSize,
  className,
}: QRCodeWithLogoProps) {
  // Calculate logo size as percentage of QR code size (default ~25%)
  const actualLogoSize = logoSize || Math.floor(size * 0.25);

  return (
    <div className={className}>
      <QRCodeSVG
        value={value}
        size={size}
        fgColor={fgColor}
        bgColor={bgColor}
        level={level}
        imageSettings={{
          src: '/logo.png',
          x: undefined, // Centered automatically
          y: undefined, // Centered automatically
          height: actualLogoSize,
          width: actualLogoSize,
          excavate: true, // Creates a white background around the logo
        }}
      />
    </div>
  );
}

export default QRCodeWithLogo;
