import { createContext } from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import ValidatorPage from "./pages/ValidatorPage";
import ConverterPage from "./pages/ConverterPage";
import useJsonFile from "./hooks/useJsonFile";

type JsonFileContextType = ReturnType<typeof useJsonFile>;

export const JsonFileContext = createContext<JsonFileContextType | null>(null);

export default function App() {
  const jsonFile = useJsonFile();

  return (
    <JsonFileContext.Provider value={jsonFile}>
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
