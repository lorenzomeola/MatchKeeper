import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf7f3",
          color: "#1a1410",
        }}
      >
        <svg width="220" height="193" viewBox="0 0 132 116" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M66 5 L122 20 V56 C122 86 98 103 66 111 C34 103 10 86 10 56 V20 Z"
            stroke="#ff7a1a"
            strokeWidth="7"
          />
          <path d="M40 70 L56 88 L98 44" stroke="#e05d00" strokeWidth="13" />
        </svg>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 24 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, marginTop: 12, color: "#e05d00" }}>{SITE_TAGLINE}</div>
      </div>
    ),
    { ...size },
  );
}
