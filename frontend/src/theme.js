import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#151210",
    },
    secondary: {
      main: "#b34b2f",
    },
    background: {
      default: "#f6f1e8",
      paper: "#fffdf8",
    },
    text: {
      primary: "#171411",
      secondary: "#675d52",
    },
  },
  typography: {
    fontFamily: '"Manrope", sans-serif',
    h1: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 0,
  },
});
