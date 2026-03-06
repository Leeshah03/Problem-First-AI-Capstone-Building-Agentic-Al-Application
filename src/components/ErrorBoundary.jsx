import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0C111D",
          color: "#F2F4F7",
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "#F044381a", border: "1px solid #F0443840",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, fontSize: 24,
            }}>
              !
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
              Something went wrong
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#98A2B3", lineHeight: 1.6 }}>
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "#7F56D9",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
