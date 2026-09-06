const $ = (id) => document.getElementById(id);

const textInput = $("textInput");
const analyzeBtn = $("analyzeBtn");
const btnText = $("btnText");
const resultPanel = $("resultPanel");
const emotionEmoji = $("emotionEmoji");
const emotionLabel = $("emotionLabel");
const confidenceValue = $("confidenceValue");
const confidenceFill = $("confidenceFill");
const probabilities = $("probabilities");
const charCount = $("charCount");
const scanBadge = $("scanBadge");
const statusPill = $("statusPill");
const statusText = $("statusText");
const toast = $("toast");

const emojiMap = {
  sadness: "😢",
  joy: "😄",
  love: "❤️",
  anger: "😠",
  fear: "😨",
  surprise: "😲"
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function updateCount() {
  charCount.textContent = `${textInput.value.length} / 2000`;
}

async function checkHealth() {
  try {
    const response = await fetch("/health");
    const data = await response.json();
    if (!response.ok || !data.model_loaded) throw new Error();
    statusPill.classList.add("online");
    statusText.textContent = "System online";
  } catch {
    statusPill.classList.remove("online");
    statusText.textContent = "Model unavailable";
  }
}

function renderProbabilities(allProbabilities) {
  const entries = Object.entries(allProbabilities)
    .sort((a, b) => b[1] - a[1]);

  probabilities.innerHTML = entries.map(([label, value]) => `
    <div class="prob-row">
      <span class="prob-name">${label}</span>
      <div class="prob-bar"><div class="prob-fill" style="width:${Math.max(0, Math.min(100, value * 100))}%"></div></div>
      <span class="prob-value">${(value * 100).toFixed(1)}%</span>
    </div>
  `).join("");
}

function setLoading(loading) {
  analyzeBtn.disabled = loading;
  resultPanel.classList.toggle("loading", loading);
  scanBadge.classList.toggle("live", loading);
  scanBadge.textContent = loading ? "ANALYZING" : "LIVE";
  btnText.textContent = loading ? "Reading signal..." : "Analyze Emotion";
  if (loading) {
    emotionEmoji.textContent = "✦";
  }
}

async function analyze() {
  const text = textInput.value.trim();
  if (!text) {
    showToast("Enter a sentence first.");
    textInput.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Prediction failed");
    }

    const confidence = Number(data.confidence || 0);
    emotionEmoji.textContent = emojiMap[data.predicted_emotion] || "◌";
    emotionLabel.textContent = data.predicted_emotion;
    confidenceValue.textContent = `${(confidence * 100).toFixed(1)}%`;

    confidenceFill.style.width = "0%";
    requestAnimationFrame(() => {
      confidenceFill.style.width = `${Math.min(100, confidence * 100)}%`;
    });

    renderProbabilities(data.all_probabilites || {});
    scanBadge.textContent = "COMPLETE";
    scanBadge.classList.add("live");
  } catch (error) {
    showToast(error.message || "Could not connect to the prediction API.");
    scanBadge.textContent = "ERROR";
    scanBadge.classList.remove("live");
  } finally {
    setLoading(false);
    btnText.textContent = "Analyze Emotion";
  }
}

textInput.addEventListener("input", updateCount);
textInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    analyze();
  }
});

$("clearBtn").addEventListener("click", () => {
  textInput.value = "";
  updateCount();
  emotionEmoji.textContent = "◌";
  emotionLabel.textContent = "Waiting for input";
  confidenceValue.textContent = "—";
  confidenceFill.style.width = "0%";
  probabilities.innerHTML = '<div class="empty-state">Your six-class probability profile will appear here.</div>';
  scanBadge.textContent = "STANDBY";
  scanBadge.classList.remove("live");
  textInput.focus();
});

analyzeBtn.addEventListener("click", analyze);

document.querySelectorAll(".example-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    textInput.value = chip.textContent;
    updateCount();
    textInput.focus();
  });
});

updateCount();
checkHealth();
setInterval(checkHealth, 30000);
