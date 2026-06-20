import 'server-only';

import { createHash } from 'crypto';
import { Readable } from 'stream';
import { google } from 'googleapis';

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

type DriveAuthClient =
  | InstanceType<typeof google.auth.JWT>
  | InstanceType<typeof google.auth.OAuth2>;

let driveAuthClient: DriveAuthClient | null = null;

function getGoogleDriveAuth(): DriveAuthClient {
  if (driveAuthClient) return driveAuthClient;

  const authMode = process.env.GOOGLE_DRIVE_AUTH_MODE || 'service_account';
  if (authMode === 'oauth') {
    const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing Google Drive OAuth credentials');
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    driveAuthClient = auth;
    return driveAuthClient;
  }

  if (authMode !== 'service_account') {
    throw new Error(`Unsupported GOOGLE_DRIVE_AUTH_MODE: ${authMode}`);
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google service account credentials');
  }

  driveAuthClient = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: DRIVE_SCOPES,
  });

  return driveAuthClient;
}

export function getGoogleDrive() {
  return google.drive({ version: 'v3', auth: getGoogleDriveAuth() });
}

export async function deleteDriveFile(fileId: string) {
  await getGoogleDrive().files.delete({
    fileId,
    supportsAllDrives: true,
  });
}

export async function downloadDriveFile(fileId: string) {
  const response = await getGoogleDrive().files.get(
    {
      fileId,
      alt: 'media',
      supportsAllDrives: true,
    },
    {
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export function sha256Hex(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function sanitizeDriveName(value: string, fallback: string) {
  const safe = value
    .replace(/[\\/:*?"<>|#%\u0000-\u001f]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  return safe || fallback;
}

function compactAppProperties(values: Record<string, string | null | undefined>) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([key, value]) => [key, String(value).slice(0, 124)])
  );
}

async function getOrCreateFolder(name: string, parentId: string, appProperties: Record<string, string>) {
  const drive = getGoogleDrive();
  const safeName = sanitizeDriveName(name, 'folder');
  const q = [
    `mimeType='${DRIVE_FOLDER_MIME}'`,
    `name='${escapeDriveQueryValue(safeName)}'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    'trashed=false',
  ].join(' and ');

  const existing = await drive.files.list({
    q,
    spaces: 'drive',
    fields: 'files(id,name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const first = existing.data.files?.[0];
  if (first?.id) return first.id;

  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [parentId],
      appProperties,
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!created.data.id) {
    throw new Error('Google Drive folder creation failed');
  }

  return created.data.id;
}

export interface UploadEvidenceToDriveInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  submissionId: string;
  stationCode?: string | null;
  reporterEmail?: string | null;
  userId?: string | null;
  kind: 'evidence' | 'document';
  appProperties?: Record<string, string | null | undefined>;
}

export interface UploadEvidenceToDriveResult {
  fileId: string;
  folderId: string;
  webViewLink: string;
  webContentLink: string | null;
  name: string;
}

export async function uploadEvidenceToDrive(input: UploadEvidenceToDriveInput): Promise<UploadEvidenceToDriveResult> {
  const rootFolderId = process.env.GOOGLE_DRIVE_EVIDENCE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('Missing GOOGLE_DRIVE_EVIDENCE_FOLDER_ID');
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const station = sanitizeDriveName(input.stationCode || 'UNKNOWN_STATION', 'UNKNOWN_STATION');
  const submission = sanitizeDriveName(input.submissionId, 'submission');
  const createSubfolders = process.env.GOOGLE_DRIVE_EVIDENCE_CREATE_SUBFOLDERS !== 'false';
  const baseProps = compactAppProperties({
    source: 'irrs',
    submission_id: input.submissionId,
    reporter_email_hash: input.reporterEmail
      ? createHash('sha256').update(input.reporterEmail.trim().toLowerCase()).digest('hex').slice(0, 32)
      : null,
    user_id: input.userId,
  });

  let folderId = rootFolderId;
  if (createSubfolders) {
    folderId = await getOrCreateFolder(yyyy, folderId, { ...baseProps, folder_level: 'year' });
    folderId = await getOrCreateFolder(mm, folderId, { ...baseProps, folder_level: 'month' });
    folderId = await getOrCreateFolder(station, folderId, { ...baseProps, folder_level: 'station' });
    folderId = await getOrCreateFolder(submission, folderId, { ...baseProps, folder_level: 'submission' });
  }

  const drive = getGoogleDrive();
  const safeName = sanitizeDriveName(input.originalName, `${Date.now()}-${input.kind}`);
  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [folderId],
      appProperties: compactAppProperties({
        ...baseProps,
        kind: input.kind,
        ...input.appProperties,
      }),
    },
    media: {
      mimeType: input.mimeType || 'application/octet-stream',
      body: Readable.from(input.buffer),
    },
    fields: 'id,name,webViewLink,webContentLink',
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  const webViewLink = created.data.webViewLink;
  if (!fileId || !webViewLink) {
    throw new Error('Google Drive upload failed');
  }

  return {
    fileId,
    folderId,
    webViewLink,
    webContentLink: created.data.webContentLink || null,
    name: created.data.name || safeName,
  };
}

export interface UploadDivisionDocumentToDriveInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  division: 'HC' | 'HT';
  category: string;
  title: string;
  userId: string;
}

export type UploadDivisionDocumentToDriveResult = UploadEvidenceToDriveResult;

export async function uploadDivisionDocumentToDrive(
  input: UploadDivisionDocumentToDriveInput
): Promise<UploadDivisionDocumentToDriveResult> {
  const rootFolderId = process.env.GOOGLE_DRIVE_DIVISION_DOCUMENTS_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('Missing GOOGLE_DRIVE_DIVISION_DOCUMENTS_FOLDER_ID');
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const division = sanitizeDriveName(input.division, 'division');
  const category = sanitizeDriveName(input.category, 'documents');
  const createSubfolders = process.env.GOOGLE_DRIVE_DIVISION_DOCUMENTS_CREATE_SUBFOLDERS !== 'false';
  const baseProps = compactAppProperties({
    source: 'irrs',
    module: 'division_documents',
    division: input.division,
    category: input.category,
    uploaded_by: input.userId,
  });

  let folderId = rootFolderId;
  if (createSubfolders) {
    folderId = await getOrCreateFolder(division, folderId, { ...baseProps, folder_level: 'division' });
    folderId = await getOrCreateFolder(year, folderId, { ...baseProps, folder_level: 'year' });
    folderId = await getOrCreateFolder(category, folderId, { ...baseProps, folder_level: 'category' });
  }

  const drive = getGoogleDrive();
  const safeName = sanitizeDriveName(input.originalName, `${Date.now()}-document`);
  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [folderId],
      appProperties: compactAppProperties({
        ...baseProps,
        title: input.title,
      }),
    },
    media: {
      mimeType: input.mimeType || 'application/octet-stream',
      body: Readable.from(input.buffer),
    },
    fields: 'id,name,webViewLink,webContentLink',
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  const webViewLink = created.data.webViewLink;
  if (!fileId || !webViewLink) {
    throw new Error('Google Drive document upload failed');
  }

  return {
    fileId,
    folderId,
    webViewLink,
    webContentLink: created.data.webContentLink || null,
    name: created.data.name || safeName,
  };
}
