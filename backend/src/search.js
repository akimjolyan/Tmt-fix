import { Client } from "@elastic/elasticsearch";

const indexName = process.env.ELASTICSEARCH_INDEX || "tmt_articles";
let client;

function getClient() {
  if (!client) {
    const node = process.env.ELASTICSEARCH_NODE || "http://localhost:9200";
    const username = process.env.ELASTICSEARCH_USERNAME;
    const password = process.env.ELASTICSEARCH_PASSWORD;
    const rejectUnauthorized = process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED !== "false";

    client = new Client({
      node,
      auth: username && password ? { username, password } : undefined,
      tls: node.startsWith("https://")
        ? {
            rejectUnauthorized,
          }
        : undefined,
    });
  }

  return client;
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function contentToText(content = []) {
  return JSON.stringify(content).replace(/[{}[\]":,]/g, " ").replace(/\s+/g, " ").trim();
}

export function toSearchDocument(article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    status: article.status,
    userId: article.userId,
    userName: article.userName,
    categoryId: article.categoryId,
    categoryName: article.categoryName,
    permissions: article.permissions || [],
    permissionNames: (article.permissions || []).map((permission) => permission.name),
    bodyHtml: article.bodyHtml,
    bodyText: stripHtml(article.bodyHtml) || contentToText(article.content),
    readTimeMinutes: article.readTimeMinutes,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    publishedAt: article.publishedAt,
  };
}

export async function ensureSearchIndex() {
  const elastic = getClient();
  const exists = await elastic.indices.exists({ index: indexName });
  if (exists) return;

  await elastic.indices.create({
    index: indexName,
    mappings: {
      properties: {
        id: { type: "long" },
        slug: { type: "keyword" },
        title: { type: "text" },
        subtitle: { type: "text" },
        status: { type: "keyword" },
        userId: { type: "long" },
        userName: { type: "text", fields: { keyword: { type: "keyword" } } },
        categoryId: { type: "long" },
        categoryName: { type: "text", fields: { keyword: { type: "keyword" } } },
        permissionNames: { type: "keyword" },
        bodyHtml: { type: "text", index: false },
        bodyText: { type: "text" },
        readTimeMinutes: { type: "integer" },
        createdAt: { type: "date" },
        updatedAt: { type: "date" },
        publishedAt: { type: "date" },
      },
    },
  });
}

export async function indexArticle(article) {
  const elastic = getClient();
  await ensureSearchIndex();
  await elastic.index({
    index: indexName,
    id: String(article.id),
    document: toSearchDocument(article),
    refresh: true,
  });
}

export async function bulkIndexArticles(articles) {
  if (!articles.length) return;

  const elastic = getClient();
  await ensureSearchIndex();
  await elastic.deleteByQuery({
    index: indexName,
    query: { match_all: {} },
    refresh: true,
  }).catch(() => {});

  const operations = articles.flatMap((article) => [
    { index: { _index: indexName, _id: String(article.id) } },
    toSearchDocument(article),
  ]);

  await elastic.bulk({
    refresh: true,
    operations,
  });
}

export async function searchArticles(queryText = "", size = 50) {
  const elastic = getClient();
  await ensureSearchIndex();

  const response = await elastic.search({
    index: indexName,
    size,
    query: queryText.trim()
      ? {
          multi_match: {
            query: queryText,
            fields: ["title^4", "subtitle^3", "categoryName^2", "userName^2", "bodyText"],
            fuzziness: "AUTO",
          },
        }
      : { match_all: {} },
    sort: queryText.trim()
      ? undefined
      : [{ publishedAt: { order: "desc", unmapped_type: "date" } }, { updatedAt: { order: "desc" } }],
  });

  return response.hits.hits.map((hit) => hit._source);
}
