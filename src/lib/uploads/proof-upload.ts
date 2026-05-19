import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type ProofUploadType = "QUOTE_SCREENSHOT" | "FINAL_RECEIPT" | "METER_PROOF";

export type ProofUploadProvider = "MOCK" | "SUPABASE_STORAGE" | "SUPABASE_STORAGE_FUTURE";

export type ProofUploadFile = Pick<File, "name" | "type" | "size">;

export type ProofUploadInput = {
  rideInstanceId: string;
  proofType: ProofUploadType;
  file?: ProofUploadFile | null;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

export type ProofUploadResult = {
  fileUrl: string;
  storagePath: string;
  bucketId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  provider: ProofUploadProvider;
  checksum?: string;
};

export type NormalizedProofStoragePath =
  | {
      kind: "storage";
      bucketId: string;
      storagePath: string;
      needsSignedUrl: true;
    }
  | {
      kind: "mock";
      mockUrl: string;
      needsSignedUrl: false;
    };

export type ProofSignedUrlInput = {
  storagePath?: string | null;
  expiresInSeconds?: number;
  bucketId?: string;
};

export type ProofSignedUrlResult =
  | {
      ok: true;
      signedUrl: string;
      expiresAt: string;
      storagePath: string;
      bucketId: string;
    }
  | {
      ok: false;
      signedUrl: null;
      expiresAt: null;
      storagePath: string | null;
      bucketId: string;
      error: string;
      developerError?: string;
    };

export type ProofUploadOptions = {
  provider?: ProofUploadProvider;
};

export type OrphanProofFileCleanupInput = {
  bucketId?: string;
  storagePath?: string | null;
  reason: string;
  proofType?: ProofUploadType;
  rideInstanceId?: string;
};

export type OrphanProofFileCleanupResult = {
  cleanupAttempted: boolean;
  cleanupSucceeded: boolean;
  cleanupSkipped: boolean;
  reason: string;
};

const maxProofUploadSizeBytes = 10 * 1024 * 1024;
const ridePodProofsBucketId = "ridepod-proofs";
const defaultProofSignedUrlExpiresInSeconds = 300;
const maxProofSignedUrlExpiresInSeconds = 3600;
const proofSignedUrlErrorMessage = "Couldn't open proof preview. Try again later.";
const allowedProofUploadContentTypes = new Set(["image/png", "image/jpeg", "image/jpg", "application/pdf"]);

function safeProofFileName(fileName: string) {
  const trimmedFileName = fileName.trim() || "proof";
  return trimmedFileName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function proofUploadTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:]/g, "-");
}

function isSupabaseStorageUploadEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NEXT_PUBLIC_RIDEPOD_USE_SUPABASE_STORAGE === "true";
}

function hasSupabasePublicEnv(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function isUnsafeProofStorageCleanupPath(storagePath?: string | null) {
  const value = storagePath?.trim();

  return (
    !value ||
    value.startsWith("mock://") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.includes("..") ||
    !value.startsWith("ride-instances/")
  );
}

export async function cleanupOrphanProofFile(
  input: OrphanProofFileCleanupInput,
): Promise<OrphanProofFileCleanupResult> {
  const bucketId = input.bucketId || ridePodProofsBucketId;

  if (isUnsafeProofStorageCleanupPath(input.storagePath)) {
    return {
      cleanupAttempted: false,
      cleanupSucceeded: false,
      cleanupSkipped: true,
      reason: "Storage cleanup is not enabled yet.",
    };
  }

  void bucketId;
  // TODO SQL-2O-F: enable guarded Supabase Storage API remove() only after delete policy and retention rules are approved.
  return {
    cleanupAttempted: false,
    cleanupSucceeded: false,
    cleanupSkipped: true,
    reason: "Storage cleanup is not enabled yet.",
  };
}

export function normalizeProofStoragePath(fileUrlOrStoragePath?: string | null): NormalizedProofStoragePath | null {
  const value = fileUrlOrStoragePath?.trim();

  if (!value) return null;

  if (value.startsWith("mock://")) {
    return {
      kind: "mock",
      mockUrl: value,
      needsSignedUrl: false,
    };
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return null;
  }

  const storagePrefix = `storage://${ridePodProofsBucketId}/`;
  const storagePath = value.startsWith(storagePrefix) ? value.slice(storagePrefix.length) : value;

  if (!storagePath.startsWith("ride-instances/")) {
    return null;
  }

  return {
    kind: "storage",
    bucketId: ridePodProofsBucketId,
    storagePath,
    needsSignedUrl: true,
  };
}

export function getProofSignedUrlExpiresInSeconds(expiresInSeconds = defaultProofSignedUrlExpiresInSeconds) {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return defaultProofSignedUrlExpiresInSeconds;
  }

  return Math.min(Math.floor(expiresInSeconds), maxProofSignedUrlExpiresInSeconds);
}

