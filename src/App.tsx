import { createContext, useState } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import OgcValidatorPage from "./pages/OgcValidatorPage";
import StacConverterPage from "./pages/StacConverterPage";
import SettingsPage from "./pages/SettingsPage";
import { Settings } from "./types/Settings";

export type JsonFileContextType = { content: unknown; setContent: (c: unknown) => void };
export type SettingsContextType = { settings: Settings | null; setSettings: (s: Settings | null) => void };

export const JsonFileContext = createContext<JsonFileContextType | null>(null);
export const SettingsFileContext = createContext<SettingsContextType | null>(null);

export default function App() {
  const [content, setContent] = useState<unknown>(null);
  const [settingsContent, setSettingsContent] = useState<Settings | null>(null);

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
