import { StrictMode, Component, ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in React lifecycle:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "40px 20px", 
          color: "#e11d48", 
          background: "#fff", 
          fontFamily: "monospace",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Etwas ist schiefgelaufen 😢</h2>
          <div style={{ 
            background: "#f8fafc", 
            border: "1px solid #cbd5e1", 
            borderRadius: "8px", 
            padding: "20px", 
            maxWidth: "600px", 
            textAlign: "left",
            overflowX: "auto"
          }}>
            <p style={{ fontWeight: "bold", margin: "0 0 10px 0" }}>{this.state.error?.toString()}</p>
            <pre style={{ fontSize: "12px", color: "#475569", margin: 0 }}>{this.state.error?.stack}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: "24px", 
              padding: "12px 24px", 
              background: "#6366f1", 
              color: "#fff", 
              border: "none", 
              borderRadius: "8px", 
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Seite neu laden 🔄
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
