"use client";

// Last-resort screen if the root layout itself fails. Plain styles: the app CSS may not have loaded.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#fdf8f0",
          color: "#2a1a14",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Tirumala Plastics</h1>
          <p>The register couldn&apos;t open. Please check the internet and try again.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 12,
              padding: "12px 20px",
              borderRadius: 12,
              border: 0,
              background: "#6b1a0e",
              color: "#fff",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
