const authScreen = document.getElementById("authScreen");
const mainApp = document.getElementById("mainApp");

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const authTitle = document.getElementById("authTitle");
const authForm = document.getElementById("authForm");
const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const welcomeText = document.getElementById("welcomeText");
const logoutBtn = document.getElementById("logoutBtn");
const pageTitle = document.getElementById("pageTitle");

const navBtns = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

const micButton = document.getElementById("micButton");
const statusText = document.getElementById("statusText");
const commandInput = document.getElementById("commandInput");
const sendBtn = document.getElementById("sendBtn");
const missionLog = document.getElementById("missionLog");
const clearLogBtn = document.getElementById("clearLogBtn");

const transcriptBox = document.getElementById("transcriptBox");
const summaryBox = document.getElementById("summaryBox");
const recentList = document.getElementById("recentList");
const archiveList = document.getElementById("archiveList");
const archiveSearch = document.getElementById("archiveSearch");
const meetingCount = document.getElementById("meetingCount");

const themeToggle = document.getElementById("themeToggle");
const themeSelect = document.getElementById("themeSelect");
const languageSelect = document.getElementById("languageSelect");

let isSignup = false;
let recognition = null;
let isListening = false;

let meetings = JSON.parse(localStorage.getItem("spyMeetings")) || [];

/*
  NEW GROUPED CHAT SYSTEM
  One chat session contains many messages.
*/
let chatSessions = JSON.parse(localStorage.getItem("spyChatSessions")) || [];
let currentSessionId = localStorage.getItem("spyCurrentSessionId");

/*
  OLD HISTORY MIGRATION
  If your old version saved separate history items, this converts them into one grouped chat.
*/
const oldChatHistory = JSON.parse(localStorage.getItem("spyChatHistory")) || [];

if (chatSessions.length === 0 && oldChatHistory.length > 0) {
  const migratedSession = {
    id: Date.now().toString(),
    title: "Previous Chat",
    createdAt: oldChatHistory[oldChatHistory.length - 1]?.time || new Date().toLocaleString(),
    updatedAt: oldChatHistory[0]?.time || new Date().toLocaleString(),
    messages: []
  };

  oldChatHistory.reverse().forEach((chat) => {
    migratedSession.messages.push({
      role: "user",
      text: chat.user,
      time: chat.time
    });

    migratedSession.messages.push({
      role: "ai",
      text: chat.ai,
      time: chat.time
    });
  });

  chatSessions.unshift(migratedSession);
  currentSessionId = migratedSession.id;

  localStorage.setItem("spyChatSessions", JSON.stringify(chatSessions));
  localStorage.setItem("spyCurrentSessionId", currentSessionId);
}

/* =========================
   SECURITY HELPER
========================= */

function escapeHTML(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   AUTH SYSTEM
========================= */

loginTab.addEventListener("click", () => {
  isSignup = false;

  loginTab.classList.add("active");
  signupTab.classList.remove("active");

  nameInput.classList.add("hidden");
  authTitle.textContent = "Welcome Back, Agent";
});

signupTab.addEventListener("click", () => {
  isSignup = true;

  signupTab.classList.add("active");
  loginTab.classList.remove("active");

  nameInput.classList.remove("hidden");
  authTitle.textContent = "Join the Neural Network";
});

authForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = isSignup ? nameInput.value.trim() : "Agent";
  const email = emailInput.value.trim();

  const user = {
    name: name || "Agent",
    email: email || "agent@spy.ai"
  };

  localStorage.setItem("spyUser", JSON.stringify(user));
  loadApp();
});

function loadApp() {
  const user = JSON.parse(localStorage.getItem("spyUser"));

  if (user) {
    authScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

    welcomeText.textContent = `Welcome back, ${user.name}.`;

    renderArchive();
    renderRecent();
    meetingCount.textContent = meetings.length;
  } else {
    authScreen.classList.remove("hidden");
    mainApp.classList.add("hidden");
  }
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("spyUser");
  location.reload();
});

/* =========================
   PAGE NAVIGATION
========================= */

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    openPage(btn.dataset.page);
  });
});

