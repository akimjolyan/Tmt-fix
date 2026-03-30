import "./env.js";
import { listArticles } from "./articles.js";
import { ensureSchema } from "./db.js";
import { bulkIndexArticles, ensureSearchIndex } from "./search.js";

async function main() {
  await ensureSchema();
  await ensureSearchIndex();
  const articles = await listArticles();
  await bulkIndexArticles(articles);
  console.log(`Indexed ${articles.length} articles into Elasticsearch.`);
}

main().catch((error) => {
  console.error("Search reindex failed", error);
  process.exit(1);
});
