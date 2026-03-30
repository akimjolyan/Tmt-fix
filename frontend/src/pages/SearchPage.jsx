import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Container, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Link as RouterLink } from "react-router-dom";
import SiteShell from "../components/SiteShell";
import { searchArticles } from "../api";

export default function SearchPage() {
  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      searchArticles(query)
        .then((data) => {
          if (!active) return;
          setArticles(data);
          setError("");
          setLoading(false);
        })
        .catch((loadError) => {
          if (!active) return;
          setError(loadError.message);
          setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <SiteShell active="Articles">
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
        <Stack spacing={4}>
          <Box>
            <Typography className="eyebrow">Browse / Search</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: "2.4rem", md: "4rem" }, mb: 1 }}>
              Search the article library
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
              Browse all articles by title, category, or author. The search updates instantly as you type.
            </Typography>
          </Box>

          <TextField
            fullWidth
            placeholder="Search by title, category, or author..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
            }}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}
          {loading && !error ? (
            <Box sx={{ p: 8, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : null}

          <Stack spacing={2.5}>
            {articles.map((article) => (
              <Box
                key={article.id}
                component={RouterLink}
                to={`/articles/${article.slug}`}
                sx={{
                  textDecoration: "none",
                  color: "inherit",
                  p: { xs: 2.5, md: 3 },
                  border: "1px solid rgba(23,20,17,0.08)",
                  bgcolor: "rgba(255,253,248,0.84)",
                  boxShadow: "0 16px 34px rgba(32,23,17,0.06)",
                  transition: "transform 180ms ease, box-shadow 180ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 22px 40px rgba(32,23,17,0.1)",
                  },
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={article.categoryName} />
                    <Chip size="small" label={article.userName} variant="outlined" />
                    {article.permissions?.map((permission) => (
                      <Chip key={`${article.id}-${permission.id}`} size="small" label={permission.name} variant="outlined" />
                    ))}
                  </Stack>
                  <Typography variant="h4" sx={{ fontSize: { xs: "1.6rem", md: "2.2rem" } }}>
                    {article.title}
                  </Typography>
                  <Typography color="text.secondary">{article.subtitle}</Typography>
                </Stack>
              </Box>
            ))}
          </Stack>

          {!loading && articles.length === 0 ? (
            <Alert severity="info">No articles matched your search.</Alert>
          ) : null}
        </Stack>
      </Container>
    </SiteShell>
  );
}
