import "./env.js";
import { startArticleSyncConsumer } from "./kafka.js";
import { ensureSearchIndex, indexArticle } from "./search.js";

const retryDelayMs = Number(process.env.SEARCH_CONSUMER_RETRY_MS || 5000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Keep retrying so local/dev startup order or temporary Elastic outages don't kill the worker.
  // This is especially useful when Kafka/Postgres/API are up before Elasticsearch is ready.
  // In managed environments it also gives the pod a chance to recover without manual restarts.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await ensureSearchIndex();

      await startArticleSyncConsumer(async (payload) => {
        if (payload.type === "article.upsert" && payload.article) {
          await indexArticle(payload.article);
        }
      });

      return;
    } catch (error) {
      console.error(
        `Search consumer failed to connect. Retrying in ${retryDelayMs}ms.`,
        error.message || error,
      );
      await sleep(retryDelayMs);
    }
  }
}

main().catch((error) => {
  console.error("Search consumer failed", error);
  process.exit(1);
});
