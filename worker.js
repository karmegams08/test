const VALID_REACTIONS = [
  "turtle",
  "buffering",
  "comedy",
  "frustrated",
  "other",
];
const VALID_SPEED_RANGES = ["below_0_5", "0_5_to_1", "2_mbps", "no_network"];
const VALID_NETWORK_TYPES = ["5g", "5g_plus", "5g_plus_plus"];

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function getSentiment(db) {
  const { results } = await db
    .prepare(
      "SELECT reaction, COUNT(*) AS count FROM community_feedback GROUP BY reaction",
    )
    .all();

  const reactionCounts = Object.fromEntries(
    results.map(({ reaction, count }) => [reaction, Number(count)]),
  );
  const counts = {
    positive: reactionCounts.comedy || 0,
    neutral: reactionCounts.other || 0,
    negative:
      (reactionCounts.turtle || 0) +
      (reactionCounts.buffering || 0) +
      (reactionCounts.frustrated || 0),
  };

  return jsonResponse({
    counts,
    total: counts.positive + counts.neutral + counts.negative,
  });
}

async function saveFeedback(request, db) {
  let feedback;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 4096) {
      return jsonResponse({ error: "Feedback is too large." }, 413);
    }
    feedback = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Invalid JSON request." }, 400);
  }

  if (!feedback || typeof feedback !== "object" || Array.isArray(feedback)) {
    return jsonResponse({ error: "Invalid feedback request." }, 400);
  }

  const {
    reaction,
    speed_range: speedRange,
    network_type: networkType,
  } = feedback;
  const message =
    typeof feedback.message === "string" ? feedback.message.trim() : "";

  if (
    !VALID_REACTIONS.includes(reaction) ||
    !VALID_SPEED_RANGES.includes(speedRange) ||
    (networkType !== null &&
      networkType !== undefined &&
      !VALID_NETWORK_TYPES.includes(networkType)) ||
    message.length > 1000
  ) {
    return jsonResponse({ error: "Please check your entries." }, 400);
  }

  await db
    .prepare(
      "INSERT INTO community_feedback (reaction, speed_range, network_type, message) VALUES (?, ?, ?, ?)",
    )
    .bind(reaction, speedRange, networkType || null, message || null)
    .run();

  return jsonResponse({ ok: true }, 201);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/sentiment" || pathname === "/api/feedback") {
      if (!env.DB) {
        return jsonResponse(
          { error: "Feedback database is not configured." },
          503,
        );
      }

      try {
        if (pathname === "/api/sentiment" && request.method === "GET") {
          return await getSentiment(env.DB);
        }
        if (pathname === "/api/feedback" && request.method === "POST") {
          return await saveFeedback(request, env.DB);
        }
        return jsonResponse({ error: "Method not allowed." }, 405);
      } catch (error) {
        console.error("Feedback API request failed:", error);
        return jsonResponse(
          { error: "Feedback service is temporarily unavailable." },
          500,
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
