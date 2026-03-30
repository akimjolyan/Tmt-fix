import { Navigate, Route, Routes } from "react-router-dom";
import ArticlePage from "./pages/ArticlePage";
import EditorPage from "./pages/EditorPage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/articles" replace />} />
      <Route path="/articles" element={<SearchPage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="/articles/:slug" element={<ArticlePage />} />
    </Routes>
  );
}
