export type ProofUploadType = "QUOTE_SCREENSHOT" | "FINAL_RECEIPT" | "METER_PROOF";

export type ProofUploadProvider = "MOCK" | "SUPABASE_STORAGE_FUTURE";

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
  fileName: string;
  contentType: string;
  sizeBytes: number;
  provider: ProofUploadProvider;
  checksum?: string;
};

export type ProofUploadOptions = {
  provider?: ProofUploadProvider;
};

const maxProofUploadSizeBytes = 10 * 1024 * 1024;
const allowedProofUploadContentTypes = new Set(["image/png", "image/jpeg", "image/jpg", "application/pdf"]);

function safeProofFileName(fileName: string) {
  const trimmedFileName = fileName.trim() || "proof";
  return trimmedFileName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
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
    fileName,
    contentType: input.contentType || input.file?.type || "application/octet-stream",
    sizeBytes: input.sizeBytes ?? input.file?.size ?? 0,
    provider: "MOCK",
  };
}

export async function uploadProofFileToSupabaseStorage(_input: ProofUploadInput): Promise<ProofUploadResult> {
  // TODO SQL-2L: Implement Supabase Storage bucket + policies + signed upload/read URLs.
  void _input;
  throw new Error("Supabase Storage upload is not enabled yet.");
}

export async function uploadProofFile(input: ProofUploadInput, options: ProofUploadOptions = {}) {
  const provider = options.provider ?? "MOCK";

  if (provider === "SUPABASE_STORAGE_FUTURE") {
    return uploadProofFileToSupabaseStorage(input);
  }

  return uploadProofFileMock(input);
}
