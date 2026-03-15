const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_DURATION_SECONDS = 120; // 2 minutes
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".m4v", ".avi"];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateVideoFile(
  fileSize: number,
  filename: string,
  durationSeconds?: number,
): ValidationResult {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format. Please upload a ${ALLOWED_EXTENSIONS.join(", ")} file.`,
    };
  }

  if (fileSize > MAX_VIDEO_BYTES) {
    return {
      valid: false,
      error: `Video is too large (${(fileSize / 1024 / 1024).toFixed(0)}MB). Maximum is 500MB.`,
    };
  }

  if (durationSeconds !== undefined && durationSeconds > MAX_DURATION_SECONDS) {
    return {
      valid: false,
      error: `Video is too long (${Math.round(durationSeconds)}s). Maximum is ${MAX_DURATION_SECONDS}s for best results.`,
    };
  }

  return { valid: true };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  return { valid: true };
}
