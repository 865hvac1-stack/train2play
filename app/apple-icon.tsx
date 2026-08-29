import { ImageResponse } from "next/og";

import { brand } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.colors.black,
          fontSize: 58,
          fontWeight: 800,
          fontStyle: "italic",
        }}
      >
        <span style={{ color: brand.colors.white }}>T</span>
        <span style={{ color: brand.colors.orange }}>2</span>
        <span style={{ color: brand.colors.white }}>P</span>
      </div>
    ),
    { ...size },
  );
}
