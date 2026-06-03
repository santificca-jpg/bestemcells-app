import { ImageResponse } from "next/og";

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
          background: "linear-gradient(135deg, #2C3A5B 0%, #232E49 100%)",
          color: "#D2AE6D",
          fontSize: 90,
          fontWeight: 700,
          letterSpacing: -3,
          fontFamily: "sans-serif",
        }}
      >
        ERA
      </div>
    ),
    { ...size }
  );
}
