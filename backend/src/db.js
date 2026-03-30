import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/tmt_news",
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

async function hasLegacyArticlesSchema() {
  const result = await query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'articles'
          AND column_name IN ('author_name', 'category', 'seo_description', 'hero_image_url')
      ) AS legacy
    `,
  );

  return result.rows[0]?.legacy;
}

async function rebuildSchema() {
  await query(`
    DROP TABLE IF EXISTS category_permissions CASCADE;
    DROP TABLE IF EXISTS user_permissions CASCADE;
    DROP TABLE IF EXISTS articles CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS permissions CASCADE;
  `);

  await query(`
    CREATE TABLE permissions (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE categories (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE user_permissions (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, permission_id)
    );

    CREATE TABLE category_permissions (
      category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (category_id, permission_id)
    );

    CREATE TABLE articles (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      content JSONB NOT NULL DEFAULT '[]'::jsonb,
      body_html TEXT NOT NULL DEFAULT '',
      read_time_minutes INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );
  `);
}

export async function ensureSchema() {
  const legacy = await hasLegacyArticlesSchema();
  if (legacy) {
    await rebuildSchema();
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS category_permissions (
      category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (category_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS articles (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      content JSONB NOT NULL DEFAULT '[]'::jsonb,
      body_html TEXT NOT NULL DEFAULT '',
      read_time_minutes INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );
  `);
}
