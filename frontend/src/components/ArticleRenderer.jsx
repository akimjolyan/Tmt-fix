import { Box, Chip, Container, Stack, Typography } from "@mui/material";
import { useUserContext } from "../context/UserContext";

export default function ArticleRenderer({ article }) {
  const { activeUser, permissions } = useUserContext();

  return (
    <Box className="article-page" dir="ltr">
      <Box className="article-header-section">
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
          <Box className="article-masthead article-masthead-no-hero" dir="ltr">
            <Box className="article-masthead-copy" dir="ltr">
              <Typography className="eyebrow">
                {article.categoryName || "Draft"} / {article.userName}
              </Typography>
              <Typography variant="h1" className="article-title">
                {article.title}
              </Typography>
              <Typography className="article-subtitle">{article.subtitle}</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
            <Chip label={`User: ${activeUser?.name || "No user"}`} />
            {permissions.map((permission) => (
              <Chip key={permission.id} label={permission.name} variant="outlined" />
            ))}
          </Stack>
        </Container>
      </Box>

      <Box className="article-content-section">
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Box className="article-body article-html article-body-bridged" dir="ltr" dangerouslySetInnerHTML={{ __html: article.bodyHtml || "" }} />
        </Container>
      </Box>
    </Box>
  );
}
