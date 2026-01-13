// ===============================
//  READ CONFIG FROM SCRIPT TAG
// ===============================
const scriptTag = document.currentScript;

const CLIENT_KEY   = scriptTag.dataset.clientKey || "demo_client";
const BRAND_COLOR  = scriptTag.dataset.brandColor || "#8b5cf6";
const AGENT_NAME   = scriptTag.dataset.agentName || "AI Assistant";
const LOGO_URL     = scriptTag.dataset.logo || null;
const WELCOME_MSG  = scriptTag.dataset.welcome || "Hello! How can I help you today?";
const THEME        = scriptTag.dataset.theme || "light";
const WEBHOOK_URL  = scriptTag.dataset.webhook;

// ===============================
//  WIDGET HTML TEMPLATE
// ===============================
const widgetHTML = `
<div id="ai-widget">
    <button id="chat-trigger">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        ${AGENT_NAME}
    </button>

    <div id="chat-window">
        <div class="chat-header">
            <div class="header-left">
                ${LOGO_URL ? `<img src="${LOGO_URL}" class="agent-logo" />` : ""}
                <div>
                    <h4>${AGENT_NAME}</h4>
                    <div class="status"><span class="status-dot"></span>Online</div>
                </div>
            </div>
            <button id="chat-close">×</button>
        </div>

        <div class="chat-messages" id="chat-msgs">
            <div class="msg msg-ai">${WELCOME_MSG}</div>
        </div>

        <div class="typing" id="typing">Processing...</div>

        <div class="chat-input">
            <input id="user-input" type="text" placeholder="Type your question...">
            <button id="send-btn">➤</button>
        </div>
    </div>
</div>
`;

// ===============================
//  STREAMLIT-SAFE DOM INJECTION
// ===============================
function waitForBody(callback) {
    if (document.body) {
        callback();
        return;
    }

    const observer = new MutationObserver(() => {
        if (document.body) {
            observer.disconnect();
            callback();
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
}

waitForBody(() => {
    document.body.insertAdjacentHTML("beforeend", widgetHTML);
    injectStyles();
    setupWidgetLogic();
});

// ===============================
//  INJECT CSS
// ===============================
function injectStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
    #chat-trigger {
        position: fixed; bottom: 30px; right: 30px;
        background: ${BRAND_COLOR};
        color: white; border: none; padding: 16px 28px;
        border-radius: 50px; font-weight: 700;
        cursor: pointer; display: flex; align-items: center;
        gap: 10px; z-index: 1001; transition: 0.3s;
    }
    #chat-trigger:hover { transform: scale(1.05); }

    #chat-window {
        position: fixed; bottom: 100px; right: 30px;
        width: 420px; height: 600px; background: white;
        border-radius: 24px; display: none; flex-direction: column;
        box-shadow: 0 25px 60px rgba(0,0,0,0.2);
        z-index: 1000; border: 1px solid #e2e8f0;
        overflow: hidden;
    }

    .agent-logo {
        width: 32px; height: 32px; border-radius: 50%; margin-right: 10px;
    }

    .chat-header {
        padding: 20px; background: white;
        border-bottom: 1px solid #f1f5f9;
        display: flex; justify-content: space-between; align-items: center;
    }

    .chat-messages {
        flex: 1; overflow-y: auto; padding: 20px;
        background: #fcfcfd; display: flex; flex-direction: column; gap: 15px;
    }

    .msg {
        max-width: 85%; padding: 12px 16px; border-radius: 16px;
        font-size: 14px; line-height: 1.5;
    }

    .msg-ai {
        background: #f3e8ff; color: #1e1b4b;
        align-self: flex-start; border-bottom-left-radius: 2px;
    }

    .msg-user {
        background: ${BRAND_COLOR}; color: white;
        align-self: flex-end; border-bottom-right-radius: 2px;
    }

    .chat-input {
        padding: 20px; background: white;
        border-top: 1px solid #f1f5f9; display: flex; gap: 10px;
    }

    .chat-input button {
        background: ${BRAND_COLOR}; color: white;
        border: none; width: 45px; height: 45px;
        border-radius: 12px; cursor: pointer;
    }

    .typing { display: none; font-size: 12px; color: #94a3b8; margin-left: 5px; }

    html.ai-dark #chat-window { background: #1e1e1e; color: white; }
    html.ai-dark .msg-ai { background: #333; color: #eee; }
    html.ai-dark .chat-input { background: #111; }
    `;
    document.head.appendChild(style);

    if (THEME === "dark") document.documentElement.classList.add("ai-dark");
    if (THEME === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
        document.documentElement.classList.add("ai-dark");
}

// ===============================
//  WIDGET LOGIC
// ===============================
function setupWidgetLogic() {
    const chatWindow = document.getElementById("chat-window");
    const msgsContainer = document.getElementById("chat-msgs");
    const typingLabel = document.getElementById("typing");
    const input = document.getElementById("user-input");

    document.getElementById("chat-trigger").onclick = () => {
        chatWindow.style.display = "flex";
    };

    document.getElementById("chat-close").onclick = () => {
        chatWindow.style.display = "none";
    };

    document.getElementById("send-btn").onclick = sendMessage;
    input.onkeydown = e => e.key === "Enter" && sendMessage();

    function appendMessage(role, text) {
        const div = document.createElement("div");
        div.className = `msg msg-${role}`;
        div.innerHTML = text;
        msgsContainer.appendChild(div);
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        appendMessage("user", text);
        input.value = "";
        typingLabel.style.display = "block";

        try {
            const res = await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: text,
                    client_key: CLIENT_KEY
                })
            });

            const data = await res.json();
            typingLabel.style.display = "none";

            appendMessage("ai", data.output || "No response.");
        } catch {
            typingLabel.style.display = "none";
            appendMessage("ai", "Error connecting to server.");
        }
    }
}
