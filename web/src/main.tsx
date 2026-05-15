import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth-context";
import { CurrencyProvider } from "./lib/currency";
import { LanguageProvider } from "./lib/language";
import { SavedItemsProvider } from "./lib/saved-items";
import "./styles/tokens.css";
import "./styles/base.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <SavedItemsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SavedItemsProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
