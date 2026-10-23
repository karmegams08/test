
const SUPABASE_URL = "";
const SUPABASE_PUBLISHABLE_KEY = "";

const hasDatabaseConfig =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_PUBLISHABLE_KEY.length > 0;

const db = hasDatabaseConfig && window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    )
  : null;

const reactionButtons = document.querySelectorAll(".reaction");
const reactionSelect = document.getElementById("reaction");
const reactionStatus = document.getElementById("reactionStatus");
const form = document.getElementById("feedbackForm");
const formStatus = document.getElementById("formStatus");
const submitButton = document.getElementById("submitButton");
const shareButton = document.getElementById("shareButton");

const reactionNames = {
  turtle: "🐢 Turtle mode",
  buffering: "⏳ Buffering champion",
  comedy: "😂 Comedy network",
  frustrated: "😤 Recharge regret",
  other: "🤔 Other"
};

reactionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const reaction = button.dataset.reaction;

    reactionSelect.value = reaction;

    reactionButtons.forEach((item) => {
      item.classList.toggle("selected", item === button);
      item.setAttribute(
        "aria-pressed",
        String(item === button)
      );
    });

    reactionStatus.textContent =
      `Mood selected: ${reactionNames[reaction]}.`;

    document.getElementById("feedback").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

reactionSelect.addEventListener("change", () => {
  reactionButtons.forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.reaction === reactionSelect.value
    );
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
  const speedText = String(data.get("speed") || "").trim();
  const speed = speedText === "" ? null : Number(speedText);
  const signalText = String(data.get("signal") || "").trim();
  const signal = signalText === "" ? null : Number(signalText);
  const message = String(data.get("message") || "").trim();

  if (
    (speed !== null &&
      (!Number.isFinite(speed) || speed < 0 || speed > 100000)) ||
    (signal !== null && (signal < 1 || signal > 5)) ||
    message.length < 5 ||
    message.length > 1000
  ) {
    formStatus.textContent = "Please check your entries.";
    return;
  }

  const submission = {
    reaction: String(data.get("reaction")),
    speed_mbps: speed,
    signal_bars: signal,
    message
  };

  submitButton.disabled = true;
  formStatus.textContent = "Submitting your feedback...";

  try {
    const { error } = await db
      .from("community_feedback")
      .insert([submission]);

    if (error) throw error;

    formStatus.textContent =
      "Thanks! Your feedback was submitted successfully.";
    form.reset();

    reactionButtons.forEach((button) => {
      button.classList.remove("selected");
      button.setAttribute("aria-pressed", "false");
    });
  } catch (error) {
    console.error("Feedback submission failed:", error);
    formStatus.textContent =
      "Submission failed. Please try again later.";
  } finally {
    submitButton.disabled = false;
  }
});

shareButton.addEventListener("click", async () => {
  const shareData = {
    title: "Signal vs Reality",
    text:
      "5 bars. 0.1 Mbps. 😂 Share your honest mobile internet experience!",
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
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
