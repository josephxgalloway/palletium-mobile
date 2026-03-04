/**
 * Direct-to-S3 upload helper for mobile.
 *
 * Flow:
 *   1. POST /api/uploads/init       → asset row + presigned PUT URL
 *   2. createUploadTask(PUT)        → binary upload straight to S3 (with byte-level progress)
 *   3. POST /api/uploads/:id/finalize → size validation via HeadObject
 *   4. POST /api/tracks              → create track from verified asset
 *
 * Audio bytes never touch Express — they go directly from the device to S3
 * via a time-limited presigned PUT URL.
 *
 * Idempotency: SHA-256 hash of (userId + filename + byteSize + purpose).
 * Pending upload state is persisted to SecureStore so a crash between init
 * and finalize can be resumed without creating orphaned S3 objects.
 *
 * Hardening:
 *   - Exponential backoff (1s, 2s, 4s) on network/5xx errors
 *   - No retry on 403 SignatureDoesNotMatch / AccessDenied (fatal → re-init)
 *   - TTL awareness: expired presign triggers re-init with same idempotency key
 *   - Real byte-level progress via createUploadTask
 *   - Dev-only [DIRECT_UPLOAD] logging (no secrets, sanitized XML)
 *   - Track creation idempotency via Idempotency-Key header
 *   - Single active upload concurrency guard
 *   - Non-retryable 4xx discrimination (clear pending on validation errors)
 */

import {
  createUploadTask,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

import api from '../api/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DirectUploadInput {
  fileUri: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  /** User ID (from auth store) — required for stable idempotency key */
  userId: number;
  title: string;
  genre: string;
  releaseDate: string;
  contentType: string; // 'original' | 'contains_samples' | 'cover' | 'remix'
  visibility?: string;
  generateIsrc?: boolean;
  rightsAcknowledgments?: Record<string, unknown>;
  /** Artwork image URI (optional — from ImagePicker) */
  artworkUri?: string;
}

export interface DirectUploadResult {
  trackId: number;
  audioAssetId: string;
}

export type UploadPhase =
  | 'resuming'     // Phase 0: checking for pending upload
  | 'preparing'    // Phase A: init call
  | 'uploading'    // Phase B: S3 PUT
  | 'finalizing'   // Phase C: finalize call
  | 'creating';    // Phase D: track creation

export interface UploadProgressCallback {
  (phase: UploadPhase, progress: number): void;
}

/**
 * Optional debug event callback for on-screen instrumentation.
 * Emits human-readable status strings at key pipeline milestones.
 * MUST NOT include auth tokens or full presigned URLs.
 */
export interface DebugEventCallback {
  (msg: string): void;
}

// ── Configuration ────────────────────────────────────────────────────────────

const MAX_PUT_RETRIES = 3;
const BACKOFF_BASE_MS = 1000; // 1s, 2s, 4s
const PENDING_UPLOAD_KEY = 'palletium-pending-upload';

/**
 * HTTP status codes that indicate non-retryable track creation failures.
 *
 * 401 is NOT included — the Axios client interceptor handles token refresh
 * and automatic retry. Clearing pending on 401 would force unnecessary re-upload.
 *
 * 403 IS included because it means "artist type check failed" or "upload cap",
 * not an auth issue. The user needs to fix their account, not re-upload.
 */
const NON_RETRYABLE_TRACK_STATUS = new Set([400, 403, 409, 422]);

// ── Concurrency guard ────────────────────────────────────────────────────────

let uploadInFlight = false;

let cryptoModule: any = null;
let cryptoUnavailableLogged = false;

// ── Dev logging ──────────────────────────────────────────────────────────────

