const SUPABASE_URL = "";
const SUPABASE_PUBLISHABLE_KEY = "";

const hasDatabaseConfig =
  SUPABASE_URL.startsWith("https://") && SUPABASE_PUBLISHABLE_KEY.length > 0;

const db =
  hasDatabaseConfig && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

const reactionButtons = document.querySelectorAll(".reaction");
const reactionInputs = document.querySelectorAll('input[name="reaction"]');
const reactionStatus = document.getElementById("reactionStatus");
const form = document.getElementById("feedbackForm");
const formStatus = document.getElementById("formStatus");
const submitButton = document.getElementById("submitButton");
const shareButton = document.getElementById("shareButton");
const sentimentSummary = document.getElementById("sentimentSummary");

const reactionNames = {
  turtle: "🐢 Turtle mode",
  buffering: "⏳ Buffering champion",
  comedy: "😂 Comedy network",
  frustrated: "😤 Recharge regret",
  other: "🤔 Other",
};

const sentimentReactions = {
  positive: ["comedy"],
  neutral: ["other"],
  negative: ["turtle", "buffering", "frustrated"],
};

async function loadSentiment() {
  if (!db) {
    sentimentSummary.textContent =
      "Connect the feedback database to see results.";
    return;
  }

  try {
    const entries = await Promise.all(
      Object.entries(sentimentReactions).map(async ([sentiment, reactions]) => {
        const { count, error } = await db
          .from("community_feedback")
          .select("reaction", { count: "exact", head: true })
          .in("reaction", reactions);

        if (error) throw error;
        return [sentiment, count || 0];
      }),
    );

    const counts = Object.fromEntries(entries);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    Object.entries(counts).forEach(([sentiment, count]) => {
      const percentage = total ? Math.round((count / total) * 100) : 0;
      const row = document.querySelector(`[data-sentiment="${sentiment}"]`);
      row.querySelector("progress").value = percentage;
      row.querySelector("strong").textContent = `${percentage}%`;
    });

    sentimentSummary.textContent = total
      ? `${total} ${total === 1 ? "response" : "responses"}`
      : "No feedback submitted yet.";
  } catch (error) {
    console.error("Sentiment summary failed:", error);
    sentimentSummary.textContent =
      "Feedback summary is temporarily unavailable.";
  }
}

loadSentiment();

reactionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const reaction = button.dataset.reaction;

    const reactionInput = document.querySelector(
      `input[name="reaction"][value="${reaction}"]`,
    );
    reactionInput.checked = true;

    reactionButtons.forEach((item) => {
      item.classList.toggle("selected", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });

    reactionStatus.textContent = `Mood selected: ${reactionNames[reaction]}.`;

    document.getElementById("feedback").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

reactionInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const selectedReaction = input.value;
    reactionButtons.forEach((button) => {
      const isSelected = button.dataset.reaction === selectedReaction;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  if (!db) {
    formStatus.textContent =
      "Demo mode: configure Supabase to save feedback. " +
      "Nothing has been stored.";
    return;
  }

  const data = new FormData(form);
  const reaction = String(data.get("reaction") || "");
  const speedRange = String(data.get("speed_range") || "");
  const networkType = String(data.get("network_type") || "") || null;
  const message = String(data.get("message") || "").trim();

  if (
    !["below_0_5", "0_5_to_1", "2_mbps", "no_network"].includes(speedRange) ||
    (networkType !== null &&
      !["5g", "5g_plus", "5g_plus_plus"].includes(networkType)) ||
    message.length > 1000
  ) {
    formStatus.textContent = "Please check your entries.";
    return;
  }

  const submission = {
    reaction,
    speed_range: speedRange,
    network_type: networkType,
    message,
  };

  submitButton.disabled = true;
  formStatus.textContent = "Submitting your feedback...";

  try {
    const { error } = await db.from("community_feedback").insert([submission]);

    if (error) throw error;

    formStatus.textContent =
      "Thanks! Your feedback was submitted successfully.";
    form.reset();

    reactionButtons.forEach((button) => {
      button.classList.remove("selected");
      button.setAttribute("aria-pressed", "false");
    });
    await loadSentiment();
  } catch (error) {
    console.error("Feedback submission failed:", error);
    formStatus.textContent = "Submission failed. Please try again later.";
  } finally {
    submitButton.disabled = false;
  }
});

shareButton.addEventListener("click", async () => {
  const shareData = {
    title: "Signal vs Reality",
    text: "5 bars. 0.1 Mbps. 😂 Share your honest mobile internet experience!",
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`,
      );
      formStatus.textContent =
        "Campaign link copied. Share it with your friends!";
    } else {
      window.prompt("Copy and share this campaign link:", window.location.href);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      formStatus.textContent =
        "Unable to open sharing. Copy the page URL to share it.";
    }
  }
});
