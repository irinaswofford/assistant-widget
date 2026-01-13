<script>
const scriptTag = document.currentScript;

const WEBHOOK_URL = scriptTag.dataset.webhook;
const BRAND_COLOR = scriptTag.dataset.brandColor || "#8b5cf6";
const AGENT_NAME  = scriptTag.dataset.agentName || "Clinical Assistant";
const WELCOME_MSG = scriptTag.dataset.welcome ||
  "Hi, I'm the Clinical Assistant. Ask me anything about patient data.";

// ===============================
//  WIDGET HTML
// ===============================
const widgetHTML = `
<div id="ai-widget">

  <button id="chat-trigger">
    💬 ${AGENT_NAME}
  </button>

  <div id="chat-window">
    <div class="chat-header">
      <div>
        <h4>${AGENT_NAME}</h4>
        <div class="status-line">
          <span class="status-dot"></span> RAG Pipeline Active
        </div>
      </div>
      <div class="header-buttons">
        <button id="view-history">View History</button>
        <button id="clear-chat">Clear</button>
        <button class="close-btn">×</button>
      </div>
    </div>

    <div class="chat-messages" id="chat-msgs">
      <div class="msg msg-ai">${WELCOME_MSG}</div>
    </div>

    <div class="typing" id="typing" style="display:none;">Processing…</div>

    <div class="chat-input">
      <input type="text" id="user-input" placeholder="Type your question…" autocomplete="off" />
      <button id="send-btn">➤</button>
    </div>
  </div>
</div>
`;

// ===============================
//  SAFE DOM INJECTION
// ===============================
(function waitForBody() {
  if (!document.body) return setTimeout(waitForBody, 50);
  document.body.insertAdjacentHTML("beforeend", widgetHTML);
  injectStyles();
  setupWidgetLogic();
})();

// ===============================
//  STYLES
// ===============================
function injectStyles() {
  const style = document.createElement("style");
  style.innerHTML = `
  :root { --brand-purple: ${BRAND_COLOR}; }

  #ai-widget, #ai-widget * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; pointer-events: auto !important; }

  #chat-trigger {
    position: fixed; bottom: 30px; right: 30px;
    background: var(--brand-purple); color: #fff; border: none;
    padding: 14px 22px; border-radius: 50px; font-weight: 700; cursor: pointer; z-index: 999999;
  }

  #chat-window {
    position: fixed; bottom: 90px; right: 30px;
    width: 420px; height: 600px; background: #020617;
    border-radius: 24px; display: none; flex-direction: column;
    box-shadow: 0 25px 60px rgba(0,0,0,0.5); z-index: 999999; overflow: hidden;
  }

  .chat-header {
    padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
    color: #f8fafc; border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .chat-header h4 { margin: 0; font-weight: 700; }
  .status-line { font-size: 11px; color: #94a3b8; }
  .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; margin-right: 6px; }

  .header-buttons { display: flex; gap: 6px; }
  .header-buttons button { background: none; border: none; color: white; cursor: pointer; font-size: 13px; padding: 2px 6px; border-radius: 6px; }
  .header-buttons button:hover { background: rgba(255,255,255,0.1); }

  .chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #121827; }
  .msg { padding: 10px 14px; border-radius: 16px; font-size: 14px; max-width: 80%; word-wrap: break-word; }
  .msg-ai { background: #1e293b; color: #f8fafc; align-self: flex-start; }
  .msg-user { background: var(--brand-purple); color: #fff; align-self: flex-end; }
  .typing { font-size: 12px; color: #94a3b8; padding: 4px 16px; user-select: none; }

  .chat-input { display: flex; gap: 10px; padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
  .chat-input input { flex: 1; padding: 12px 16px; border-radius: 24px; border: 1px solid #334155; outline: none; background: #0f172a; color: #fff; caret-color: #fff; font-size: 14px; }
  .chat-input input::placeholder { color: #94a3b8; }
  .chat-input input:focus { border-color: var(--brand-purple); }
  .chat-input button { width: 42px; height: 42px; border-radius: 50%; background: var(--brand-purple); color: #fff; border: none; cursor: pointer; }
  `;
  document.head.appendChild(style);
}

// ===============================
//  LOGIC
// ===============================
function setupWidgetLogic() {
  const chatWindow = document.getElementById("chat-window");
  const trigger = document.getElementById("chat-trigger");
  const closeBtn = document.querySelector(".close-btn");
  const msgs = document.getElementById("chat-msgs");
  const typing = document.getElementById("typing");
  const input = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const viewHistoryBtn = document.getElementById("view-history");
  const clearBtn = document.getElementById("clear-chat");

  trigger.onclick = () => {
    chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex';
    setTimeout(() => input.focus(), 50);
  };

  closeBtn.onclick = () => chatWindow.style.display = "none";

  viewHistoryBtn.onclick = () => {
    if (msgs.style.display === "none") {
      msgs.style.display = "flex";
      viewHistoryBtn.textContent = "Hide History";
    } else {
      msgs.style.display = "none";
      viewHistoryBtn.textContent = "View History";
    }
  };

  clearBtn.onclick = () => {
    msgs.innerHTML = `<div class="msg msg-ai">${WELCOME_MSG}</div>`;
  };

  sendBtn.onclick = sendMessage;
  input.addEventListener("keydown", e => e.key === "Enter" && sendMessage());

  function append(role, text) {
    const div = document.createElement("div");
    div.className = `msg msg-${role}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    append("user", text);
    input.value = "";
    typing.style.display = "block";
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text })
      });
      const data = await res.json();
      typing.style.display = "none";
      append("ai", data.output || "Response received.");
      setTimeout(() => input.focus(), 50);
    } catch (e) {
      typing.style.display = "none";
      append("ai", "Error connecting to server.");
      setTimeout(() => input.focus(), 50);
    }
  }
}
</script>