function log(...args: unknown[]): void {
  if (__DEV__) {
    console.log('[DIRECT_UPLOAD]', ...args);
  }
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.substring(0, 40)}…`;
  } catch {
    return url.substring(0, 60) + '…';
  }
}

/**
 * Sanitize S3 XML error bodies for logging.
 * Strips verbose XML tags, keeps only the error Code and Message.
 */
function sanitizeS3Body(body: string): string {
  if (!body || body.length === 0) return '(empty)';
  // Extract S3 error code and message from XML
  const codeMatch = body.match(/<Code>([^<]+)<\/Code>/);
  const msgMatch = body.match(/<Message>([^<]+)<\/Message>/);
  if (codeMatch || msgMatch) {
    return `S3 ${codeMatch?.[1] || 'unknown'}: ${msgMatch?.[1] || 'no message'}`;
  }
  // Not XML — truncate raw body
  return body.substring(0, 120);
}

// ── Pending upload persistence ───────────────────────────────────────────────

interface PendingUpload {
  assetId: string;
  idempotencyKey: string;
  /** Timestamp of init — used to detect stale entries */
  initiatedAt: number;
}

async function loadPendingUpload(): Promise<PendingUpload | null> {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_UPLOAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingUpload;
    // Discard entries older than 24h (server rejects them anyway)
    if (Date.now() - parsed.initiatedAt > 24 * 60 * 60 * 1000) {
      log('Discarding stale pending upload (>24h)');
      await clearPendingUpload();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function savePendingUpload(pending: PendingUpload): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_UPLOAD_KEY, JSON.stringify(pending));
  } catch {
    // Non-fatal — worst case is a new asset on retry
  }
}

async function clearPendingUpload(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_UPLOAD_KEY);
  } catch {
    // Non-fatal
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * SHA-256 idempotency key: deterministic per user + file + purpose.
 * If the user picks the same file again after a crash, the backend returns
 * the existing asset (with a fresh presigned URL) instead of creating a new one.
 */
async function stableIdempotencyKey(
  userId: number,
  filename: string,
  byteSize: number,
): Promise<string> {
  const input = `${userId}:${filename}:${byteSize}:TRACK_AUDIO`;
  try {
    if (!cryptoModule) {
      cryptoModule = require('expo-crypto');
    }
    const hash = await cryptoModule.digestStringAsync(
      cryptoModule.CryptoDigestAlgorithm.SHA256,
      input,
    );
    return `mobile:${hash}`;
  } catch {
    // Expo Go / stale dev client can miss ExpoCrypto. Use deterministic JS hash
    // so route evaluation does not fail and idempotency remains stable.
    if (!cryptoUnavailableLogged) {
      cryptoUnavailableLogged = true;
      console.warn(
        '[DIRECT_UPLOAD] expo-crypto unavailable; using JS fallback hash for idempotency key',
      );
    }
    return `mobile:fallback:${fallbackHash(input)}`;
  }
}

function fallbackHash(input: string): string {
  let h1 = 5381;
  let h2 = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 << 5) + h1 + c) >>> 0; // djb2
    h2 = (c + (h2 << 6) + (h2 << 16) - h2) >>> 0; // sdbm
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * Extract a usable error message from an API error.
 */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const axiosErr = error as any;
    if (axiosErr.response?.data?.error) return axiosErr.response.data.error;
    if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
    if (axiosErr.message) return axiosErr.message;
  }
  return fallback;
}

/**
 * Extract HTTP status code from an Axios error, or null if not an HTTP error.
 */
function extractHttpStatus(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const status = (error as any).response?.status;
    if (typeof status === 'number') return status;
  }
  return null;
}

/**
 * Checks if an S3 error response indicates a fatal 403 that should NOT be retried.
 * SignatureDoesNotMatch or AccessDenied on a presigned PUT means the URL is
 * expired or invalid — retrying with the same URL will never succeed.
 */
function isFatal403(status: number, body: string): boolean {
  if (status !== 403) return false;
  return /SignatureDoesNotMatch|AccessDenied|Request has expired/i.test(body);
}

// ── Init helper (reusable for TTL re-init) ───────────────────────────────────

interface InitResult {
  assetId: string;
  presignedUrl: string;
}

async function initUpload(
  input: DirectUploadInput,
  idempotencyKey: string,
): Promise<InitResult> {
  log('Init →', input.filename, `(${(input.byteSize / 1048576).toFixed(1)} MB)`);

  const initRes = await api.post('/uploads/init', {
    filename: input.filename,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    purpose: 'TRACK_AUDIO',
    idempotencyKey,
  });

  const assetId = initRes.data.asset.id;
  const presignedUrl = initRes.data.presignedUrl;

  log('Init ← assetId:', assetId, 'url:', truncateUrl(presignedUrl));

  return { assetId, presignedUrl };
}

// ── Main pipeline ────────────────────────────────────────────────────────────

/**
 * Upload a track using the direct-to-S3 presigned URL pipeline.
 *
 * Supports resume: if the app crashed after init but before track creation,
 * the same file selection will reuse the existing asset via stable idempotency
 * and skip phases that already completed.
 *
 * Enforces single active upload — concurrent calls throw immediately.
 *
 * @param input      - File metadata + track metadata
 * @param onProgress - Optional callback for phase + progress updates
 * @returns          - The created track ID and asset ID
 * @throws           - On unrecoverable errors (with user-friendly message)
 */
export async function directUploadTrackAudio(
  input: DirectUploadInput,
  onProgress?: UploadProgressCallback,
  onDebugEvent?: DebugEventCallback,
): Promise<DirectUploadResult> {
  // ── Concurrency guard ──────────────────────────────────────────────────
  if (uploadInFlight) {
    throw new Error('An upload is already in progress. Please wait for it to complete.');
  }
  uploadInFlight = true;

  try {
    return await executeUploadPipeline(input, onProgress, onDebugEvent);
  } finally {
    uploadInFlight = false;
  }
}

/**
 * Check if there is a pending upload that can be resumed.
 * Callers can use this to present "Resume existing upload?" UI.
 */
export async function hasPendingUpload(): Promise<boolean> {
  const pending = await loadPendingUpload();
  return pending !== null;
}

/**
 * Discard a pending upload so the user can start fresh.
 */
export async function discardPendingUpload(): Promise<void> {
  log('User discarded pending upload');
  await clearPendingUpload();
}

/**
 * Returns true if an upload is currently in progress.
 */
export function isUploadInProgress(): boolean {
  return uploadInFlight;
}

// ── Pipeline implementation (wrapped by concurrency guard) ───────────────────

async function executeUploadPipeline(
  input: DirectUploadInput,
  onProgress?: UploadProgressCallback,
  onDebugEvent?: DebugEventCallback,
): Promise<DirectUploadResult> {
  const idempotencyKey = await stableIdempotencyKey(
    input.userId,
    input.filename,
    input.byteSize,
  );
  log('Pipeline start — key:', idempotencyKey.substring(0, 20) + '…');

  const dbg = onDebugEvent;
  dbg?.(`Pipeline start: ${input.filename} (${(input.byteSize / 1048576).toFixed(1)} MB)`);

  let assetId: string;
  let presignedUrl: string;
  let skipPut = false;

  // ── Resume check ───────────────────────────────────────────────────────
  dbg?.('Resume check: loading pending upload...');
  const pending = await loadPendingUpload();

  if (pending && pending.idempotencyKey === idempotencyKey) {
    onProgress?.('resuming', 0);
    log('Found pending upload — assetId:', pending.assetId);
    dbg?.(`Found pending upload: asset=${pending.assetId.substring(0, 12)}...`);

    try {
      const statusRes = await api.get(`/uploads/${pending.assetId}`);
      const status: string = statusRes.data.asset?.status ?? statusRes.data.status;
      log('Pending asset status:', status);
      dbg?.(`Pending asset status: ${status}`);

      if (status === 'UPLOADED') {
        assetId = pending.assetId;
        presignedUrl = '';
        skipPut = true;
        log('Asset already UPLOADED — skipping to track creation');
        dbg?.('Asset UPLOADED — skipping to track creation');
      } else if (status === 'INITIATED' || status === 'UPLOADING') {
        assetId = pending.assetId;
        presignedUrl = '';
        log('Asset', status, '— will re-init for fresh presigned URL');
        dbg?.(`Asset ${status} — will re-init`);
      } else {
        log('Asset in terminal state:', status, '— starting fresh');
        dbg?.(`Asset terminal (${status}) — starting fresh`);
        await clearPendingUpload();
      }
    } catch {
      log('Status check failed — starting fresh');
      dbg?.('Resume check failed — starting fresh');
      await clearPendingUpload();
    }

    onProgress?.('resuming', 100);
  } else {
    dbg?.('No pending upload found — fresh start');
  }

  // ── Phase A: Init ──────────────────────────────────────────────────────
  if (!skipPut) {
    onProgress?.('preparing', 0);
    dbg?.('Phase A: Init — requesting presigned URL...');

    try {
      const result = await initUpload(input, idempotencyKey);
      assetId = result.assetId;
      presignedUrl = result.presignedUrl;

      await savePendingUpload({
        assetId,
        idempotencyKey,
        initiatedAt: Date.now(),
      });
      dbg?.(`Init success: asset=${assetId.substring(0, 12)}...`);
    } catch (error) {
      dbg?.(`Init FAILED: ${extractErrorMessage(error, 'unknown')}`);
      throw new Error(
        extractErrorMessage(error, 'Failed to prepare upload — please try again'),
      );
    }

    onProgress?.('preparing', 100);

    // ── Phase B: Upload to S3 (with retry + TTL re-init) ──────────────
    onProgress?.('uploading', 0);
    dbg?.('Phase B: PUT to S3 starting...');

    let uploadSucceeded = false;
    let lastUploadError: unknown;
    let lastReportedMilestone = 0;

    for (let attempt = 0; attempt <= MAX_PUT_RETRIES; attempt++) {
      log(`PUT attempt ${attempt + 1}/${MAX_PUT_RETRIES + 1}`);
      dbg?.(`PUT attempt ${attempt + 1}/${MAX_PUT_RETRIES + 1}`);

      try {
        const task = createUploadTask(
          presignedUrl!,
          input.fileUri,
          {
            httpMethod: 'PUT',
            uploadType: FileSystemUploadType.BINARY_CONTENT,
            headers: {
              'Content-Type': input.mimeType,
            },
          },
          (data) => {
            if (data.totalBytesExpectedToSend > 0) {
              const pct = Math.round(
                (data.totalBytesSent / data.totalBytesExpectedToSend) * 100,
              );
              onProgress?.('uploading', pct);
              // Report progress at 25% milestones
              const milestone = Math.floor(pct / 25) * 25;
              if (milestone > lastReportedMilestone && milestone > 0) {
                lastReportedMilestone = milestone;
                dbg?.(`PUT progress: ${pct}% (${(data.totalBytesSent / 1048576).toFixed(1)} MB sent)`);
              }
            }
          },
        );

        const uploadResult = await task.uploadAsync();

        if (!uploadResult) {
          lastUploadError = new Error('Upload task returned no result');
          log('PUT returned null/undefined result');
          dbg?.('PUT returned no result');
        } else if (uploadResult.status >= 200 && uploadResult.status < 300) {
          uploadSucceeded = true;
          log('PUT succeeded — HTTP', uploadResult.status);
          dbg?.(`PUT success: HTTP ${uploadResult.status}`);
          break;
        } else if (isFatal403(uploadResult.status, uploadResult.body)) {
          log('PUT got fatal 403 —', sanitizeS3Body(uploadResult.body));
          dbg?.(`PUT fatal 403 — re-init for fresh URL`);

          // TTL awareness: re-init with same idempotency key for a fresh URL
          try {
            log('Re-init for fresh presigned URL');
            const refreshed = await initUpload(input, idempotencyKey);
            assetId = refreshed.assetId;
            presignedUrl = refreshed.presignedUrl;

            await savePendingUpload({
              assetId,
              idempotencyKey,
              initiatedAt: Date.now(),
            });
            dbg?.('Re-init success — retrying PUT');

            // Don't count this as a retry — continue loop with fresh URL
            continue;
          } catch (reinitError) {
            lastUploadError = reinitError;
            log('Re-init failed:', extractErrorMessage(reinitError, 'unknown'));
            dbg?.(`Re-init FAILED: ${extractErrorMessage(reinitError, 'unknown')}`);
            break;
          }
        } else {
          lastUploadError = new Error(
            `S3 upload returned HTTP ${uploadResult.status}`,
          );
          log('PUT failed — HTTP', uploadResult.status, sanitizeS3Body(uploadResult.body));
          dbg?.(`PUT failed: HTTP ${uploadResult.status}`);
        }
      } catch (error) {
        lastUploadError = error;
        log('PUT threw:', extractErrorMessage(error, 'unknown'));
        dbg?.(`PUT exception: ${extractErrorMessage(error, 'unknown')}`);
      }

      // Retry with exponential backoff (skip delay after last attempt)
      if (attempt < MAX_PUT_RETRIES) {
        const delayMs = BACKOFF_BASE_MS * Math.pow(2, attempt); // 1s, 2s, 4s
        log(`Retrying in ${delayMs}ms…`);
        await sleep(delayMs);
      }
    }

    if (!uploadSucceeded) {
      log('All PUT attempts exhausted — aborting asset');
      dbg?.('All PUT attempts exhausted — aborting');
      try {
        await api.post(`/uploads/${assetId!}/abort`);
      } catch {
        // Best-effort abort — don't mask the real error
      }
      await clearPendingUpload();
      throw new Error(
        extractErrorMessage(
          lastUploadError,
          'Upload to storage failed — check your connection and try again',
        ),
      );
    }

    onProgress?.('uploading', 100);

    // ── Phase C: Finalize ────────────────────────────────────────────────
    onProgress?.('finalizing', 0);
    log('Finalize → assetId:', assetId!);
    dbg?.('Phase C: Finalize — verifying upload...');

    try {
      await api.post(`/uploads/${assetId!}/finalize`);
      log('Finalize ← success');
      dbg?.('Finalize success');
    } catch (error) {
      dbg?.(`Finalize FAILED: ${extractErrorMessage(error, 'unknown')}`);
      // Don't clear pending — finalize can be retried on the same asset
      throw new Error(
        extractErrorMessage(error, 'Upload verification failed — please try again'),
      );
    }

    onProgress?.('finalizing', 100);
  }

  // ── Phase D: Create track ──────────────────────────────────────────────
  onProgress?.('creating', 0);
  log('Creating track from asset:', assetId!);
  dbg?.('Phase D: Create track — sending metadata...');

  try {
    const formData = new FormData();
    formData.append('audioAssetId', assetId!);
    formData.append('title', input.title);
    formData.append('genre', input.genre);
    formData.append('releaseDate', input.releaseDate);
    formData.append('contentType', input.contentType);
    formData.append('generateIsrc', input.generateIsrc !== false ? 'true' : 'false');

    if (input.visibility) {
      formData.append('visibility', input.visibility);
    }

    if (input.rightsAcknowledgments) {
      formData.append(
        'rightsAcknowledgments',
        JSON.stringify(input.rightsAcknowledgments),
      );
    }

    if (input.artworkUri) {
      const artworkFilename = input.artworkUri.split('/').pop() || 'artwork.jpg';
      const artworkType = artworkFilename.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';
      formData.append('artwork', {
        uri: input.artworkUri,
        type: artworkType,
        name: artworkFilename,
      } as any);
    }

    // Authorization header is set by the Axios request interceptor (client.ts).
    // Do NOT manually set it here — that prevents the 401 retry interceptor
    // from injecting the refreshed token on automatic retry.
    const trackRes = await api.post('/tracks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': `track:${idempotencyKey}`,
      },
      timeout: 60_000,
    });

    const trackId =
      trackRes.data.track?.id ?? trackRes.data.id ?? trackRes.data.trackId;

    if (!trackId) {
      dbg?.('Track created but no ID in response');
      throw new Error('Track created but no ID returned');
    }

    await clearPendingUpload();

    onProgress?.('creating', 100);
    log('Track created — id:', trackId);
    dbg?.(`Track created: id=${trackId}`);

    return {
      trackId,
      audioAssetId: assetId!,
    };
  } catch (error) {
    const status = extractHttpStatus(error);
    log('Track creation failed — HTTP', status ?? 'network');
    dbg?.(`Track creation FAILED: HTTP ${status ?? 'network'} — ${extractErrorMessage(error, 'unknown')}`);

    if (status !== null && NON_RETRYABLE_TRACK_STATUS.has(status)) {
      // Non-retryable: validation error, auth issue, or duplicate.
      // Clear pending so the user isn't stuck in a dead retry loop.
      // The audio is already in S3 — they can fix metadata and re-create.
      log('Non-retryable', status, '— clearing pending upload');
      dbg?.(`Non-retryable ${status} — clearing pending`);
      await clearPendingUpload();
      throw new Error(
        extractErrorMessage(error, 'Track creation failed — please check your track details and try again'),
      );
    }

    // Retryable (5xx, network timeout): keep pending so next attempt
    // skips upload and goes straight to track creation.
    throw new Error(
      extractErrorMessage(error, 'Track creation failed — your audio is saved, please try again'),
    );
  }
}

/**
 * Returns human-readable status text for each upload phase.
 */
export function getPhaseLabel(phase: UploadPhase): string {
  switch (phase) {
    case 'resuming':
      return 'Resuming previous upload\u2026';
    case 'preparing':
      return 'Preparing upload\u2026';
    case 'uploading':
      return 'Uploading audio to storage\u2026';
    case 'finalizing':
      return 'Finalizing\u2026';
    case 'creating':
      return 'Creating track\u2026';
  }
}
