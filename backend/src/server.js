import "./env.js";
import cors from "cors";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import slugify from "slugify";
import { fileURLToPath } from "url";
import { fetchArticleById, fetchArticleByIdentifier, listArticles } from "./articles.js";
import { ensureSchema, query } from "./db.js";
import { publishArticleUpsert } from "./kafka.js";
import { ensureSearchIndex, searchArticles } from "./search.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "..", "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));

function createSlug(title) {
  const base = slugify(title || "untitled-article", { lower: true, strict: true });
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeReadTime(content = []) {
  const words = JSON.stringify(content)
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function fallbackFilterArticles(articles, queryText = "") {
  const normalized = String(queryText).trim().toLowerCase();
  if (!normalized) return articles;

  return articles.filter((article) =>
    [article.title, article.subtitle, article.categoryName, article.userName, article.bodyHtml]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
}

async function saveArticle(req, res, next, status) {
  try {
    const {
      id,
      title,
      subtitle = "",
      userId,
      categoryId,
      content = [],
      bodyHtml = "",
    } = req.body;

    if (!title || !userId || !categoryId) {
      return res.status(400).json({ message: "Title, user, and category are required." });
    }

    const readTimeMinutes = computeReadTime(content);
    const publishedAt = status === "published" ? new Date().toISOString() : null;

    let articleId = id;

    if (id) {
      const result = await query(
        `
          UPDATE articles
          SET title = $1,
              subtitle = $2,
              user_id = $3,
              category_id = $4,
              status = $5,
              content = $6::jsonb,
              body_html = $7,
              read_time_minutes = $8,
              updated_at = NOW(),
              published_at = CASE
                WHEN $5 = 'published' THEN COALESCE(published_at, $9::timestamptz)
                ELSE published_at
              END
          WHERE id = $10
          RETURNING id
        `,
        [
          title,
          subtitle,
          userId,
          categoryId,
          status,
          JSON.stringify(content),
          bodyHtml,
          readTimeMinutes,
          publishedAt,
          id,
        ],
      );

      if (!result.rows.length) {
        return res.status(404).json({ message: "Article not found." });
      }
    } else {
      const inserted = await query(
        `
          INSERT INTO articles (
            slug,
            title,
            subtitle,
            user_id,
            category_id,
            status,
            content,
            body_html,
            read_time_minutes,
            published_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::timestamptz)
          RETURNING id
        `,
        [
          createSlug(title),
          title,
          subtitle,
          userId,
          categoryId,
          status,
          JSON.stringify(content),
          bodyHtml,
          readTimeMinutes,
          publishedAt,
        ],
      );

      articleId = inserted.rows[0].id;
    }

    const saved = await fetchArticleById(articleId);
    try {
      await publishArticleUpsert(saved);
    } catch (syncError) {
      console.error("Failed to publish article sync event", syncError);
    }

    return res.status(id ? 200 : 201).json(saved);
  } catch (error) {
    next(error);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/editor/options", async (_req, res, next) => {
  try {
    const [users, categories, permissions, categoryPermissions, userPermissions] = await Promise.all([
      query("SELECT id, name FROM users ORDER BY name ASC"),
      query("SELECT id, name FROM categories ORDER BY name ASC"),
      query("SELECT id, name FROM permissions ORDER BY id ASC"),
      query(`
        SELECT cp.category_id, p.id, p.name
        FROM category_permissions cp
        JOIN permissions p ON p.id = cp.permission_id
        ORDER BY cp.category_id, p.id
      `),
      query(`
        SELECT up.user_id, p.id, p.name
        FROM user_permissions up
        JOIN permissions p ON p.id = up.permission_id
        ORDER BY up.user_id, p.id
      `),
    ]);

    res.json({
      users: users.rows.map((row) => ({ id: Number(row.id), name: row.name })),
      categories: categories.rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        permissions: categoryPermissions.rows
          .filter((permissionRow) => Number(permissionRow.category_id) === Number(row.id))
          .map((permissionRow) => ({ id: Number(permissionRow.id), name: permissionRow.name })),
      })),
      permissions: permissions.rows.map((row) => ({ id: Number(row.id), name: row.name })),
      userPermissions: userPermissions.rows.map((row) => ({
        userId: Number(row.user_id),
        permissionId: Number(row.id),
        permissionName: row.name,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/articles", async (_req, res, next) => {
  try {
    res.json(await listArticles());
  } catch (error) {
    next(error);
  }
});

app.get("/api/articles/search", async (req, res, next) => {
  try {
    try {
      res.json(await searchArticles(req.query.q || ""));
    } catch (searchError) {
      console.error("Elasticsearch search failed, falling back to Postgres-backed filtering", searchError.message);
      const articles = await listArticles();
      res.json(fallbackFilterArticles(articles, req.query.q || ""));
    }
  } catch (error) {
    next(error);
  }
});

app.get("/api/articles/:slug", async (req, res, next) => {
  try {
    const article = await fetchArticleByIdentifier(req.params.slug);
    if (!article) {
      return res.status(404).json({ message: "Article not found." });
    }

    return res.json(article);
  } catch (error) {
    next(error);
  }
});

app.post("/api/articles/draft", (req, res, next) => saveArticle(req, res, next, "draft"));
app.post("/api/articles/publish", (req, res, next) => saveArticle(req, res, next, "published"));

app.post("/api/uploads", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded." });
  }

  return res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    alt: req.file.originalname,
  });
});

app.post("/api/uploads/file", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  return res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: "Something went wrong on the server.",
    details: error.message,
  });
});

ensureSchema()
  .then(() => {
    return ensureSearchIndex().catch((error) => {
      console.error("Elasticsearch index bootstrap skipped", error.message);
    });
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`TMT backend listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database schema", error);
    process.exit(1);
  });
