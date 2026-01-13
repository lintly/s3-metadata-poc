import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import {
  S3Client,
  ListObjectVersionsCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import ImageViewer from "./ImageViewer";

// Configure S3 Client
const s3Client = new S3Client({
  region: import.meta.env.VITE_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

interface S3Object {
  key: string;
  description: string;
  versionId: string;
  size: number;
  lastModified: Date;
  contentType: string;
  url: string;
}

export default function ImageList() {
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<S3Object | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchObjects();
  }, []);

  const fetchObjects = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        "Fetching objects from bucket:",
        import.meta.env.VITE_S3_BUCKET_NAME,
      );
      console.log("Using region:", import.meta.env.VITE_S3_BUCKET_REGION);

      // List all object versions in the bucket
      const listCommand = new ListObjectVersionsCommand({
        Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
      });

      const listResponse = await s3Client.send(listCommand);
      console.log("List versions response:", listResponse);

      if (!listResponse.Versions || listResponse.Versions.length === 0) {
        setObjects([]);
        setLoading(false);
        return;
      }

      // Filter to only get the latest versions (IsLatest = true)
      const latestVersions = listResponse.Versions.filter(
        (version) => version.IsLatest === true,
      );

      console.log(
        "Fetching metadata for",
        latestVersions.length,
        "objects (latest versions only)",
      );

      // Get metadata for each object
      const objectsWithMetadata = await Promise.all(
        latestVersions.map(async (obj) => {
          if (!obj.Key || !obj.VersionId) return null;

          try {
            console.log(
              "Fetching metadata for:",
              obj.Key,
              "VersionId:",
              obj.VersionId,
            );
            const headCommand = new HeadObjectCommand({
              Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
              Key: obj.Key,
              VersionId: obj.VersionId, // Request specific version
            });

            const headResponse = await s3Client.send(headCommand);
            console.log("Metadata for", obj.Key, ":", headResponse.Metadata);

            // Generate pre-signed URL for secure access
            const getObjectCommand = new GetObjectCommand({
              Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
              Key: obj.Key,
              VersionId: obj.VersionId, // Use specific version
            });
            const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
              expiresIn: 3600, // URL expires in 1 hour
            });

            return {
              key: obj.Key,
              description:
                headResponse.Metadata?.description || "No description",
              versionId: obj.VersionId, // Use VersionId from list response
              size: obj.Size || 0,
              lastModified: obj.LastModified || new Date(),
              contentType: headResponse.ContentType || "unknown",
              url: signedUrl,
            };
          } catch (error) {
            console.error(`Error fetching metadata for ${obj.Key}:`, error);
            return null;
          }
        }),
      );

      const validObjects = objectsWithMetadata.filter(
        (obj): obj is S3Object => obj !== null,
      );
      console.log("Valid objects:", validObjects);
      setObjects(validObjects);
    } catch (err) {
      console.error("Error fetching objects:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch objects");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (
    e: MouseEvent<HTMLButtonElement>,
    key: string,
    versionId: string,
  ) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${key}"?`)) {
      return;
    }

    try {
      setDeletingKey(key);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
        Key: key,
        VersionId: versionId, // Always use the version ID
      });

      await s3Client.send(deleteCommand);

      // Refresh the list
      await fetchObjects();
    } catch (err) {
      console.error("Error deleting object:", err);
      alert(
        `Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const handleRowClick = (obj: S3Object) => {
    setSelectedImage(obj);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading objects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <p>Error: {error}</p>
        <button
          onClick={fetchObjects}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>No objects found in the bucket.</p>
        <button
          onClick={fetchObjects}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "15px", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "10px",
        }}
      >
        <h2>Image/Video List ({objects.length} items)</h2>
        <button
          onClick={fetchObjects}
          style={{
            padding: "8px 16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            minWidth: "600px",
            borderCollapse: "collapse",
            backgroundColor: "white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#353535",
                borderBottom: "2px solid #dee2e6",
              }}
            >
              <th
                style={{ padding: "12px", textAlign: "left", width: "100px" }}
              >
                Thumbnail
              </th>
              <th
                style={{ padding: "12px", textAlign: "left", width: "200px" }}
              >
                Key
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  minWidth: "250px",
                }}
              >
                Description
              </th>
              <th
                style={{ padding: "12px", textAlign: "left", width: "150px" }}
              >
                Version ID
              </th>
              <th
                style={{ padding: "12px", textAlign: "center", width: "100px" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {objects.map((obj) => (
              <tr
                key={`${obj.key}-${obj.versionId}`}
                onClick={() => handleRowClick(obj)}
                style={{
                  borderBottom: "1px solid #dee2e6",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  color: "#fff",
                  backgroundColor: "#131313",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#585858";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#131313";
                }}
              >
                <td style={{ padding: "12px" }}>
                  {obj.contentType.startsWith("image/") ? (
                    <img
                      src={obj.url}
                      alt={obj.key}
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "4px",
                        border: "1px solid #dee2e6",
                      }}
                    />
                  ) : obj.contentType.startsWith("video/") ? (
                    <video
                      src={obj.url}
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "4px",
                        border: "1px solid #dee2e6",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#e9ecef",
                        borderRadius: "4px",
                        border: "1px solid #dee2e6",
                        fontSize: "12px",
                        color: "#6c757d",
                      }}
                    >
                      No Preview
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "12px",
                    fontSize: "14px",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {obj.key}
                </td>
                <td
                  style={{
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "500",
                    minWidth: "250px",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {obj.description || (
                    <span style={{ color: "#6c757d", fontStyle: "italic" }}>
                      No description
                    </span>
                  )}
                </td>
                <td
                  style={{
                    padding: "12px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  {obj.versionId.length > 20
                    ? `${obj.versionId.substring(0, 20)}...`
                    : obj.versionId}
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <button
                    onClick={(e) => handleDelete(e, obj.key, obj.versionId)}
                    disabled={deletingKey === obj.key}
                    style={{
                      padding: "6px 12px",
                      backgroundColor:
                        deletingKey === obj.key ? "#ccc" : "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        deletingKey === obj.key ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {deletingKey === obj.key ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for ImageViewer */}
      {isModalOpen && selectedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "500px",
              maxHeight: "95vh",
              width: "100%",
              backgroundColor: "#454545",
              borderRadius: "8px",
              padding: "15px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                padding: "0px 10px 0px 10px",
                top: "10px",
                right: "10px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontSize: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                lineHeight: "1",
              }}
            >
              ×
            </button>
            <ImageViewer
              imageKey={selectedImage.key}
              imageUrl={selectedImage.url}
              description={selectedImage.description}
              versionId={selectedImage.versionId}
              contentType={selectedImage.contentType}
            />
          </div>
        </div>
      )}
    </div>
  );
}
