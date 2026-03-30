import { Kafka, logLevel } from "kafkajs";

const kafkaBrokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafkaTopic = process.env.KAFKA_TOPIC || "article-sync";
const kafkaEnabled = process.env.KAFKA_ENABLED !== "false";

let producer;

function getKafka() {
  return new Kafka({
    clientId: "tmt-backend",
    brokers: kafkaBrokers,
    logLevel: logLevel.NOTHING,
  });
}

async function getProducer() {
  if (!producer) {
    producer = getKafka().producer();
    await producer.connect();
  }

  return producer;
}

export async function publishArticleUpsert(article) {
  if (!kafkaEnabled) return;

  const connectedProducer = await getProducer();
  await connectedProducer.send({
    topic: kafkaTopic,
    messages: [
      {
        key: String(article.id),
        value: JSON.stringify({
          type: "article.upsert",
          article,
        }),
      },
    ],
  });
}

export async function startArticleSyncConsumer(onMessage) {
  if (!kafkaEnabled) {
    throw new Error("Kafka sync is disabled.");
  }

  const consumer = getKafka().consumer({ groupId: process.env.KAFKA_GROUP_ID || "tmt-search-indexer" });
  await consumer.connect();
  await consumer.subscribe({ topic: kafkaTopic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const payload = JSON.parse(message.value.toString());
      await onMessage(payload);
    },
  });
}
