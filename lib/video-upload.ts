import * as FileSystem from "expo-file-system/legacy";

// Types
type UploadParametersRequest = {
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  dateTimestamp: string;
};

type UploadParametersResponse = {
  uploadUrl: string;
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

// Configuration - Update these with your actual values
const EDGE_FUNCTION_URL =
  "https://xengyefjbnoolmqyphxw.supabase.co/functions/v1/r2-presigned-url"; // Replace with your edge function URL
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlbmd5ZWZqYm5vb2xtcXlwaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzOTYzOTEsImV4cCI6MjA1NTk3MjM5MX0.5JFYQNXFe3Jn099q_CByr0t1WogjtXXDFFVAFXr7sgY"; // Replace with your Supabase anon key

/**
 * Posts a request to the edge function to get upload parameters
 */
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

    return resp.json();
  } catch (err) {
    console.error("Error calling edge function:", err);
    throw err;
  }
};

/**
 * Gets upload parameters for a file from the edge function
 */
const getUploadParameters = async (
  file: { size: number; type: string },
  fileName: string
): Promise<UploadOptions> => {
  const ts = new Date().toISOString();
  const body = await postEdge({
    fileName: fileName,
    fileSizeBytes: file.size,
    fileType: file.type,
    dateTimestamp: ts,
  });

  return {
    url: body.uploadUrl,
    headers: { "Content-Type": file.type },
  };
};

/**
 * Uploads a video file to storage using the VideoPath
 * Uses FileSystem.uploadAsync which is the recommended method for React Native
 * @param videoPath - The local file path to the video (from VideoPath field)
 * @param abortController - Optional AbortController for canceling the upload (not used with uploadAsync, but kept for API consistency)
 * @returns The uploaded file metadata
 */
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
    const { url, headers } = await getUploadParameters(
      { size: fileSize, type: fileType },
      fileName
    );

    // Use FileSystem.uploadAsync for React Native (recommended method)
    const uploadResult = await FileSystem.uploadAsync(url, videoPath, {
      httpMethod: "PUT",
      headers,
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

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

/**
 * Uploads a video file using FileSystem upload (alternative method for React Native)
 * @param videoPath - The local file path to the video (from VideoPath field)
 * @param fileName - The filename to use for the uploaded file (e.g., survey ID)
 * @param abortController - Optional AbortController for canceling the upload
 * @returns The uploaded file metadata
 */
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

    // Use provided fileName, ensure it has .mp4 extension
    const finalFileName = fileName.endsWith(".mp4")
      ? fileName
      : `${fileName}.mp4`;
    const fileSize = fileInfo.size || 0;
    const fileType = "video/mp4";

    console.log(finalFileName, "fileName");
    console.log(fileSize, "fileSize");
    console.log(fileType, "fileType");

    // Get upload parameters
    const { url, headers } = await getUploadParameters(
      { size: fileSize, type: fileType },
      finalFileName
    );

    // Use FileSystem.uploadAsync for React Native
    const uploadResult = await FileSystem.uploadAsync(url, videoPath, {
      httpMethod: "PUT",
      headers,
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (uploadResult.status !== 200) {
      throw new Error(`Upload failed: ${uploadResult.status}`);
    }

    const finalUrl = `https://bharatnet.r2.rio.software/${finalFileName}`;

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
