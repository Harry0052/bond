"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#fff6f1", color: "#1e2340", fontFamily: "Georgia, serif", margin: 0 }}>
        <main id="main" style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px" }}>
          <h1 style={{ fontSize: "2.5rem", lineHeight: 1.1 }}>Bond hit a problem</h1>
          <p style={{ fontSize: "1.125rem", lineHeight: 1.6 }}>
            This screen did not finish loading. Saved names stay on the server.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              minHeight: 48,
              border: 0,
              borderRadius: 999,
              background: "#4f63f8",
              color: "#ffffff",
              fontWeight: 700,
              padding: "0 20px",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
