import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  S3Client,
  CopyObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configure S3 Client
const s3Client = new S3Client({
  region: import.meta.env.VITE_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

interface ImageViewerProps {
  imageKey: string;
  imageUrl: string;
  description: string;
  versionId: string;
  contentType: string;
}

export default function ImageViewer({
  imageKey,
  imageUrl: initialImageUrl,
  description: initialDescription,
  versionId,
  contentType,
}: ImageViewerProps) {
  const [description, setDescription] = useState(initialDescription);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [imageLoading, setImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);

  const isImage = contentType.startsWith("image/");
  const isVideo = contentType.startsWith("video/");

  const refreshImageUrl = async () => {
    try {
      console.log("Refreshing image URL for:", imageKey);
      setImageLoading(true);

      const getObjectCommand = new GetObjectCommand({
        Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
        Key: imageKey,
      });
      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 3600,
      });

      console.log(
        "New signed URL generated:",
        signedUrl.substring(0, 100) + "...",
      );
      setImageUrl(signedUrl);
      setImageLoading(false);
    } catch (error) {
      console.error("Error refreshing image URL:", error);
      setImageLoading(false);
      throw error; // Re-throw so the caller knows it failed
    }
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveDescription = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setSaveError(null);

      console.log("Saving description for:", imageKey);
      console.log("Content type:", contentType);

      // Copy the object to itself with updated metadata
      // IMPORTANT: Must include ContentType when using MetadataDirective: "REPLACE"
      const copyCommand = new CopyObjectCommand({
        Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
        Key: imageKey,
        CopySource: `${import.meta.env.VITE_S3_BUCKET_NAME}/${encodeURIComponent(imageKey)}`,
        ContentType: contentType, // Preserve the content type!
        Metadata: {
          description: description,
        },
        MetadataDirective: "REPLACE",
      });

      await s3Client.send(copyCommand);
      console.log("Description saved successfully");

      // Wait a moment for S3 to propagate the change
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Refresh the image URL to ensure it stays visible
      console.log("Refreshing image URL after save...");
      await refreshImageUrl();

      setSaveSuccess(true);
    } catch (error) {
      console.error("Error saving description:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to save description",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewFile(file);
    setUploadSuccess(false);
    setUploadError(null);
  };

  const handleUploadNewVersion = async (e: FormEvent) => {
    e.preventDefault();

    if (!newFile) {
      setUploadError("Please select a file to upload");
      return;
    }

    try {
      setUploading(true);
      setUploadSuccess(false);
      setUploadError(null);

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
          Key: imageKey,
          Body: newFile,
          ContentType: newFile.type,
          Metadata: {
            description: description,
          },
        },
      });

      await upload.done();
      setUploadSuccess(true);
      setNewFile(null);

      // Reset file input
      const fileInput = document.getElementById(
        "new-version-file-input",
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }

      // Reload the page after a short delay to show the new version
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error uploading new version:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload new version",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ minWidth: "600px", maxWidth: "900px" }}>
      <h2 style={{ marginTop: 0, marginBottom: "20px" }}>Image/Video Viewer</h2>

      {/* Display Image or Video */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#cccccc",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          minHeight: "300px",
        }}
      >
        {imageLoading ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#6c757d" }}>Refreshing image...</p>
          </div>
        ) : isImage ? (
          <img
            src={imageUrl}
            alt={imageKey}
            style={{
              maxWidth: "100%",
              maxHeight: "500px",
              objectFit: "contain",
              borderRadius: "4px",
            }}
            onError={(e) => {
              console.error("Image failed to load");
              e.currentTarget.style.display = "none";
            }}
          />
        ) : isVideo ? (
          <video
            src={imageUrl}
            controls
            style={{
              maxWidth: "100%",
              maxHeight: "500px",
              borderRadius: "4px",
            }}
          />
        ) : (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            <p>Preview not available for this file type</p>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#007bff", textDecoration: "underline" }}
            >
              Download File
            </a>
          </div>
        )}
      </div>

      {/* File Information */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ margin: "5px 0", fontSize: "14px", color: "#ababab" }}>
          <strong>Key:</strong> {imageKey}
        </p>
        <p style={{ margin: "5px 0", fontSize: "14px", color: "#ababab" }}>
          <strong>Version ID:</strong> {versionId}
        </p>
      </div>

      {/* Description Editor */}
      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="description"
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          Description:
        </label>
        <textarea
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          rows={4}
          style={{
            display: "block",
            width: "90%",
            padding: "10px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            fontFamily: "inherit",
            fontSize: "14px",
            resize: "vertical",
          }}
          placeholder="Enter a description for this file..."
        />
        <button
          onClick={handleSaveDescription}
          disabled={saving || description === initialDescription}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            backgroundColor:
              saving || description === initialDescription ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              saving || description === initialDescription
                ? "not-allowed"
                : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {saving ? "Saving..." : "Save Description"}
        </button>

        {saveSuccess && (
          <p style={{ color: "green", fontSize: "14px", marginTop: "8px" }}>
            ✓ Description saved successfully!
          </p>
        )}

        {saveError && (
          <p style={{ color: "red", fontSize: "14px", marginTop: "8px" }}>
            Error: {saveError}
          </p>
        )}
      </div>

      {/* Upload New Version */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#151515",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "15px", fontSize: "18px" }}>
          Upload New Version
        </h3>
        <form onSubmit={handleUploadNewVersion}>
          <input
            id="new-version-file-input"
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*"
            style={{
              display: "block",
              marginBottom: "10px",
              padding: "8px",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              width: "90%",
            }}
          />
          {newFile && (
            <p style={{ fontSize: "14px", color: "#6c757d", margin: "8px 0" }}>
              Selected: {newFile.name} (
              {(newFile.size / 1024 / 1024).toFixed(2)}
              MB)
            </p>
          )}
          <button
            type="submit"
            disabled={uploading || !newFile}
            style={{
              padding: "8px 16px",
              backgroundColor: uploading || !newFile ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: uploading || !newFile ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {uploading ? "Uploading..." : "Upload New Version"}
          </button>

          {uploadSuccess && (
            <p style={{ color: "green", fontSize: "14px", marginTop: "8px" }}>
              ✓ New version uploaded successfully! Reloading...
            </p>
          )}

          {uploadError && (
            <p style={{ color: "red", fontSize: "14px", marginTop: "8px" }}>
              Error: {uploadError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
