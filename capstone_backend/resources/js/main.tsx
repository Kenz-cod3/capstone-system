import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 👈 ADD THIS
import App from "./app";
import "../css/app.css";

ReactDOM.createRoot(document.getElementById("app")!).render(
    <BrowserRouter>   {/* 👈 WRAP APP */}
        <App />
    </BrowserRouter>
);