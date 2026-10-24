const reactionButtons = document.querySelectorAll(".reaction");
const reactionInputs = document.querySelectorAll('input[name="reaction"]');
const reactionStatus = document.getElementById("reactionStatus");
const form = document.getElementById("feedbackForm");
const formStatus = document.getElementById("formStatus");
const submitButton = document.getElementById("submitButton");
const shareButton = document.getElementById("shareButton");
const sentimentSummary = document.getElementById("sentimentSummary");
const feedbackStorageKey = "signal-vs-reality-feedback";

const reactionNames = {
  turtle: "🐢 Turtle mode",
  buffering: "⏳ Buffering champion",
  comedy: "😂 Comedy network",
  frustrated: "😤 Recharge regret",
  other: "🤔 Other",
};

function readFeedback() {
  try {
    const savedFeedback = JSON.parse(
      localStorage.getItem(feedbackStorageKey) || "[]",
    );
    return Array.isArray(savedFeedback)
      ? savedFeedback.filter((entry) => reactionNames[entry?.reaction])
      : [];
  } catch {
    return [];
  }
}

function saveFeedback(feedback) {
  const savedFeedback = readFeedback();
  savedFeedback.push(feedback);
  localStorage.setItem(feedbackStorageKey, JSON.stringify(savedFeedback));
  return savedFeedback;
}

function loadSentiment() {
  const feedback = readFeedback();
  const counts = {
    positive: feedback.filter((entry) => entry.reaction === "comedy").length,
    neutral: feedback.filter((entry) => entry.reaction === "other").length,
    negative: feedback.filter((entry) =>
      ["turtle", "buffering", "frustrated"].includes(entry.reaction),
    ).length,
  };
  const total = feedback.length;
  const percentageParts = Object.entries(counts).map(([sentiment, count]) => {
    const exact = total ? (count / total) * 100 : 0;
    return { sentiment, value: Math.floor(exact), remainder: exact % 1 };
  });
  const pointsRemaining = total
    ? 100 - percentageParts.reduce((sum, part) => sum + part.value, 0)
    : 0;
  [...percentageParts]
    .sort((first, second) => second.remainder - first.remainder)
    .slice(0, pointsRemaining)
    .forEach((part) => part.value++);
  const percentages = Object.fromEntries(
    percentageParts.map(({ sentiment, value }) => [sentiment, value]),
  );

  Object.entries(percentages).forEach(([sentiment, percentage]) => {
    const row = document.querySelector(`[data-sentiment="${sentiment}"]`);
    row.querySelector("progress").value = percentage;
    row.querySelector("strong").textContent = `${percentage}%`;
  });

  sentimentSummary.textContent = total
    ? `${total} ${total === 1 ? "response" : "responses"} on this device`
    : "No feedback submitted on this device yet.";
}

loadSentiment();

window.addEventListener("storage", (event) => {
  if (event.key === feedbackStorageKey) loadSentiment();
});

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
    !Object.hasOwn(reactionNames, reaction) ||
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

  try {
    saveFeedback(submission);
    formStatus.textContent = "Feedback saved on this device. Thank you!";
    form.reset();

    reactionButtons.forEach((button) => {
      button.classList.remove("selected");
      button.setAttribute("aria-pressed", "false");
    });
    loadSentiment();
  } catch (error) {
    console.error("Feedback could not be saved:", error);
    formStatus.textContent =
      "Unable to save feedback in this browser. Check available storage and try again.";
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
