CREATE TABLE IF NOT EXISTS community_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reaction TEXT NOT NULL CHECK (reaction IN ('turtle', 'buffering', 'comedy', 'frustrated', 'other')),
  speed_range TEXT NOT NULL CHECK (speed_range IN ('below_0_5', '0_5_to_1', '2_mbps', 'no_network')),
  network_type TEXT CHECK (network_type IS NULL OR network_type IN ('5g', '5g_plus', '5g_plus_plus')),
  message TEXT CHECK (message IS NULL OR length(message) <= 1000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS community_feedback_reaction_idx
  ON community_feedback (reaction);