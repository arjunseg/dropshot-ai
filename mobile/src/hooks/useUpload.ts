import { useCallback } from "react";
import { useUploadStore } from "@/store/uploadStore";
import * as uploadApi from "@/api/upload";
import { validateVideoFile } from "@/utils/validation";

export function useUpload() {
  const { addJob, updateJob } = useUploadStore();

  const uploadVideo = useCallback(
    async (
      fileUri: string,
      filename: string,
      contentType: string,
      fileSizeBytes: number,
      shotType: string,
    ): Promise<string> => {
      // Validate before touching the server
      const validation = validateVideoFile(fileSizeBytes, filename);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const jobId = `upload_${Date.now()}`;
      addJob({
        id: jobId,
        filename,
        shotType,
        progress: 0,
        status: "uploading",
      });

      try {
        // Step 1: Get presigned URL (also enforces usage limit server-side)
        const { upload_url, s3_key } = await uploadApi.getPresignedUrl(
          filename,
          contentType,
          fileSizeBytes,
          shotType,
        );

        // Step 2: Upload directly to S3
        await uploadApi.uploadToS3(upload_url, fileUri, contentType, (progress) => {
          updateJob(jobId, { progress });
        });

        // Step 3: Confirm upload and start analysis
        updateJob(jobId, { status: "confirming", progress: 1 });
        const { analysis_id } = await uploadApi.confirmUpload(s3_key, shotType);

        updateJob(jobId, { status: "done", analysisId: analysis_id });
        return analysis_id;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        updateJob(jobId, { status: "error", error: message });
        throw error;
      }
    },
    [addJob, updateJob],
  );

  return { uploadVideo };
}
