import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PocketFlow: the co-pilot for your wallet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when a PocketFlow link is shared. Generated, so no image file is stored. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #09090b 0%, #0b1f1a 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
              color: "#09090b",
            }}
          >
            P
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>PocketFlow</div>
        </div>

        <div style={{ marginTop: 56, fontSize: 84, fontWeight: 300, letterSpacing: -3, lineHeight: 1.05 }}>
          The co-pilot for your wallet.
        </div>

        <div style={{ marginTop: 32, fontSize: 34, color: "#a1a1aa" }}>
          What can I safely spend today without hurting tomorrow?
        </div>

        <div style={{ marginTop: 56, display: "flex", gap: 16, fontSize: 26, color: "#10b981" }}>
          <span>Local-first</span>
          <span style={{ color: "#52525b" }}>•</span>
          <span>No account</span>
          <span style={{ color: "#52525b" }}>•</span>
          <span>Installable</span>
        </div>
      </div>
    ),
    size,
  );
}