function proofSignedUrlError(
  input: ProofSignedUrlInput,
  developerError?: string,
): Extract<ProofSignedUrlResult, { ok: false }> {
  return {
    ok: false,
    signedUrl: null,
    expiresAt: null,
    storagePath: input.storagePath?.trim() || null,
    bucketId: input.bucketId || ridePodProofsBucketId,
    error: proofSignedUrlErrorMessage,
    developerError,
  };
}

export async function createProofSignedUrl(input: ProofSignedUrlInput): Promise<ProofSignedUrlResult> {
  const normalized = normalizeProofStoragePath(input.storagePath);

  if (!input.storagePath?.trim()) {
    return proofSignedUrlError(input, "Missing storage path.");
  }

  if (!normalized || normalized.kind !== "storage") {
    return proofSignedUrlError(input, "Only private RidePod proof storage paths can be signed.");
  }

  if (!hasSupabasePublicEnv()) {
    return proofSignedUrlError(input, "Supabase is not configured.");
  }

  const bucketId = input.bucketId || normalized.bucketId;
  const expiresInSeconds = getProofSignedUrlExpiresInSeconds(input.expiresInSeconds);

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.storage
      .from(bucketId)
      .createSignedUrl(normalized.storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return proofSignedUrlError(input, error?.message || "Signed URL was not returned.");
    }

    return {
      ok: true,
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      storagePath: normalized.storagePath,
      bucketId,
    };
  } catch (error) {
    return proofSignedUrlError(input, error instanceof Error ? error.message : "Signed URL request failed.");
  }
}

export function buildProofStoragePath(input: ProofUploadInput, date = new Date()) {
  validateProofUploadFile(input);

  const fileName = safeProofFileName(input.fileName || input.file?.name || "proof");
  return {
    fileName,
    storagePath: `ride-instances/${input.rideInstanceId}/${input.proofType}/${proofUploadTimestamp(date)}-${fileName}`,
  };
}

export function validateProofUploadFile(input: ProofUploadInput) {
  if (!input.rideInstanceId) throw new Error("Ride instance is required.");
  if (!input.proofType) throw new Error("Proof type is required.");
  if (!input.file) throw new Error("Upload a PNG, JPG, or PDF file.");

  const contentType = input.contentType || input.file.type;
  const sizeBytes = input.sizeBytes ?? input.file.size;

  if (!allowedProofUploadContentTypes.has(contentType)) {
    throw new Error("Upload a PNG, JPG, or PDF file.");
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes > maxProofUploadSizeBytes) {
    throw new Error("File must be 10MB or smaller.");
  }
}

export async function uploadProofFileMock(input: ProofUploadInput): Promise<ProofUploadResult> {
  validateProofUploadFile(input);

  const fileName = safeProofFileName(input.fileName || input.file?.name || "proof");
  const storagePath = `mock/${input.rideInstanceId}/${input.proofType}/${fileName}`;

  return {
    fileUrl: `mock://proofs/${input.rideInstanceId}/${input.proofType}/${fileName}`,
    storagePath,
    bucketId: "mock",
    fileName,
    contentType: input.contentType || input.file?.type || "application/octet-stream",
    sizeBytes: input.sizeBytes ?? input.file?.size ?? 0,
    provider: "MOCK",
  };
}

export async function uploadProofFileToSupabaseStorage(_input: ProofUploadInput): Promise<ProofUploadResult> {
  validateProofUploadFile(_input);

  const { fileName, storagePath } = buildProofStoragePath(_input);
  const contentType = _input.contentType || _input.file?.type || "application/octet-stream";
  const sizeBytes = _input.sizeBytes ?? _input.file?.size ?? 0;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from(ridePodProofsBucketId).upload(storagePath, _input.file as File, {
    contentType,
    upsert: false,
  });

  // TODO SQL-2N: Signed proof preview URLs.
  // TODO: If metadata insert fails after storage upload, future cleanup should delete or mark orphaned proof files.
  // TODO: Add storage_path/provider columns in schema cleanup.
  if (error) {
    throw new Error("Couldn't upload proof file. Try again later.");
  }

  return {
    fileUrl: `storage://${ridePodProofsBucketId}/${storagePath}`,
    storagePath,
    bucketId: ridePodProofsBucketId,
    fileName,
    contentType,
    sizeBytes,
    provider: "SUPABASE_STORAGE",
  };
}

export async function uploadProofFile(input: ProofUploadInput, options: ProofUploadOptions = {}) {
  validateProofUploadFile(input);

  const provider =
    options.provider ??
    (isSupabaseStorageUploadEnabled() && hasSupabasePublicEnv() ? "SUPABASE_STORAGE" : "MOCK");

  if (provider === "SUPABASE_STORAGE" || provider === "SUPABASE_STORAGE_FUTURE") {
    return uploadProofFileToSupabaseStorage(input);
  }

  return uploadProofFileMock(input);
}
