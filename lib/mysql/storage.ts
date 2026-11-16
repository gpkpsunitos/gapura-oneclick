import { createHmac, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export function getLocalStorageRoot(): string {
  return path.resolve(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'storage'));
}

function getSigningSecret(): string {
  return process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || 'local-dev-storage-secret';
}

export function resolveSafeStoragePath(bucket: string, objectPath: string): string {
  const safeBucket = bucket.replace(/[^a-zA-Z0-9._-]/g, '_');
  const root = path.resolve(getLocalStorageRoot(), safeBucket);
  const cleanRel = objectPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg !== '' && seg !== '.' && seg !== '..')
    .join('/');
  const resolved = path.resolve(root, cleanRel);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error('Invalid storage path');
  }
  return resolved;
}

export function signStorageUrlToken(bucket: string, objectPath: string, expiresAtEpochSec: number): string {
  const payload = `${bucket}:${objectPath}:${expiresAtEpochSec}`;
  return createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
}

export function verifyStorageUrlToken(
  bucket: string,
  objectPath: string,
  expRaw: string | null,
  sigRaw: string | null,
): boolean {
  if (!expRaw || !sigRaw) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = signStorageUrlToken(bucket, objectPath, exp);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sigRaw, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function buildPublicPath(bucket: string, objectPath: string): string {
  const encodedBucket = encodeURIComponent(bucket);
  const encodedSegments = objectPath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  return `${baseUrl}/api/storage/${encodedBucket}/${encodedSegments}`;
}

export function createLocalStorageBucket(bucket: string) {
  return {
    async upload(
      objectPath: string,
      fileBody: Buffer | Uint8Array | ArrayBuffer | Blob | string,
      _options?: { contentType?: string; upsert?: boolean; cacheControl?: string },
    ): Promise<{ data: { path: string } | null; error: { message: string } | null }> {
      try {
        const dest = resolveSafeStoragePath(bucket, objectPath);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        let buf: Buffer;
        if (Buffer.isBuffer(fileBody)) {
          buf = fileBody;
        } else if (fileBody instanceof Uint8Array) {
          buf = Buffer.from(fileBody);
        } else if (fileBody instanceof ArrayBuffer) {
          buf = Buffer.from(fileBody);
        } else if (typeof fileBody === 'string') {
          buf = Buffer.from(fileBody, 'utf8');
        } else {
          buf = Buffer.from(await fileBody.arrayBuffer());
        }
        await fs.writeFile(dest, buf);
        return { data: { path: objectPath }, error: null };
      } catch (err: unknown) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'Storage upload failed' },
        };
      }
    },

    async download(
      objectPath: string,
    ): Promise<{ data: Blob | null; error: { message: string } | null }> {
      try {
        const src = resolveSafeStoragePath(bucket, objectPath);
        const buf = await fs.readFile(src);
        return { data: new Blob([buf]), error: null };
      } catch (err: unknown) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'Storage download failed' },
        };
      }
    },

    async remove(
      paths: string[],
    ): Promise<{ data: Array<{ name: string }> | null; error: { message: string } | null }> {
      try {
        const removed: Array<{ name: string }> = [];
        for (const p of paths) {
          const target = resolveSafeStoragePath(bucket, p);
          try {
            await fs.unlink(target);
            removed.push({ name: p });
          } catch (e: unknown) {
            if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') throw e;
          }
        }
        return { data: removed, error: null };
      } catch (err: unknown) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'Storage remove failed' },
        };
      }
    },

    getPublicUrl(objectPath: string): { data: { publicUrl: string } } {
      return { data: { publicUrl: buildPublicPath(bucket, objectPath) } };
    },

    async createSignedUrl(
      objectPath: string,
      expiresInSeconds = 3600,
    ): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }> {
      const exp = Math.floor(Date.now() / 1000) + Math.max(1, Math.floor(expiresInSeconds));
      const sig = signStorageUrlToken(bucket, objectPath, exp);
      const url = `${buildPublicPath(bucket, objectPath)}?exp=${exp}&sig=${sig}`;
      return { data: { signedUrl: url }, error: null };
    },
  };
}
