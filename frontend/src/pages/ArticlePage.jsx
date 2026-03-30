import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";
import { fetchArticle } from "../api";
import ArticleRenderer from "../components/ArticleRenderer";
import SiteShell from "../components/SiteShell";

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchArticle(slug)
      .then((data) => {
        if (active) setArticle(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <SiteShell active="Articles">
      {error ? (
        <Box sx={{ p: 6 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : null}
      {!article && !error ? (
        <Box sx={{ p: 8, display: "grid", placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : null}
      {article ? <ArticleRenderer article={article} /> : null}
    </SiteShell>
  );
}
