/**
 * @file
 * Route handler untuk menyajikan Digital Asset Links (assetlinks.json).
 *
 * File ini diperlukan oleh Google Play Protect untuk memverifikasi
 * kepemilikan aplikasi TWA (Trusted Web Activity) terhadap domain web.
 *
 * CATATAN: Ganti SHA256 fingerprint di public/.well-known/assetlinks.json
 * dengan fingerprint signing key aplikasi Android Anda.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const data = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.gapura.oneclick.twa",
        sha256_cert_fingerprints: [
          "PLACEHOLDER:REPLACE_WITH_YOUR_SIGNING_KEY_SHA256_FINGERPRINT",
        ],
      },
    },
  ];

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
