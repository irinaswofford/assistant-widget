// ===============================
//  READ CONFIG FROM SCRIPT TAG
// ===============================
const scriptTag = document.currentScript;

const WEBHOOK_URL = scriptTag.dataset.webhook;
const BRAND_COLOR = scriptTag.dataset.brandColor || "#8b5cf6";
const AGENT_NAME  = scriptTag.dataset.agentName || "Clinical Assistant";
const WELCOME_MSG = scriptTag.dataset.welcome ||
  "Hi, I'm the iHealth Agent. I've ingested your clinic's faxes. Ask me anything about patient data.";

// ===============================
//  WIDGET HTML
// ===============================
const widgetHTML = `
<div id="ai-widget">

  <button id="chat-trigger">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    Clinical Assistant
  </button>

  <div id="chat-window">
    <div class="chat-header">
      <div>
        <h4>iHealth Agent</h4>
        <div class="status-line">
          <span class="status-dot"></span> RAG Pipeline Active
        </div>
      </div>
      <button class="close-btn">×</button>
    </div>

    <div class="chat-messages" id="chat-msgs">
      <div class="msg msg-ai">${WELCOME_MSG}</div>
    </div>

    <div class="typing" id="typing">Processing …</div>

    <div class="chat-input">
      <input
        type="text"
        id="user-input"
        placeholder="e.g., What is the patient's Member ID?"
        autocomplete="off"
      />
      <button id="send-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>

</div>
`;

// ===============================
//  DOM INJECTION
// ===============================
document.body.insertAdjacentHTML("beforeend", widgetHTML);
injectStyles();
setupWidgetLogic();

// ===============================
//  STYLES
// ===============================
function injectStyles() {
  const style = document.createElement("style");
  style.innerHTML = `
  :root {
    --brand-purple: ${BRAND_COLOR};
  }

  #chat-trigger {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: var(--brand-purple);
    color: #fff;
    border: none;
    padding: 16px 28px;
    border-radius: 50px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 999999;
  }

  #chat-window {
    position: fixed;
    bottom: 100px;
    right: 30px;
    width: 420px;
    height: 600px;
    background: #fff;
    border-radius: 24px;
    display: none;
    flex-direction: column;
    box-shadow: 0 25px 60px rgba(0,0,0,0.2);
    z-index: 999999;
    overflow: hidden;
  }

  .chat-header {
    padding: 20px 25px;
    background: #ffffff;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #1e1b4b;
  }

  .chat-header h4 {
    margin: 0;
    font-weight: 800;
  }

  .status-line {
    font-size: 11px;
    color: #64748b;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    display: inline-block;
    margin-right: 5px;
  }

  .chat-messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: #fcfcfd;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .msg {
    max-width: 85%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.5;
  }

  .msg-ai {
    background: #ffffff;
    color: #1e293b;
    border: 1px solid #e5e7eb;
    align-self: flex-start;
  }

  .msg-user {
    background: var(--brand-purple);
    color: #ffffff;
    align-self: flex-end;
  }

  .chat-input {
    padding: 20px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    gap: 10px;
  }

  .chat-input input {
    flex: 1;
    border: 2px solid #f1f5f9;
    padding: 12px 20px;
    border-radius: 12px;
    outline: none;
  }

  .chat-input input:focus {
    border-color: var(--brand-purple);
  }

  .chat-input button {
    background: var(--brand-purple);
    border: none;
    color: #fff;
    width: 45px;
    height: 45px;
    border-radius: 12px;
    cursor: pointer;
  }

  .typing {
    display: none;
    font-size: 12px;
    color: #94a3b8;
    margin-left: 20px;
  }
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

  trigger.onclick = () => {
    chatWindow.style.display = "flex";
    setTimeout(() => input.focus(), 50);
  };

  closeBtn.onclick = () => chatWindow.style.display = "none";

  sendBtn.onclick = sendMessage;
  input.onkeydown = e => e.key === "Enter" && sendMessage();

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

    } catch {
      typing.style.display = "none";
      append("ai", "Error connecting to server.");
      setTimeout(() => input.focus(), 50);
    }
  }
}
