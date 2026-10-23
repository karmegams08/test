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

async function loadSentiment() {
  try {
    const response = await fetch("/api/sentiment", { cache: "no-store" });
    const summary = await response.json();
    if (!response.ok)
      throw new Error(summary.error || "Unable to load feedback.");

    Object.entries(summary.counts).forEach(([sentiment, count]) => {
      const percentage = summary.total
        ? Math.round((count / summary.total) * 100)
        : 0;
      const row = document.querySelector(`[data-sentiment="${sentiment}"]`);
      row.querySelector("progress").value = percentage;
      row.querySelector("strong").textContent = `${percentage}%`;
    });

    sentimentSummary.textContent = summary.total
      ? `${summary.total} ${summary.total === 1 ? "response" : "responses"}`
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
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Submission failed.");

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
    formStatus.textContent =
      error.message || "Submission failed. Please try again later.";
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
