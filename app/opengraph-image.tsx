import { ImageResponse } from "next/og";

import { brand } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 45%, #d1fae5 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#059669",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {brand.monogram}
          </div>
          <div style={{ fontSize: 42, fontWeight: 700, color: "#0f172a" }}>
            {brand.name}
          </div>
        </div>
        <div style={{ fontSize: 54, fontWeight: 700, color: "#064e3b", lineHeight: 1.15 }}>
          {brand.tagline}
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#475569", maxWidth: 900 }}>
          Rosters, film notes, velo profiles, and pickup matching for youth coaches.
        </div>
      </div>
    ),
    { ...size },
  );
}
