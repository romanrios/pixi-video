import React from "react";
import Link from "next/link";

export default function NotFound() {
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
          maxWidth: "460px",
          backgroundColor: "#0d131f",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "36px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 800,
            margin: "0 0 10px 0",
            background: "linear-gradient(135deg, #a855f7, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </h1>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", color: "#f8fafc" }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px", lineHeight: "1.5" }}>
          The page or preset you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="btn btn-primary"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Back to Pixi Studio
        </Link>
      </div>
    </div>
  );
}

