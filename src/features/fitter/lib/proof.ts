import { formatBytes } from "@/features/fitter/lib/format";

export const MAX_PROOF_BYTES = 2 * 1024 * 1024;

export const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const ALLOWED_PROOF_LABEL = "JPEG, PNG, WebP or PDF";

export const validateProofFile = (file: File): string | null => {
  const type = file.type || "application/octet-stream";

  if (!ALLOWED_PROOF_TYPES.includes(type)) {
    return `${file.name} is a ${type} file. Proof must be ${ALLOWED_PROOF_LABEL}.`;
  }

  if (file.size === 0) return `${file.name} is empty. Capture the photo again.`;

  if (file.size > MAX_PROOF_BYTES) {
    return `${file.name} is ${formatBytes(file.size)}. Proof attachments are capped at 2MB.`;
  }

  return null;
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

export const dataUrlToFile = (
  dataUrl: string,
  fileName: string,
  fileType: string
) => {
  const [meta, encoded] = dataUrl.split(",");
  const binary = atob(encoded ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const type = fileType || meta?.slice(5).replace(";base64", "") || "application/octet-stream";

  return new File([bytes], fileName, { type });
};
