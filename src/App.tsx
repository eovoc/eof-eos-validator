import { createContext, useState } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import OgcValidatorPage from "./pages/OgcValidatorPage";
import StacConverterPage from "./pages/StacConverterPage";
import SettingsPage from "./pages/SettingsPage";

export type JsonFileContextType = { content: unknown; setContent: (c: unknown) => void };
export type SettingsContextType = { settings: unknown; setSettings: (c: unknown) => void };

export const JsonFileContext = createContext<JsonFileContextType | null>(null);
export const SettingsFileContext = createContext<SettingsContextType | null>(null);

export default function App() {
  const [content, setContent] = useState<unknown>(null);
  const [settingsContent, setSettingsContent] = useState<unknown>(null);

  return (
    <JsonFileContext.Provider value={{ content, setContent }}>
      <SettingsFileContext.Provider value={{ settings: settingsContent, setSettings: setSettingsContent }}>
        <HashRouter>
          <NavBar />
          <div className="app">
            <Routes>
              <Route path="/" element={<OgcValidatorPage />} />
              <Route path="/converter" element={<StacConverterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </HashRouter>
      </SettingsFileContext.Provider>
    </JsonFileContext.Provider>
  );
}
