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
          alignItems: "center",
          justifyContent: "center",
          background: brand.colors.black,
          color: brand.colors.white,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            fontStyle: "italic",
            letterSpacing: -4,
            display: "flex",
          }}
        >
          <span style={{ color: brand.colors.white }}>T</span>
          <span style={{ color: brand.colors.orange }}>2</span>
          <span style={{ color: brand.colors.white }}>P</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: 6,
            display: "flex",
          }}
        >
          <span>TRAIN </span>
          <span style={{ color: brand.colors.orange }}>2</span>
          <span> PLAY</span>
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            letterSpacing: 4,
            color: "#cccccc",
          }}
        >
          {brand.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
