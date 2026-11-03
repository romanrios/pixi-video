"use client";

import dynamic from "next/dynamic";

const Studio = dynamic(() => import("../components/Studio.jsx"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0b0f17",
        color: "#94a3b8",
        fontFamily: "Inter, sans-serif",
      }}
    >
      Starting Pixi Studio...
    </div>
  ),
});

export default function Page() {
  return <Studio />;
}

