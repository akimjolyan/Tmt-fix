import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import SiteShell from "../components/SiteShell";
import EditorToolbar from "../components/EditorToolbar";
import { fetchEditorOptions, saveArticle, uploadFile, uploadImage } from "../api";
import { Color, FontSize, RichTextStyle } from "../editor/extensions";

const MultiImage = Image.extend({
  name: "multiImage",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      images: {
        default: [],
      },
    };
  },
  parseHTML() {
    return [{ tag: "multi-image" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "multi-image",
      HTMLAttributes,
      [
        "div",
        { class: "multi-image-grid" },
        ...(node.attrs.images || []).map((image) => [
          "figure",
          {},
          ["img", { src: image.src, alt: image.alt || "" }],
          ["figcaption", {}, image.caption || ""],
        ]),
      ],
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "multi-image-node";
      const wrapper = document.createElement("div");
      wrapper.className = "multi-image-grid";

      (node.attrs.images || []).forEach((image) => {
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        img.src = image.src;
        img.alt = image.alt || "";
        const caption = document.createElement("figcaption");
        caption.innerText = image.caption || "";
        figure.append(img, caption);
        wrapper.appendChild(figure);
      });

      dom.appendChild(wrapper);
      return { dom };
    };
  },
});

export default function EditorPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const [form, setForm] = useState({
    id: null,
    slug: "",
    title: "",
    subtitle: "",
    userId: "",
    categoryId: "",
  });
  const [editorOptions, setEditorOptions] = useState({ users: [], categories: [] });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      MultiImage,
      RichTextStyle,
      Color,
      FontSize,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Begin your narrative journey here..." }),
    ],
    content: { type: "doc", content: [] },
  });

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timeout = setTimeout(() => setStatusMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    let active = true;

    fetchEditorOptions()
      .then((options) => {
        if (!active) return;
        setEditorOptions({
          users: options.users || [],
          categories: options.categories || [],
        });
        setForm((current) => ({
          ...current,
          userId: current.userId || options.users?.[0]?.id || "",
          categoryId: current.categoryId || options.categories?.[0]?.id || "",
        }));
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleInlineImageUpload(file) {
    try {
      const uploaded = await uploadImage(file);
      editor.chain().focus().setImage({ src: uploaded.url, alt: uploaded.alt, caption: "" }).run();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleAttachmentUpload(file) {
    try {
      const uploaded = await uploadFile(file);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: uploaded.name,
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: uploaded.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  },
                },
              ],
            },
          ],
        })
        .run();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function selectFiles() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => resolve(Array.from(input.files || []));
      input.onerror = () => reject(new Error("File selection failed."));
      input.click();
    });
  }

  async function insertImageTemplate() {
    try {
      const firstCaption = window.prompt("Caption for the first image") || "";
      const secondCaption = window.prompt("Caption for the second image") || "";
      const [fileOne] = await selectFiles();
      const [fileTwo] = await selectFiles();

      if (!fileOne || !fileTwo) {
        throw new Error("Two images are required for the split template.");
      }

      const [uploadedOne, uploadedTwo] = await Promise.all([uploadImage(fileOne), uploadImage(fileTwo)]);

      editor
        .chain()
        .focus()
        .insertContent({
          type: "multiImage",
          attrs: {
            images: [
              { src: uploadedOne.url, alt: uploadedOne.alt, caption: firstCaption },
              { src: uploadedTwo.url, alt: uploadedTwo.alt, caption: secondCaption },
            ],
          },
        })
        .run();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function persistArticle(nextStatus) {
    if (!editor) return;

    try {
      setErrorMessage("");
      const payload = {
        ...form,
        content: editor.getJSON().content || [],
        bodyHtml: editor.getHTML(),
      };
      const saved = await saveArticle(
        nextStatus === "published" ? "/api/articles/publish" : "/api/articles/draft",
        payload,
      );
      setForm((current) => ({ ...current, id: saved.id, slug: saved.slug }));
      setStatusMessage(nextStatus === "published" ? "Article published." : "Draft saved.");
      if (nextStatus === "published") {
        navigate(`/articles/${saved.slug}`);
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  const selectedCategory = editorOptions.categories.find((category) => String(category.id) === String(form.categoryId));

  return (
    <SiteShell active="The Editor">
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Stack spacing={4}>
          <Box>
            <Typography className="eyebrow">Draft / New Artifact</Typography>
            <TextField
              variant="standard"
              fullWidth
              placeholder="Enter an authoritative title..."
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              InputProps={{ disableUnderline: true }}
              sx={editorTitleStyles}
            />
            <TextField
              variant="standard"
              fullWidth
              placeholder="Provide a compelling sub-headline or brief summary..."
              value={form.subtitle}
              onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
              InputProps={{ disableUnderline: true }}
              sx={editorSubtitleStyles}
            />
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Author"
              select
              fullWidth
              value={form.userId}
              onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
            >
              {editorOptions.users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Category"
              select
              fullWidth
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            >
              {editorOptions.categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary" sx={{ width: "100%" }}>
              Category permissions
            </Typography>
            {(selectedCategory?.permissions || []).map((permission) => (
              <Chip key={permission.id} label={permission.name} />
            ))}
            {!selectedCategory?.permissions?.length ? <Chip label="No permissions" variant="outlined" /> : null}
          </Stack>

          <EditorToolbar
            editor={editor}
            onImageUpload={() => fileInputRef.current?.click()}
            onImageTemplate={insertImageTemplate}
            onFileUpload={() => attachmentInputRef.current?.click()}
          />

          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleInlineImageUpload(file);
                event.target.value = "";
              }
            }}
          />
          <input
            ref={attachmentInputRef}
            hidden
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleAttachmentUpload(file);
                event.target.value = "";
              }
            }}
          />

          <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, minHeight: 480, border: "1px solid rgba(23,20,17,0.08)" }}>
            <EditorContent editor={editor} className="editor-surface" />
          </Paper>

          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip label={`Blocks: ${(editor?.getJSON?.().content || []).length}`} />
              <Typography variant="body2" color="text.secondary">
                Supports rich text styling, multiple header levels, lists, file links, inline images, split galleries, quotes, and links.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button variant="text" sx={{ color: "#b34b2f" }} onClick={() => persistArticle("draft")}>
                Save Draft
              </Button>
              <Button variant="contained" sx={{ bgcolor: "#171311" }} onClick={() => persistArticle("published")}>
                Publish
              </Button>
            </Stack>
          </Stack>

          {statusMessage ? <Alert severity="success">{statusMessage}</Alert> : null}
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {form.slug ? (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  component={RouterLink}
                  to={`/articles/${form.slug}`}
                >
                  View article
                </Button>
              }
            >
              Article URL: /articles/{form.slug}
            </Alert>
          ) : null}

          <Divider />
          <Typography variant="body2" color="text.secondary">
            Published articles appear at `/articles/:slug` after the first publish action.
          </Typography>
        </Stack>
      </Container>
    </SiteShell>
  );
}

const editorTitleStyles = {
  mt: 2,
  "& .MuiInputBase-input": {
    fontFamily: '"Cormorant Garamond", serif',
    fontStyle: "italic",
    fontSize: { xs: "3rem", md: "5.5rem" },
    lineHeight: 0.95,
    color: "#d8d2ca",
  },
};

const editorSubtitleStyles = {
  mt: 2,
  "& .MuiInputBase-input": {
    fontSize: { xs: "1.2rem", md: "2rem" },
    color: "#bdb4aa",
    borderBottom: "1px solid rgba(23,20,17,0.08)",
    pb: 2,
  },
};
