import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import WidgetApp from "./widget/WidgetApp";
import "./styles/tokens.css";
import "./styles/app.css";

const isWidget = window.location.hash.startsWith("#/widget");
if (isWidget) document.documentElement.classList.add("widget-mode");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isWidget ? <WidgetApp /> : <App />}</React.StrictMode>
);
