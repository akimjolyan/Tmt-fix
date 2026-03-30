import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded";
import HorizontalRuleRoundedIcon from "@mui/icons-material/HorizontalRuleRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import StrikethroughSRoundedIcon from "@mui/icons-material/StrikethroughSRounded";
import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";

const blockOptions = [
  { label: "Paragraph", value: "paragraph" },
  { label: "Header 1", value: "h1" },
  { label: "Header 2", value: "h2" },
  { label: "Header 3", value: "h3" },
  { label: "Header 4", value: "h4" },
  { label: "Quote", value: "blockquote" },
];

const fontSizes = ["14px", "16px", "18px", "20px", "24px", "32px", "48px"];

function ToolButton({ onClick, children, active = false, title }) {
  return (
    <Tooltip title={title}>
      <Button
        onClick={onClick}
        variant="text"
        sx={{
          minWidth: 42,
          color: active ? "#b34b2f" : "#171411",
          borderRight: "1px solid rgba(23,20,17,0.08)",
          borderRadius: 0,
          px: 1.5,
        }}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

function getBlockValue(editor) {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("heading", { level: 4 })) return "h4";
  if (editor.isActive("blockquote")) return "blockquote";
  return "paragraph";
}

function applyBlockType(editor, value) {
  const chain = editor.chain().focus();

  if (value === "paragraph") {
    chain.setParagraph().run();
    return;
  }

  if (value === "blockquote") {
    chain.toggleBlockquote().run();
    return;
  }

  const headingLevel = Number(value.replace("h", ""));
  chain.toggleHeading({ level: headingLevel }).run();
}

export default function EditorToolbar({ editor, onImageUpload, onImageTemplate, onFileUpload }) {
  if (!editor) return null;

  const currentColor = editor.getAttributes("textStyle").color || "#2d241e";
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "16px";

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      spacing={2}
      sx={{
        p: 1.5,
        bgcolor: "background.paper",
        border: "1px solid rgba(23,20,17,0.08)",
        boxShadow: "0 16px 34px rgba(32, 23, 17, 0.08)",
      }}
    >
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ width: "100%" }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Select
            size="small"
            value={getBlockValue(editor)}
            onChange={(event) => applyBlockType(editor, event.target.value)}
            sx={{ minWidth: 150, bgcolor: "#fffaf3" }}
          >
            {blockOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            value={currentFontSize}
            onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()}
            sx={{ minWidth: 110, bgcolor: "#fffaf3" }}
          >
            {fontSizes.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>

          <TextField
            size="small"
            type="color"
            label="Text color"
            value={currentColor}
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            sx={{ width: 110, bgcolor: "#fffaf3" }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
          <ToolButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBoldRoundedIcon />
          </ToolButton>
          <ToolButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <FormatItalicRoundedIcon />
          </ToolButton>
          <ToolButton title="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <StrikethroughSRoundedIcon />
          </ToolButton>
          <ToolButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <FormatListBulletedRoundedIcon />
          </ToolButton>
          <ToolButton title="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <FormatListNumberedRoundedIcon />
          </ToolButton>
          <ToolButton title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <FormatQuoteRoundedIcon />
          </ToolButton>
          <ToolButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <HorizontalRuleRoundedIcon />
          </ToolButton>
          <ToolButton
            title="Link"
            onClick={() => {
              const url = window.prompt("Paste a URL");
              if (url) {
                editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
              }
            }}
          >
            <LinkRoundedIcon />
          </ToolButton>
          <ToolButton title="Upload image" onClick={onImageUpload}>
            <ImageOutlinedIcon />
          </ToolButton>
          <ToolButton title="Insert file" onClick={onFileUpload}>
            <InsertDriveFileOutlinedIcon />
          </ToolButton>
          <ToolButton title="Image template" onClick={onImageTemplate}>
            <ViewAgendaRoundedIcon />
          </ToolButton>
        </Box>
      </Stack>
    </Stack>
  );
}
