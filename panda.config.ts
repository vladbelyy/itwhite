import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,
  include: ["./src/**/*.{astro,js,jsx,ts,tsx}"],
  exclude: [],
  outdir: "styled-system",
  jsxFramework: "react",
  theme: {
    extend: {
      tokens: {
        colors: {
          paper: { value: "#F2F1EC" },
          surface: { value: "#E7E5DF" },
          ink: { value: "#111111" },
          muted: { value: "#66645F" },
          dark: { value: "#111214" },
          signal: { value: "#FF4D00" },
          ok: { value: "#B7F45B" },
          line: { value: "rgba(17,17,17,0.14)" }
        },
        fonts: {
          display: { value: "Inter Tight, Arial Narrow, Arial, sans-serif" },
          body: { value: "Inter, Arial, sans-serif" },
          mono: { value: "JetBrains Mono, SFMono-Regular, Consolas, monospace" }
        },
        spacing: {
          rail: { value: "clamp(18px, 3vw, 48px)" },
          section: { value: "clamp(80px, 13vw, 180px)" }
        },
        radii: {
          window: { value: "8px" }
        },
        animations: {
          scan: { value: "scan 1.3s ease-out both" },
          marquee: { value: "marquee 28s linear infinite" }
        }
      },
      semanticTokens: {
        colors: {
          bg: { value: "{colors.paper}" },
          text: { value: "{colors.ink}" },
          subtle: { value: "{colors.muted}" },
          accent: { value: "{colors.signal}" },
          positive: { value: "{colors.ok}" }
        }
      }
    }
  },
  patterns: {
    extend: {
      systemGrid: {
        description: "Asymmetric 12-column workspace grid",
        properties: {},
        transform() {
          return {
            display: "grid",
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(12px, 1.4vw, 24px)"
          };
        }
      }
    }
  }
});
