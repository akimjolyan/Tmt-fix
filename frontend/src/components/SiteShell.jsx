import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import { AppBar, Box, Chip, IconButton, MenuItem, TextField, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useUserContext } from "../context/UserContext";

const navItems = [
  { label: "Articles", to: "/articles" },
  { label: "The Editor", to: "/editor" },
  { label: "Archives", to: "/articles" },
  { label: "Essays", to: "/articles" },
  { label: "About", to: "/articles" },
];

export default function SiteShell({ children, active = "The Editor" }) {
  const { users, activeUserId, setActiveUserId, permissions, loading } = useUserContext();

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #f7f3ec 0%, #f1ece1 100%)" }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#171311", color: "#f4efe8" }}>
        <Toolbar sx={{ minHeight: 68, px: { xs: 2, md: 5 }, justifyContent: "space-between", gap: 2 }}>
          <Typography
            component={RouterLink}
            to="/editor"
            sx={{
              color: "inherit",
              textDecoration: "none",
              fontFamily: '"Cormorant Garamond", serif',
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: { xs: 30, md: 36 },
            }}
          >
            THE CURATOR
          </Typography>

          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 4, flex: 1, justifyContent: "center" }}>
            {navItems.map((item) => (
              <Typography
                key={item.label}
                component={RouterLink}
                to={item.to}
                sx={{
                  textDecoration: "none",
                  fontSize: 14,
                  color: active === item.label ? "#f7f3ec" : "rgba(247,243,236,0.74)",
                  borderBottom: active === item.label ? "2px solid #b84a2e" : "2px solid transparent",
                  pb: 0.5,
                  fontStyle: item.label === "The Editor" ? "italic" : "normal",
                }}
              >
                {item.label}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TextField
              select
              size="small"
              value={activeUserId}
              disabled={loading || !users.length}
              onChange={(event) => setActiveUserId(event.target.value)}
              sx={{
                minWidth: 170,
                "& .MuiOutlinedInput-root": {
                  color: "#f4efe8",
                  bgcolor: "rgba(255,255,255,0.06)",
                },
                "& .MuiSvgIcon-root": {
                  color: "#f4efe8",
                },
              }}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 0.75, flexWrap: "wrap", maxWidth: 320, justifyContent: "flex-end" }}>
              {permissions.map((permission) => (
                <Chip
                  key={permission.id}
                  size="small"
                  label={permission.name}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.08)",
                    color: "#f4efe8",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </Box>
            <IconButton color="inherit" component={RouterLink} to="/articles">
              <SearchRoundedIcon />
            </IconButton>
            <IconButton color="inherit">
              <AccountCircleOutlinedIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {children}
    </Box>
  );
}
