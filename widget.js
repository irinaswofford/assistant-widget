// ===============================
//  CLINICAL ASSISTANT WIDGET
// ===============================
const scriptTag = document.currentScript;

const WEBHOOK_URL = scriptTag.dataset.webhook;
const BRAND_COLOR = scriptTag.dataset.brandColor || "#8b5cf6";
const AGENT_NAME  = scriptTag.dataset.agentName || "Clinical Assistant";
const WELCOME_MSG = scriptTag.dataset.welcome ||
  "Hi, I'm the Clinical Assistant. Ask me anything about patient data.";
const CLIENT_KEY  = scriptTag.dataset.clientKey;   // ← NEW



// ===============================
//  WIDGET HTML
// ===============================
const widgetHTML = `
<div id="ai-widget">

  <!-- Chat Trigger Button -->
  <button id="chat-trigger">💬 ${AGENT_NAME}</button>

  <!-- Chat Window -->
  <div id="chat-window">
    <div class="chat-header">
      <div class="header-info">
        <h4>${AGENT_NAME}</h4>
        <div class="status-line">
          <span class="status-dot"></span> RAG Pipeline Active
        </div>
      </div>
      <div class="header-buttons">
        <button id="clear-btn">Clear</button>
        <button id="history-btn">History</button>
        <button class="close-btn">×</button>
      </div>
    </div>

    <!-- Messages -->
    <div class="chat-messages" id="chat-msgs">
      <div class="msg msg-ai">${WELCOME_MSG}</div>
    </div>

    <!-- Typing Indicator -->
    <div class="typing" id="typing">Processing…</div>

    <!-- Input -->
    <div class="chat-input">
      <input type="text" id="user-input" placeholder="Type your question…" autocomplete="off" />
      <button id="send-btn">➤</button>
    </div>
  </div>
</div>
`;

// ===============================
//  INJECT WIDGET
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
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  :root {
    --brand-purple: ${BRAND_COLOR};
    --bg-dark: #0f172a;
    --card-bg: #1e293b;
  }

  #ai-widget, #ai-widget * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; pointer-events: auto !important; }

  /* Chat Trigger */
  #chat-trigger {
    position: fixed; bottom: 30px; right: 30px;
    background: var(--brand-purple); color: #fff;
    border: none; padding: 16px 28px;
    border-radius: 50px; font-weight: 700;
    cursor: pointer; display: flex;
    align-items: center; gap: 10px; z-index: 999999;
    box-shadow: 0 10px 30px rgba(139,92,246,.35);
    transition: transform 0.2s;
  }
  #chat-trigger:hover { transform: scale(1.05); }

  /* Chat Window */
  #chat-window {
    position: fixed; bottom: 90px; right: 30px;
    width: 420px; height: 600px; background: var(--card-bg);
    border-radius: 24px; display: none;
    flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.35);
    z-index: 999998; overflow: hidden;
  }

  /* Chat Header */
  .chat-header {
    padding: 16px; display: flex;
    justify-content: space-between; align-items: center;
    background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1);
    color: #f8fafc;
  }
  .header-info h4 { margin: 0; font-weight: 700; font-size: 16px; }
  .status-line { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; margin-right: 6px; }

  .header-buttons { display: flex; gap: 6px; }
  .header-buttons button {
    background: transparent; border: 1px solid #fff; color: #fff;
    padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;
    transition: background 0.2s, color 0.2s;
  }
  .header-buttons button:hover { background: #fff; color: var(--card-bg); }

  /* Messages */
  .chat-messages {
    flex: 1; padding: 16px; overflow-y: auto;
    display: flex; flex-direction: column; gap: 12px;
    background: var(--card-bg);
  }
  .msg { padding: 10px 14px; border-radius: 16px; font-size: 14px; max-width: 80%; word-wrap: break-word; line-height: 1.4; }
  .msg-ai { background: #1e293b; color: #f8fafc; align-self: flex-start; }
  .msg-user { background: var(--brand-purple); color: #fff; align-self: flex-end; }

  /* Typing */
  .typing { font-size: 12px; color: #94a3b8; padding: 4px 16px; display: none; font-style: italic; }

  /* Input */
  .chat-input {
    display: flex; gap: 10px; padding: 16px; border-top: 1px solid rgba(255,255,255,0.1);
  }
  .chat-input input {
    flex: 1; padding: 12px 16px; border-radius: 24px;
    border: 1px solid #334155; outline: none;
    background: var(--bg-dark); color: #fff; caret-color: #fff; font-size: 14px;
  }
  .chat-input input::placeholder { color: #94a3b8; }
  .chat-input input:focus { border-color: var(--brand-purple); }
  .chat-input button {
    width: 42px; height: 42px; border-radius: 50%;
    background: var(--brand-purple); color: #fff; border: none; cursor: pointer;
    transition: transform 0.2s;
  }
  .chat-input button:hover { transform: scale(1.1); }
  `;
  document.head.appendChild(style);
}

// ===============================
//  WIDGET LOGIC
// ===============================
function setupWidgetLogic() {
  const chatWindow = document.getElementById("chat-window");
  const chatMsgs = document.getElementById("chat-msgs");
  const typing = document.getElementById("typing");
  const input = document.getElementById("user-input");

  const trigger = document.getElementById("chat-trigger");
  const closeBtn = document.querySelector(".close-btn");
  const sendBtn = document.getElementById("send-btn");
  const clearBtn = document.getElementById("clear-btn");
  const historyBtn = document.getElementById("history-btn");

  const history = [];

  trigger.onclick = () => {
    chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex';
    if(chatWindow.style.display === 'flex') setTimeout(()=>input.focus(),50);
  };

  closeBtn.onclick = () => chatWindow.style.display = 'none';

  clearBtn.onclick = () => {
    chatMsgs.innerHTML = '';
  };

  historyBtn.onclick = () => {
    chatMsgs.innerHTML = '';
    history.forEach(msg=>{
      const div = document.createElement("div");
      div.className = `msg msg-${msg.role}`;
      div.textContent = msg.text;
      chatMsgs.appendChild(div);
    });
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  };

  sendBtn.onclick = sendMessage;
  input.addEventListener("keydown", e => e.key === "Enter" && sendMessage());

  function append(role,text){
    const div = document.createElement("div");
    div.className = `msg msg-${role}`;
    div.textContent = text;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    history.push({role,text});
  }


  async function sendMessage(){
  const text = input.value.trim();
  if(!text) return;
  append("user", text);
  input.value = '';
  typing.style.display = "block";

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLIENT_KEY}`  // add your client key here
      },
      body: JSON.stringify({ query: text })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    typing.style.display = "none";
    append("ai", data.output || "No response from server.");

  } catch(e) {
    typing.style.display = "none";
    append("ai", `Error connecting to server: ${e.message}`);
  }
}

}
