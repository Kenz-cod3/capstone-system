import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app";
import "../css/app.css";

import "antd/dist/reset.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("app")!).render(
    <QueryClientProvider client={queryClient}>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </QueryClientProvider>
);