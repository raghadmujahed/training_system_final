import 'bootstrap/dist/css/bootstrap.min.css';
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/sidebar.css";
import "./styles/auth.css";
import "./styles/dashboard.css";
import "./styles/admin.css";
import "./styles/field-supervisor.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);