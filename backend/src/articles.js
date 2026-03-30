import { query } from "./db.js";

export const articleSelect = `
  SELECT
    a.*,
    u.id AS user_id,
    u.name AS user_name,
    c.id AS category_id,
    c.name AS category_name,
    COALESCE(
      json_agg(
        DISTINCT jsonb_build_object('id', p.id, 'name', p.name)
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::json
    ) AS permissions
  FROM articles a
  JOIN users u ON u.id = a.user_id
  JOIN categories c ON c.id = a.category_id
  LEFT JOIN category_permissions cp ON cp.category_id = c.id
  LEFT JOIN permissions p ON p.id = cp.permission_id
`;

export function mapArticle(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    content: row.content,
    bodyHtml: row.body_html,
    readTimeMinutes: row.read_time_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    userId: Number(row.user_id),
    userName: row.user_name,
    categoryId: Number(row.category_id),
    categoryName: row.category_name,
    permissions: row.permissions || [],
  };
}

export async function fetchArticleRowByWhere(whereClause, params = []) {
  const result = await query(
    `
      ${articleSelect}
      WHERE ${whereClause}
      GROUP BY a.id, u.id, c.id
    `,
    params,
  );

  return result.rows[0] || null;
}

export async function fetchArticleById(id) {
  const row = await fetchArticleRowByWhere("a.id = $1", [id]);
  return row ? mapArticle(row) : null;
}

export async function fetchArticleByIdentifier(identifier) {
  const row = /^\d+$/.test(String(identifier))
    ? await fetchArticleRowByWhere("a.id = $1 OR a.slug = $2", [Number(identifier), String(identifier)])
    : await fetchArticleRowByWhere("a.slug = $1", [String(identifier)]);

  return row ? mapArticle(row) : null;
}

export async function listArticles() {
  const result = await query(
    `
      ${articleSelect}
      GROUP BY a.id, u.id, c.id
      ORDER BY COALESCE(a.published_at, a.updated_at) DESC, a.created_at DESC
    `,
  );

  return result.rows.map(mapArticle);
}
