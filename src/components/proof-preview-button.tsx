"use client";

import { useState } from "react";
import { ExternalLink, FileSearch } from "lucide-react";
import { cn } from "@/components/ui";
import { createProofSignedUrl, normalizeProofStoragePath } from "@/lib/uploads/proof-upload";

type ProofPreviewButtonProps = {
  fileUrlOrStoragePath?: string | null;
  proofType?: "QUOTE_SCREENSHOT" | "FINAL_RECEIPT" | "METER_PROOF" | (string & {});
  fileName?: string | null;
  contentType?: string | null;
  label?: string;
  className?: string;
};

function isPdfProof(fileName?: string | null, contentType?: string | null) {
  return contentType === "application/pdf" || Boolean(fileName?.toLowerCase().endsWith(".pdf"));
}

export function ProofPreviewButton({
  fileUrlOrStoragePath,
  proofType,
  fileName,
  contentType,
  label,
  className,
}: ProofPreviewButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const normalizedPath = normalizeProofStoragePath(fileUrlOrStoragePath);
  const buttonLabel = label || (isPdfProof(fileName, contentType) ? "Open PDF" : "Preview proof");

  if (!normalizedPath) {
    return (
      <p className={cn("text-sm font-bold text-[var(--rp-muted)]", className)}>
        No proof file available
      </p>
    );
  }

  if (normalizedPath.kind === "mock") {
    return (
      <div className={cn("rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3", className)}>
        <div className="flex items-center gap-2 text-sm font-black text-[var(--rp-primary)]">
          <FileSearch className="h-4 w-4" />
          Mock proof preview
        </div>
        <p className="mt-1 break-words text-xs font-semibold text-[var(--rp-muted)]">
          {fileName || proofType || "Proof file"}
        </p>
      </div>
    );
  }

  const openProofPreview = async () => {
    setIsOpening(true);
    setErrorMessage(null);

    const result = await createProofSignedUrl({ storagePath: normalizedPath.storagePath });
    setIsOpening(false);

    if (!result.ok) {
      setErrorMessage("Couldn't open proof preview. Try again later.");
      return;
    }

    window.open(result.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <button
        type="button"
        onClick={openProofPreview}
        disabled={isOpening}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-black text-[var(--rp-text)] transition hover:border-[var(--rp-primary)] hover:text-[var(--rp-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ExternalLink className="h-4 w-4" />
        {isOpening ? "Opening..." : buttonLabel}
      </button>
      {errorMessage ? (
        <p className="rounded-[12px] border border-[var(--rp-border)] bg-[var(--rp-danger-bg)] p-2 text-xs font-bold leading-5 text-[var(--rp-danger)]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
