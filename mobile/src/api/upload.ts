import axios from "axios";
import { apiClient } from "./client";
import { PresignedUrlResponse } from "@/types/api";

export async function getPresignedUrl(
  filename: string,
  contentType: string,
  fileSizeBytes: number,
  shotType: string,
): Promise<PresignedUrlResponse> {
  const { data } = await apiClient.post<PresignedUrlResponse>("/upload/presigned-url", {
    filename,
    content_type: contentType,
    file_size_bytes: fileSizeBytes,
    shot_type: shotType,
  });
  return data;
}

export async function uploadToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  await axios.put(uploadUrl, blob, {
    headers: { "Content-Type": contentType },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(event.loaded / event.total);
      }
    },
  });
}

export async function confirmUpload(
  s3Key: string,
  shotType: string,
): Promise<{ analysis_id: string; status: string }> {
  const { data } = await apiClient.post("/upload/confirm", {
    s3_key: s3Key,
    shot_type: shotType,
  });
  return data;
}
