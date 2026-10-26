import { createRoot } from "react-dom/client";
import App from "./App";
import { syncOutbox } from "./db";
import "./styles.css";

window.addEventListener("online", syncOutbox);
syncOutbox();
createRoot(document.getElementById("root")!).render(<App />);
