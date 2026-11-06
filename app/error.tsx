"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Pixi Video Error Boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#080c14",
        color: "#e2e8f0",
        fontFamily: "'Inter', sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          backgroundColor: "#0d131f",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "32px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            color: "#ef4444",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "#f8fafc" }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "20px", lineHeight: "1.5" }}>
          {error.message || "An unexpected error occurred while running Pixi Video Studio."}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-secondary"
            style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
          >
            Reload Studio
          </button>
        </div>
      </div>
    </div>
  );
}

