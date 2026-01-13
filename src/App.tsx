import { useState } from "react";
import "./App.css";
import ImageUploader from "./ImageUploader";
import ImageList from "./ImageList";

type Tab = "upload" | "list";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#595959",
        width: "1000px",
      }}
    >
      <header
        style={{
          backgroundColor: "#282c34",
          padding: "20px",
          color: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ margin: 0, textAlign: "center" }}>S3 Metadata POC</h1>
      </header>

      {/* Tab Navigation */}
      <div
        style={{
          backgroundColor: "white",
          borderBottom: "2px solid #dee2e6",
          display: "flex",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <button
          onClick={() => setActiveTab("upload")}
          style={{
            padding: "15px 30px",
            backgroundColor: activeTab === "upload" ? "#007bff" : "transparent",
            color: activeTab === "upload" ? "white" : "#6c757d",
            border: "none",
            borderBottom:
              activeTab === "upload"
                ? "3px solid #007bff"
                : "3px solid transparent",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            transition: "all 0.3s ease",
          }}
        >
          Upload
        </button>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            padding: "15px 30px",
            backgroundColor: activeTab === "list" ? "#007bff" : "transparent",
            color: activeTab === "list" ? "white" : "#6c757d",
            border: "none",
            borderBottom:
              activeTab === "list"
                ? "3px solid #007bff"
                : "3px solid transparent",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            transition: "all 0.3s ease",
          }}
        >
          List
        </button>
      </div>

      {/* Tab Content */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
          backgroundColor: "#282c34",
        }}
      >
        {activeTab === "upload" && <ImageUploader />}
        {activeTab === "list" && <ImageList />}
      </main>
    </div>
  );
}

export default App;
