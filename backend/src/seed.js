import "./env.js";
import { ensureSchema, pool, query } from "./db.js";

const permissionNames = ["everything", "italy", "franch", "german"];

const categoryPermissionMap = {
  Architecture: ["everything", "italy"],
  Culture: ["everything", "franch"],
  Design: ["everything", "german"],
  Essays: ["everything", "italy", "franch"],
  Analysis: ["everything", "german", "franch"],
};

const userPermissionMap = {
  "Adele Ward": ["everything", "italy"],
  "Mina Sol": ["everything", "franch"],
  "Elio Hart": ["everything", "german"],
  "Rhea Morgan": ["everything", "italy", "franch"],
  "Owen Pierce": ["everything", "german", "franch"],
};

const articlePatterns = {
  Architecture: [
    "Silent Resonance of Concrete",
    "Civic Light in Reading Rooms",
    "Corners of the Museum Wing",
    "The Patience of Stone Arcades",
    "How Stations Teach a City",
    "Roofs, Shadows, and Public Calm",
    "Why Plazas Need Edges",
    "A New Grammar for Towers",
    "The Quiet Geometry of Stairs",
    "When Libraries Feel Monumental",
  ],
  Culture: [
    "The Editorial Rhythm of the City Desk",
    "Posters, Corners, and Street Memory",
    "How Small Festivals Build Identity",
    "Night Trains and Shared Rituals",
    "The Return of the Neighborhood Paper",
    "Why Certain Cafes Become Landmarks",
    "Soft Power in Public Rooms",
    "The Mood of a Saturday Market",
    "Recording the Language of Queueing",
    "How Local Scenes Stay Alive",
  ],
  Design: [
    "Objects That Remember Light",
    "The Furniture That Teaches a Room",
    "Why Calm Interfaces Convert Better",
    "Table Lamps as Mood Editors",
    "The Warmth of Stone Counters",
    "Designing With One Dominant Material",
    "The Case for Slower Homepages",
    "Why Restraint Feels Premium",
    "Rooms Built Around One Chair",
    "Design Systems With Personality",
  ],
  Essays: [
    "Notes From the Quiet Archive",
    "Field Notes From a Coastal Residency",
    "Writing Near Weather",
    "A Week of Mornings and Margins",
    "The Useful Friction of Public Places",
    "On Returning to the Same Notebook",
    "What Silence Changes in a Draft",
    "The Long Walk Home After Editing",
    "Keeping Company With Unfinished Work",
    "How Certain Rooms Slow Thought",
  ],
  Analysis: [
    "The Map Room and the Modern Analyst",
    "How Dashboards Change Decisions",
    "Making Systems Legible Again",
    "A Framework for Reading Crowds",
    "The First Five Minutes of a Service Journey",
    "What Hotel Lobbies Teach Operations",
    "Why Sequence Beats Density",
    "The Cost of Interface Inflation",
    "Reading a Network Through Its Edges",
    "How Editors Prioritize Attention",
  ],
};

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const library = Object.entries(articlePatterns).flatMap(([category, titles], categoryIndex) =>
  titles.map((title, index) => {
    const authors = Object.keys(userPermissionMap);
    const authorName = authors[(categoryIndex + index) % authors.length];
    const slug = `${slugifyTitle(title)}-${String(index + 1).padStart(2, "0")}`;
    return [slug, title, category, authorName];
  }),
);

function buildContent(title, category) {
  return [
    { type: "paragraph", text: `${title} explores how ${category.toLowerCase()} can be shaped by editorial structure, atmosphere, and clear storytelling decisions.` },
    { type: "heading", text: "Why It Matters" },
    { type: "paragraph", text: "This article is seeded against the rebuilt schema so the app has realistic content tied to a user, a category, and inherited viewing permissions." },
    { type: "quote", text: "Permissions now flow through categories and users instead of being hard-coded into article rows." },
  ];
}

function buildHtml(content) {
  return content
    .map((block) => {
      if (block.type === "paragraph") return `<p>${block.text}</p>`;
      if (block.type === "heading") return `<h2>${block.text}</h2>`;
      if (block.type === "quote") return `<blockquote><p>${block.text}</p></blockquote>`;
      return "";
    })
    .join("");
}

function estimateReadTime(content) {
  const words = JSON.stringify(content).replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

async function insertNamedRows(table, names) {
  for (const name of names) {
    await query(`INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
  }
}

async function getLookup(table) {
  const result = await query(`SELECT id, name FROM ${table}`);
  return Object.fromEntries(result.rows.map((row) => [row.name, Number(row.id)]));
}

async function replaceJoinRows(table, leftColumn, leftId, rightColumn, rightIds) {
  await query(`DELETE FROM ${table} WHERE ${leftColumn} = $1`, [leftId]);
  for (const rightId of rightIds) {
    await query(
      `INSERT INTO ${table} (${leftColumn}, ${rightColumn}) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [leftId, rightId],
    );
  }
}

async function seed() {
  await ensureSchema();

  await insertNamedRows("permissions", permissionNames);
  await insertNamedRows("categories", Object.keys(categoryPermissionMap));
  await insertNamedRows("users", Object.keys(userPermissionMap));

  const permissionIds = await getLookup("permissions");
  const categoryIds = await getLookup("categories");
  const userIds = await getLookup("users");

  for (const [categoryName, names] of Object.entries(categoryPermissionMap)) {
    await replaceJoinRows(
      "category_permissions",
      "category_id",
      categoryIds[categoryName],
      "permission_id",
      names.map((name) => permissionIds[name]),
    );
  }

  for (const [userName, names] of Object.entries(userPermissionMap)) {
    await replaceJoinRows(
      "user_permissions",
      "user_id",
      userIds[userName],
      "permission_id",
      names.map((name) => permissionIds[name]),
    );
  }

  await query("DELETE FROM articles");

  for (const [slug, title, categoryName, userName] of library) {
    const content = buildContent(title, categoryName);
    await query(
      `
        INSERT INTO articles (
          slug, title, subtitle, user_id, category_id, status,
          content, body_html, read_time_minutes, published_at
        )
        VALUES ($1, $2, $3, $4, $5, 'published', $6::jsonb, $7, $8, NOW())
      `,
      [
        slug,
        title,
        `A rebuilt-schema feature in ${categoryName.toLowerCase()} authored by ${userName}.`,
        userIds[userName],
        categoryIds[categoryName],
        JSON.stringify(content),
        buildHtml(content),
        estimateReadTime(content),
      ],
    );
  }

  const counts = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM users"),
    query("SELECT COUNT(*)::int AS count FROM categories"),
    query("SELECT COUNT(*)::int AS count FROM permissions"),
    query("SELECT COUNT(*)::int AS count FROM articles"),
  ]);

  console.log(
    `Seeded users=${counts[0].rows[0].count}, categories=${counts[1].rows[0].count}, permissions=${counts[2].rows[0].count}, articles=${counts[3].rows[0].count}`,
  );
}

seed()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
