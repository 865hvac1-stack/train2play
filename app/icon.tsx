import { ImageResponse } from "next/og";

import { brand } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          color: brand.colors.white,
          fontSize: 10,
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