function openPage(pageId) {
  pages.forEach((page) => page.classList.remove("active-page"));

  const selectedPage = document.getElementById(pageId);

  if (selectedPage) {
    selectedPage.classList.add("active-page");
  }

  navBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  const titles = {
    dashboardPage: "Command Center",
    livePage: "Live Cognition",
    archivePage: "Cognitive Repository",
    settingsPage: "Configuration Console"
  };

  pageTitle.textContent = titles[pageId] || "SPY AI";
}

window.openPage = openPage;

/* =========================
   GROUPED CHAT SESSION SYSTEM
========================= */

function createNewChatSession(firstMessage = "New Chat") {
  const session = {
    id: Date.now().toString(),
    title: makeChatTitle(firstMessage),
    createdAt: new Date().toLocaleString(),
    updatedAt: new Date().toLocaleString(),
    messages: []
  };

  chatSessions.unshift(session);
  currentSessionId = session.id;

  saveChatSessions();

  return session;
}

function getCurrentSession(firstMessage = "New Chat") {
  let session = chatSessions.find((item) => item.id === currentSessionId);

  if (!session) {
    session = createNewChatSession(firstMessage);
  }

  return session;
}

function makeChatTitle(text) {
  if (!text) return "New Chat";

  const clean = text.trim();

  if (clean.length <= 32) return clean;

  return clean.slice(0, 32) + "...";
}

function saveChatSessions() {
  localStorage.setItem("spyChatSessions", JSON.stringify(chatSessions));
  localStorage.setItem("spyCurrentSessionId", currentSessionId);
}

function saveMessageToCurrentChat(role, text) {
  const session = getCurrentSession(text);

  if (session.messages.length === 0 && role === "user") {
    session.title = makeChatTitle(text);
    session.createdAt = new Date().toLocaleString();
  }

  session.messages.push({
    role,
    text,
    time: new Date().toLocaleString()
  });

  session.updatedAt = new Date().toLocaleString();

  saveChatSessions();
  renderRecent();
}

function startNewChat() {
  createNewChatSession("New Chat");

  missionLog.innerHTML = `
    <div class="ai-msg">🕵️ New chat started. SPY AI online.</div>
  `;

  transcriptBox.textContent = "Waiting for speech...";

  updateSummary("New Chat", "—", "—", "User", "Started a new grouped chat");

  renderRecent();
}

window.startNewChat = startNewChat;

/* =========================
   COMMAND HANDLING
========================= */

sendBtn.addEventListener("click", () => {
  const text = commandInput.value.trim();

  if (!text) return;

  handleCommand(text);
  commandInput.value = "";
});

commandInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

function sendQuick(text) {
  handleCommand(text);
}

window.sendQuick = sendQuick;

async function handleCommand(text) {
  addMessage("user", text);
  saveMessageToCurrentChat("user", text);

  transcriptBox.textContent = text;
  statusText.textContent = "Processing command...";

  let reply = "";

  const lower = text.toLowerCase();

  if (
    lower.includes("schedule") ||
    lower.includes("meeting") ||
    lower.includes("ಮೀಟಿಂಗ್") ||
    lower.includes("ಸಭೆ") ||
    lower.includes("मीटिंग")
  ) {
    reply = scheduleMeeting(text);
  } else {
    reply = await askBackendAI(text);
  }

  addMessage("ai", reply);
  saveMessageToCurrentChat("ai", reply);

  speak(reply);

  statusText.textContent = "Tap mic or type command";
}

/* =========================
   BACKEND AI CONNECTION
========================= */

async function askBackendAI(message) {
  const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? ""
      : "https://spy-ai-backend.onrender.com";

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (data && data.reply) {
      updateSummary("AI Conversation", "—", "—", "User", "Backend AI replied");
      return data.reply;
    }

    return generateLocalReply(message);
  } catch (error) {
    console.error("Backend connection failed:", error);
    return generateLocalReply(message);
  }
}
/* =========================
   LOCAL FALLBACK AI
========================= */

