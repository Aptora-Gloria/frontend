// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";
import { AuthProvider } from "@/shared/contexts/AuthContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
