import { ImageResponse } from "next/og"

/**
 * iOS ne gère pas les icônes SVG: celle-ci est rastérisée à la construction,
 * ce qui évite d'entretenir un PNG à la main.
 */
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

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
          background: "#2F7D7A",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#FDF8F3"
            d="M90 142c-1.7 0-3.4-.6-4.7-1.8l-42.4-38.6C33.2 92.9 28 81.6 28 69.4 28 49.4 43.9 33 63.6 33c10.3 0 20.1 4.5 26.4 12.1C96.3 37.5 106.1 33 116.4 33 136.1 33 152 49.4 152 69.4c0 12.2-5.2 23.5-14.9 32.2l-42.4 38.6c-1.3 1.2-3 1.8-4.7 1.8Z"
          />
        </svg>
      </div>
    ),
    size,
  )
}
