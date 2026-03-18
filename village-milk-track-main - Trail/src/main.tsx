import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./App.css";

console.log("main.tsx loaded");

const rootElement = document.getElementById("root");
console.log("root element:", rootElement);

if (!rootElement) {
  console.error("Root element not found!");
} else {
  console.log("Creating root and rendering app...");
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("App rendered successfully");
}
