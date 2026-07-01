import { createContext, useState } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import ValidatorPage from "./pages/ValidatorPage";
import ConverterPage from "./pages/ConverterPage";

export type JsonFileContextType = { content: unknown; setContent: (c: unknown) => void };

export const JsonFileContext = createContext<JsonFileContextType | null>(null);

export default function App() {
  const [content, setContent] = useState<unknown>(null);

  return (
    <JsonFileContext.Provider value={{ content, setContent }}>
      <HashRouter>
        <NavBar />
        <div className="app">
          <Routes>
            <Route path="/" element={<ValidatorPage />} />
            <Route path="/converter" element={<ConverterPage />} />
          </Routes>
        </div>
      </HashRouter>
    </JsonFileContext.Provider>
  );
}
