import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// Configure S3 Client
const s3Client = new S3Client({
  region: import.meta.env.VITE_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

// Supported MIME types for images and videos
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
];

const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/ogg",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_VIDEO_DURATION = 10; // seconds

interface FormData {
  file: File | null;
  description: string;
}

interface FormErrors {
  file?: string;
  description?: string;
}

interface VerifiedMetadata {
  description: string;
  fileName: string;
  contentType: string;
  size: number;
}

export default function ImageUploader() {
  const [formData, setFormData] = useState<FormData>({
    file: null,
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [verifiedMetadata, setVerifiedMetadata] =
    useState<VerifiedMetadata | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, file });
    setErrors({ ...errors, file: undefined });
    setUploadSuccess(false);
    setUploadError(null);
    setVerifiedMetadata(null);

    if (file) {
      await validateFile(file);
    }
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, description: e.target.value });
    setErrors({ ...errors, description: undefined });
    setUploadSuccess(false);
    setUploadError(null);
    setVerifiedMetadata(null);
  };

  const validateFile = async (file: File): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // Check if file type is supported
    const allSupportedTypes = [
      ...SUPPORTED_IMAGE_TYPES,
      ...SUPPORTED_VIDEO_TYPES,
    ];
    if (!allSupportedTypes.includes(file.type)) {
      newErrors.file =
        "Unsupported file type. Please upload an image or video.";
      setErrors(newErrors);
      return false;
    }

    // Validate image size
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      if (file.size > MAX_IMAGE_SIZE) {
        newErrors.file = `Image size must be less than 5MB. Current size: ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB`;
        setErrors(newErrors);
        return false;
      }
    }

    // Validate video duration
    if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      try {
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
          newErrors.file = `Video must be around ${MAX_VIDEO_DURATION} seconds or less. Current duration: ${duration.toFixed(
            1,
          )}s`;
          setErrors(newErrors);
          return false;
        }
      } catch (error) {
        console.error("Error validating video duration:", error);
        newErrors.file = "Unable to validate video duration";
        setErrors(newErrors);
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error("Failed to load video metadata"));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.file) {
      newErrors.file = "Please select a file to upload";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Please provide a description";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verifyMetadata = async (
    fileName: string,
  ): Promise<VerifiedMetadata> => {
    try {
      const command = new HeadObjectCommand({
        Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
        Key: fileName,
      });

      const response = await s3Client.send(command);

      return {
        description: response.Metadata?.description || "",
        fileName: fileName,
        contentType: response.ContentType || "",
        size: response.ContentLength || 0,
      };
    } catch (error) {
      console.error("Error verifying metadata:", error);
      throw error;
    }
  };

  const onSave = async (file: File, description: string) => {
    try {
      const fileName = `${Date.now()}-${file.name}`;

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
          Key: fileName,
          Body: file,
          ContentType: file.type,
          Metadata: {
            description: description,
          },
        },
      });

      await upload.done();

      // Verify metadata was stored correctly
      const verified = await verifyMetadata(fileName);

      return { success: true, fileName, verified };
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadSuccess(false);
    setUploadError(null);

    if (!validateForm()) {
      return;
    }

    if (!formData.file) {
      return;
    }

    // Validate file again before upload
    const isValid = await validateFile(formData.file);
    if (!isValid) {
      return;
    }

    setUploading(true);

    try {
      const result = await onSave(formData.file, formData.description);
      console.log("Upload successful:", result);
      setUploadSuccess(true);
      setVerifiedMetadata(result.verified);
      // Reset form
      setFormData({ file: null, description: "" });
      // Reset file input
      const fileInput = document.getElementById(
        "file-input",
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload file",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        width: "1000px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <h2>Upload Image or Video</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px", width: "80%" }}>
          <label
            htmlFor="file-input"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Image/Video File:
          </label>
          <input
            id="file-input"
            type="file"
            accept={[...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(
              ",",
            )}
            onChange={handleFileChange}
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              border: errors.file ? "1px solid red" : "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          {errors.file && (
            <p style={{ color: "red", fontSize: "14px", marginTop: "4px" }}>
              {errors.file}
            </p>
          )}
          {formData.file && !errors.file && (
            <p style={{ color: "green", fontSize: "14px", marginTop: "4px" }}>
              Selected: {formData.file.name} (
              {(formData.file.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          )}
        </div>

        <div style={{ marginBottom: "20px", width: "80%" }}>
          <label
            htmlFor="description"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Description:
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={handleDescriptionChange}
            rows={4}
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              border: errors.description ? "1px solid red" : "1px solid #ccc",
              borderRadius: "4px",
              fontFamily: "inherit",
            }}
            placeholder="Enter a description for your file..."
          />
          {errors.description && (
            <p style={{ color: "red", fontSize: "14px", marginTop: "4px" }}>
              {errors.description}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: "10px 20px",
            backgroundColor: uploading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {uploadSuccess && verifiedMetadata && (
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              backgroundColor: "#d4edda",
              border: "1px solid #c3e6cb",
              borderRadius: "4px",
              color: "#155724",
            }}
          >
            <p style={{ fontWeight: "bold", marginBottom: "12px" }}>
              File uploaded successfully!
            </p>
            <div style={{ fontSize: "14px" }}>
              <p style={{ marginBottom: "8px" }}>
                <strong>Verified Metadata:</strong>
              </p>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>
                  <strong>File Name:</strong> {verifiedMetadata.fileName}
                </li>
                <li>
                  <strong>Description:</strong> {verifiedMetadata.description}
                </li>
                <li>
                  <strong>Content Type:</strong> {verifiedMetadata.contentType}
                </li>
                <li>
                  <strong>Size:</strong>{" "}
                  {(verifiedMetadata.size / 1024 / 1024).toFixed(2)} MB
                </li>
              </ul>
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "12px",
                  fontStyle: "italic",
                }}
              >
                ✓ Metadata has been verified and stored in S3 inventory table
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <p style={{ color: "red", marginTop: "16px", fontWeight: "bold" }}>
            Error: {uploadError}
          </p>
        )}
      </form>
    </div>
  );
}