function generateLocalReply(message) {
  const text = message.toLowerCase();

  if (
    text.includes("ಹಲೋ") ||
    text.includes("ನಮಸ್ಕಾರ") ||
    text.includes("ಹೇಗಿದ್ದೀರಾ") ||
    text.includes("ಹೇಗಿದ್ದೀಯ")
  ) {
    updateSummary("Kannada Greeting", "—", "—", "User", "Replied in Kannada");
    return "ನಮಸ್ಕಾರ! ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ. ನೀವು ಹೇಗಿದ್ದೀರಾ?";
  }

  if (
    text.includes("कैसे हो") ||
    text.includes("कैसे हैं") ||
    text.includes("नमस्ते") ||
    text.includes("हेलो")
  ) {
    updateSummary("Hindi Greeting", "—", "—", "User", "Replied in Hindi");
    return "नमस्ते! मैं ठीक हूँ। आप कैसे हो?";
  }

  if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
    updateSummary("Greeting", "—", "—", "User", "Replied to greeting");
    return "Hello Agent. SPY AI is online and ready.";
  }

  if (text.includes("time")) {
    const time = new Date().toLocaleTimeString();
    updateSummary("Time Query", "Today", time, "User", "Answered current time");
    return `The current time is ${time}.`;
  }

  if (text.includes("date")) {
    const date = new Date().toLocaleDateString();
    updateSummary("Date Query", date, "—", "User", "Answered current date");
    return `Today's date is ${date}.`;
  }

  if (text.includes("joke")) {
    updateSummary("Entertainment", "—", "—", "User", "Told a joke");
    return "Why did the computer become a spy? Because it had too many hidden files.";
  }

  if (text.includes("calculate")) {
    return calculateFromText(text);
  }

  updateSummary("General Message", "—", "—", "User", "Fallback response used");
  return "I understood your message. Please ask me anything in English, Hindi, or Kannada.";
}

/* =========================
   FULL GROUPED CHAT HISTORY MODAL
========================= */

