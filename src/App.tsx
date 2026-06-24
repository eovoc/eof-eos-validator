import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import ValidatorPage from "./pages/ValidatorPage";
import ConverterPage from "./pages/ConverterPage";

export default function App() {
  return (
    <HashRouter>
      <NavBar />
      <div className="app">
        <Routes>
          <Route path="/" element={<ValidatorPage />} />
          <Route path="/converter" element={<ConverterPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
