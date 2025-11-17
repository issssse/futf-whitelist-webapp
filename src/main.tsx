import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import favicon from "@/assets/logo13.png";

const ensureFavicon = (href: string) => {
  const existing = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  const link = existing ?? document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.sizes = "13x13";
  link.href = href;

  if (!existing) {
    document.head.appendChild(link);
  }
};

ensureFavicon(favicon);

createRoot(document.getElementById("root")!).render(<App />);
