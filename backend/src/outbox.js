import { query } from "./db.js";

export async function enqueueOutboxEvent(client, event) {
  await client.query(
    `
      INSERT INTO outbox_events (
        aggregate_type,
        aggregate_id,
        event_type,
        payload
      )
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [
      event.aggregateType,
      event.aggregateId,
      event.eventType,
      JSON.stringify(event.payload),
    ],
  );
}

export async function listPendingOutboxEvents(limit = 25) {
  const result = await query(
    `
      SELECT id, aggregate_type, aggregate_id, event_type, payload, created_at, processed_at
      FROM outbox_events
      WHERE processed_at IS NULL
      ORDER BY created_at ASC, id ASC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows;
}

export async function fetchOutboxEventById(id) {
  const result = await query(
    `
      SELECT id, aggregate_type, aggregate_id, event_type, payload, created_at, processed_at
      FROM outbox_events
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

export async function markOutboxEventProcessed(id) {
  await query(
    `
      UPDATE outbox_events
      SET processed_at = NOW()
      WHERE id = $1
    `,
    [id],
  );
}