function openSessionHistory(sessionId) {
  const session = chatSessions.find((item) => item.id === sessionId);

  if (!session) return;

  const oldModal = document.getElementById("historyModal");

  if (oldModal) {
    oldModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = "historyModal";
  modal.className = "history-modal active";

  let messagesHTML = "";

  if (!session.messages || session.messages.length === 0) {
    messagesHTML = `
      <div class="history-chat">
        <p class="history-ai">No messages in this chat yet.</p>
      </div>
    `;
  } else {
    session.messages.forEach((message) => {
      const isUser = message.role === "user";

      messagesHTML += `
        <div class="history-chat ${isUser ? "history-user-card" : "history-ai-card"}">
          <p class="history-time">${escapeHTML(message.time)}</p>
          <p class="${isUser ? "history-user" : "history-ai"}">
            <b>${isUser ? "🧑 You:" : "🤖 SPY AI:"}</b>
            ${escapeHTML(message.text)}
          </p>
        </div>
      `;
    });
  }

  modal.innerHTML = `
    <div class="history-box">
      <div class="history-head">
        <div>
          <h2>🧾 ${escapeHTML(session.title)}</h2>
          <p class="muted">Grouped chat started: ${escapeHTML(session.createdAt)}</p>
        </div>

        <div class="history-actions">
          <button class="clear-history" onclick="deleteChatSession('${session.id}')">DELETE CHAT</button>
          <button class="close-history" onclick="closeFullHistory()">CLOSE</button>
        </div>
      </div>

      ${messagesHTML}
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target.id === "historyModal") {
      closeFullHistory();
    }
  });
}

function openFullHistory() {
  if (chatSessions.length === 0) {
    alert("No chat history yet.");
    return;
  }

  openSessionHistory(chatSessions[0].id);
}

function closeFullHistory() {
  const modal = document.getElementById("historyModal");

  if (modal) {
    modal.remove();
  }
}

function deleteChatSession(sessionId) {
  const confirmDelete = confirm("Delete this grouped chat?");

  if (!confirmDelete) return;

  chatSessions = chatSessions.filter((session) => session.id !== sessionId);

  if (currentSessionId === sessionId) {
    currentSessionId = chatSessions[0]?.id || "";
  }

  saveChatSessions();
  renderRecent();
  closeFullHistory();
}

function clearAllChatSessions() {
  const confirmClear = confirm("Clear all grouped chat history?");

  if (!confirmClear) return;

  chatSessions = [];
  currentSessionId = "";

  localStorage.removeItem("spyChatSessions");
  localStorage.removeItem("spyCurrentSessionId");
  localStorage.removeItem("spyChatHistory");
  localStorage.removeItem("spyConversations");

  renderRecent();
  closeFullHistory();
}

window.openFullHistory = openFullHistory;
window.openSessionHistory = openSessionHistory;
window.closeFullHistory = closeFullHistory;
window.deleteChatSession = deleteChatSession;
window.clearAllChatSessions = clearAllChatSessions;

/* =========================
   MEETING SCHEDULER
========================= */

function scheduleMeeting(text) {
  const lower = text.toLowerCase();

  const personMatch =
    text.match(/with\s+([a-zA-Z]+)/i) ||
    text.match(/ಜೊತೆ\s+([\u0C80-\u0CFF]+)/i) ||
    text.match(/के साथ\s+([\u0900-\u097F]+)/i);

  const timeMatch = text.match(/(\d{1,2})(:\d{2})?\s*(am|pm|AM|PM)?/);

  const tomorrow =
    lower.includes("tomorrow") ||
    text.includes("ನಾಳೆ") ||
    text.includes("कल");

  const person = personMatch ? personMatch[1] : "Unknown";
  const time = timeMatch ? timeMatch[0] : "Not specified";
  const date = tomorrow ? "Tomorrow" : "Today";

  const meeting = {
    title: `Meeting with ${person}`,
    person,
    date,
    time,
    summary: `User requested to schedule a meeting with ${person} at ${time}.`,
    createdAt: new Date().toLocaleString()
  };

  meetings.unshift(meeting);
  localStorage.setItem("spyMeetings", JSON.stringify(meetings));

  updateSummary("Schedule Meeting", date, time, person, "Meeting saved to archive");

  renderArchive();
  meetingCount.textContent = meetings.length;

  return `Meeting scheduled with ${person} for ${date} at ${time}.`;
}

/* =========================
   CALCULATOR
========================= */

function calculateFromText(text) {
  try {
    const expression = text
      .replace("calculate", "")
      .replace(/plus/g, "+")
      .replace(/minus/g, "-")
      .replace(/into/g, "*")
      .replace(/times/g, "*")
      .replace(/divided by/g, "/")
      .replace(/[^0-9+\-*/().]/g, "");

    const result = Function(`"use strict"; return (${expression})`)();

    updateSummary("Calculation", "—", "—", "User", `Calculated ${expression}`);

    return `The answer is ${result}.`;
  } catch {
    return "I could not calculate that. Try: calculate 10 + 20.";
  }
}

/* =========================
   SUMMARY PANEL
========================= */

function updateSummary(intent, date, time, person, action) {
  summaryBox.innerHTML = `
    <p><b>Intent:</b> ${escapeHTML(intent)}</p>
    <p><b>Date:</b> ${escapeHTML(date)}</p>
    <p><b>Time:</b> ${escapeHTML(time)}</p>
    <p><b>Person:</b> ${escapeHTML(person)}</p>
    <p><b>Action:</b> ${escapeHTML(action)}</p>
  `;
}

/* =========================
   MISSION LOG
========================= */

function addMessage(type, text) {
  const div = document.createElement("div");

  div.className = type === "ai" ? "ai-msg" : "user-msg";
  div.textContent = type === "ai" ? `🤖 ${text}` : `🧑 ${text}`;

  missionLog.appendChild(div);
  missionLog.scrollTop = missionLog.scrollHeight;
}

clearLogBtn.addEventListener("click", () => {
  missionLog.innerHTML = `
    <div class="ai-msg">🕵️ Mission log cleared. SPY AI online.</div>
  `;
});

/* =========================
   SPEECH RECOGNITION
========================= */

function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    statusText.textContent = "Speech Recognition not supported in this browser";
    return;
  }

  recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = languageSelect.value;

  recognition.onstart = () => {
    isListening = true;
    micButton.classList.add("listening");
    statusText.textContent = "Listening...";
  };

  recognition.onresult = (event) => {
    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    transcriptBox.textContent = transcript;

    const lastResult = event.results[event.results.length - 1];

    if (lastResult.isFinal) {
      handleCommand(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    statusText.textContent = "Speech error. Try again.";
  };

  recognition.onend = () => {
    isListening = false;
    micButton.classList.remove("listening");
    statusText.textContent = "Tap mic or type command";
  };
}

micButton.addEventListener("click", () => {
  if (!recognition) {
    setupSpeechRecognition();
  }

  if (!recognition) return;

  recognition.lang = languageSelect.value;

  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

/* =========================
   TEXT TO SPEECH
========================= */

function speak(text) {
  if (!window.speechSynthesis) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = languageSelect.value || "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;

  speechSynthesis.speak(utterance);
}

/* =========================
   ARCHIVE
========================= */

function renderArchive(filter = "") {
  archiveList.innerHTML = "";

  const filtered = meetings.filter((meeting) => {
    return JSON.stringify(meeting)
      .toLowerCase()
      .includes(filter.toLowerCase());
  });

  if (filtered.length === 0) {
    archiveList.innerHTML = `
      <div class="archive-card">
        <h3>No archived meetings</h3>
        <p>Your scheduled meetings will appear here.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((meeting) => {
    const card = document.createElement("div");
    card.className = "archive-card";

    card.innerHTML = `
      <h3>${escapeHTML(meeting.title)}</h3>
      <p><b>Date:</b> ${escapeHTML(meeting.date)}</p>
      <p><b>Time:</b> ${escapeHTML(meeting.time)}</p>
      <p><b>Participant:</b> ${escapeHTML(meeting.person)}</p>
      <p><b>Summary:</b> ${escapeHTML(meeting.summary)}</p>
      <p><b>Created:</b> ${escapeHTML(meeting.createdAt)}</p>
    `;

    archiveList.appendChild(card);
  });
}

archiveSearch.addEventListener("input", () => {
  renderArchive(archiveSearch.value);
});

/* =========================
   RECENT CONVERSATIONS
========================= */

function renderRecent() {
  recentList.innerHTML = "";

  if (chatSessions.length === 0) {
    recentList.innerHTML = `
      <li>No conversations yet.</li>
      <li onclick="startNewChat()"><b>➕ Start New Chat</b></li>
    `;
    return;
  }

  chatSessions.slice(0, 5).forEach((session) => {
    const messageCount = session.messages?.length || 0;
    const lastMessage = session.messages?.[messageCount - 1]?.text || "No messages yet";

    const li = document.createElement("li");

    li.innerHTML = `
      <b>${escapeHTML(session.title)}</b>
      <br>
      <small>${escapeHTML(session.updatedAt)} · ${messageCount} messages</small>
      <br>
      <small>${escapeHTML(lastMessage.slice(0, 70))}</small>
    `;

    li.addEventListener("click", () => {
      currentSessionId = session.id;
      saveChatSessions();
      openSessionHistory(session.id);
    });

    recentList.appendChild(li);
  });

  const newChat = document.createElement("li");
  newChat.innerHTML = `<b>➕ Start New Chat</b>`;
  newChat.addEventListener("click", startNewChat);
  recentList.appendChild(newChat);

  const clearAll = document.createElement("li");
  clearAll.innerHTML = `<b>🗑️ Clear All Chat History</b>`;
  clearAll.addEventListener("click", clearAllChatSessions);
  recentList.appendChild(clearAll);
}

/* =========================
   THEME
========================= */

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

themeSelect.addEventListener("change", () => {
  if (themeSelect.value === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
});

/* =========================
   LANGUAGE CHANGE
========================= */

languageSelect.addEventListener("change", () => {
  if (recognition) {
    recognition.lang = languageSelect.value;
  }
});

/* =========================
   INIT APP
========================= */

loadApp();
setupSpeechRecognition();