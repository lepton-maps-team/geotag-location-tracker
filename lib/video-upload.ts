import * as FileSystem from "expo-file-system/legacy";

// Types
type UploadParametersRequest = {
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  dateTimestamp: string;
  partNumber?: number;
  uploadId?: string;
  parts?: Array<{ ETag: string; PartNumber: number }>;
};

type UploadParametersResponse = {
  uploadUrl?: string;
  needsMultipart?: boolean;
  uploadId?: string;
  fileKey?: string;
  totalChunks?: number;
  chunkSize?: number;
  message?: string;
};

type MultipartInitResponse = {
  needsMultipart: true;
  uploadId: string;
  fileKey: string;
  totalChunks: number;
  chunkSize: number;
  message: string;
};

type FileMetadata = {
  dateTimestamp: string;
  fileSizeBytes: number;
  finalUrl: string;
};

type UploadOptions = {
  url: string;
  headers: Record<string, string>;
};

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const CONCURRENCY = 4;

// Configuration - Update these with your actual values
const EDGE_FUNCTION_URL =
  "https://xengyefjbnoolmqyphxw.supabase.co/functions/v1/r2-presigned-url"; // Replace with your edge function URL
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlbmd5ZWZqYm5vb2xtcXlwaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzOTYzOTEsImV4cCI6MjA1NTk3MjM5MX0.5JFYQNXFe3Jn099q_CByr0t1WogjtXXDFFVAFXr7sgY"; // Replace
const postEdge = async (
  bodyObj: UploadParametersRequest
): Promise<UploadParametersResponse> => {
  try {
    const resp = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(bodyObj),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Edge function error: ${errorText}`);
    }

    const responseText = await resp.text();
    console.log("=== Edge Function Response ===");
    console.log("status:", resp.status);
    console.log("body:", responseText);
    console.log("body type:", typeof responseText);
    console.log("body length:", responseText?.length);
    console.log("=====================");

    // Validate that response is JSON before parsing
    if (!responseText || responseText.trim().length === 0) {
      throw new Error("Empty response from edge function");
    }

    // Check if response looks like JSON
    const trimmed = responseText.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      console.error(
        "Response is not JSON. First 100 chars:",
        trimmed.substring(0, 100)
      );
      throw new Error(
        `Invalid JSON response from edge function: ${trimmed.substring(0, 100)}`
      );
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError: any) {
      console.error("JSON Parse Error Details:");
      console.error("Response text:", responseText);
      console.error("Error:", parseError);
      throw new Error(
        `Failed to parse edge function response as JSON: ${
          parseError.message
        }. Response: ${responseText.substring(0, 200)}`
      );
    }
  } catch (err) {
    console.error("Error calling edge function:", err);
    throw err;
  }
};

const getUploadParameters = async (
  file: { size: number; type: string },
  fileName: string
): Promise<UploadOptions | MultipartInitResponse> => {
  const ts = new Date().toISOString();
  const body = await postEdge({
    fileName: fileName,
    fileSizeBytes: file.size,
    fileType: file.type,
    dateTimestamp: ts,
  });

  if (body.needsMultipart) {
    return body as MultipartInitResponse;
  }

  return {
    url: body.uploadUrl!,
    headers: { "Content-Type": file.type },
  };
};

const signPart = async (
  file: { size: number; type: string },
  fileName: string,
  uploadId: string,
  partNumber: number,
  dateTimestamp: string
): Promise<string> => {
  const body = await postEdge({
    fileName: fileName,
    fileSizeBytes: file.size,
    fileType: file.type,
    dateTimestamp: dateTimestamp,
    partNumber: partNumber,
    uploadId: uploadId,
  });

  return body.uploadUrl!;
};

const completeMultipartUpload = async (
  file: { size: number; type: string },
  fileName: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>,
  dateTimestamp: string
): Promise<string> => {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const body = await postEdge({
    fileName: fileName,
    fileSizeBytes: file.size,
    fileType: file.type,
    dateTimestamp: dateTimestamp,
    partNumber: totalChunks + 1,
    uploadId: uploadId,
    parts: parts,
  });

  // Return the final URL - adjust based on your response structure
  return `https://bharatnet.r2.rio.software/${fileName}`;
};

export const uploadVideo = async (
  videoPath: string,
  abortController?: AbortController
): Promise<FileMetadata> => {
  try {
    // Read file info
    const fileInfo = await FileSystem.getInfoAsync(videoPath);
    console.log(fileInfo, "fileInfo");
    if (!fileInfo.exists) {
      throw new Error(`Video file not found at path: ${videoPath}`);
    }

    // Extract filename from path
    const fileName = videoPath.split("/").pop() || `video-${Date.now()}.mp4`;
    const fileSize = fileInfo.size || 0;
    const fileType = "video/mp4"; // Adjust based on your video format

    console.log(fileName, "fileName");

    // Get upload parameters
    const uploadParams = await getUploadParameters(
      { size: fileSize, type: fileType },
      fileName
    );

    // Check if multipart is needed (for uploadVideo function, we'll use single upload)
    if ("needsMultipart" in uploadParams && uploadParams.needsMultipart) {
      throw new Error(
        "File too large for single upload. Use uploadVideoWithFileSystem for multipart support."
      );
    }

    const { url, headers } = uploadParams as UploadOptions;

    // Use FileSystem.uploadAsync for React Native (recommended method)
    const uploadResult = await FileSystem.uploadAsync(url, videoPath, {
      httpMethod: "PUT",
      headers,
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    console.log(uploadResult, "uploadResult");

    if (uploadResult.status !== 200) {
      throw new Error(
        `Upload failed: ${uploadResult.status} - ${uploadResult.body}`
      );
    }
    const finalUrl = `https://bharatnet.r2.rio.software/${fileName}`;
    // Return metadata
    const ts = new Date().toISOString();
    return {
      dateTimestamp: ts,
      fileSizeBytes: fileSize,
      finalUrl: finalUrl,
    };
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error;
  }
};

export const uploadVideoWithFileSystem = async (
  videoPath: string,
  fileName: string,
  abortController?: AbortController
): Promise<FileMetadata> => {
  try {
    // Read file info
    const fileInfo = await FileSystem.getInfoAsync(videoPath);
    console.log(fileInfo, "fileInfo");
    if (!fileInfo.exists) {
      throw new Error(`Video file not found at path: ${videoPath}`);
    }

    const finalFileName = fileName.endsWith(".mp4")
      ? fileName
      : `${fileName}.mp4`;
    const fileSize = fileInfo.size || 0;
    const fileType = "video/mp4";
    const dateTimestamp = new Date().toISOString();

    // Get upload parameters
    const uploadParams = await getUploadParameters(
      { size: fileSize, type: fileType },
      finalFileName
    );

    // --- Multipart Upload ---
    if ("needsMultipart" in uploadParams && uploadParams.needsMultipart) {
      console.log("=== Starting Multipart Upload ===");
      const multipartData = uploadParams as MultipartInitResponse;
      const { uploadId, totalChunks, chunkSize } = multipartData;
      const parts: Array<{ ETag: string; PartNumber: number }> = [];

      // Generate a short, unique ID for temp files to avoid filename length limits
      const localSessionId = Math.random().toString(36).substring(7);
      console.log(
        "Starting sequential multipart upload via temp files...",
        localSessionId
      );

      for (let j = 1; j <= totalChunks; j++) {
        if (abortController?.signal.aborted) {
          throw new Error("Upload canceled by user");
        }

        const start = (j - 1) * chunkSize;
        const length = Math.min(chunkSize, fileSize - start);

        // FIX: Use short local ID instead of long uploadId
        const tempChunkPath = `${FileSystem.cacheDirectory}up_${localSessionId}_${j}.tmp`;

        try {
          // 1. Get Signed URL
          const partUrl = await signPart(
            { size: fileSize, type: fileType },
            finalFileName,
            uploadId,
            j,
            dateTimestamp
          );

          // 2. Read chunk from main video file
          const chunkBase64 = await FileSystem.readAsStringAsync(videoPath, {
            encoding: FileSystem.EncodingType.Base64,
            position: start,
            length: length,
          });

          // 3. Write chunk to a temporary file
          await FileSystem.writeAsStringAsync(tempChunkPath, chunkBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // 4. Upload the temp file using Native Uploader
          const uploadResult = await FileSystem.uploadAsync(
            partUrl,
            tempChunkPath,
            {
              httpMethod: "PUT",
              headers: { "Content-Type": "application/octet-stream" },
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            }
          );

          if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error(
              `Part ${j} upload failed: ${uploadResult.status} - ${uploadResult.body}`
            );
          }

          // Handle case-insensitive headers
          const eTag =
            (
              uploadResult.headers["ETag"] || uploadResult.headers["etag"]
            )?.replaceAll('"', "") || "";

          parts.push({ ETag: eTag, PartNumber: j });
          console.log(`✅ Part ${j}/${totalChunks} uploaded`);
        } catch (error) {
          console.error(`❌ Chunk ${j} upload failed:`, error);
          throw error;
        } finally {
          // 5. Cleanup: Delete the temp chunk file silently
          await FileSystem.deleteAsync(tempChunkPath, {
            idempotent: true,
          }).catch(() => {});
        }
      }

      console.log(`All ${totalChunks} parts uploaded successfully`);

      // Complete multipart upload
      parts.sort((a, b) => a.PartNumber - b.PartNumber);
      const finalUrl = await completeMultipartUpload(
        { size: fileSize, type: fileType },
        finalFileName,
        uploadId,
        parts,
        dateTimestamp
      );

      return {
        dateTimestamp: dateTimestamp,
        fileSizeBytes: fileSize,
        finalUrl: finalUrl,
      };
    } else {
      // --- Single Upload (Existing Logic) ---
      console.log("=== Starting Single PUT Upload ===");
      if (!("url" in uploadParams)) throw new Error("Invalid params");

      const { url, headers } = uploadParams;
      const uploadResult = await FileSystem.uploadAsync(url, videoPath, {
        httpMethod: "PUT",
        headers,
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed: ${uploadResult.status}`);
      }
      console.log("✅ Single upload complete");
      return {
        dateTimestamp: dateTimestamp,
        fileSizeBytes: fileSize,
        finalUrl: `https://bharatnet.r2.rio.software/${finalFileName}`,
      };
    }
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error;
  }
};
