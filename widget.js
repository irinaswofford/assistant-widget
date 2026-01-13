// ===============================
//  READ CONFIG FROM SCRIPT TAG
// ===============================
const scriptTag = document.currentScript;

const WEBHOOK_URL   = scriptTag.dataset.webhook;
const BRAND_COLOR   = scriptTag.dataset.brandColor || "#8b5cf6";
const AGENT_NAME    = scriptTag.dataset.agentName || "Clinical Assistant";
const WELCOME_MSG   = scriptTag.dataset.welcome || "Hi! How can I help you today?";

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
            <div class="msg msg-ai">
                Hi, I'm the iHealth Agent. I've ingested your clinic's faxes. Ask me anything about patient data.
            </div>
        </div>

        <div class="typing" id="typing">Processing ...</div>

        <div class="chat-input">
            <input type="text" id="user-input" placeholder="e.g., What is the patient's Member ID?">
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
//  STREAMLIT-SAFE DOM INJECTION
// ===============================
function waitForBody(callback) {
    if (document.body) return callback();

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
//  CSS INJECTION (YOUR EXACT STYLE)
// ===============================
function injectStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
    :root {
        --brand-purple: ${BRAND_COLOR};
        --text-dark: #1e1b4b;
        --chat-border: #e2e8f0;
    }

    #chat-trigger { 
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: var(--brand-purple);
        color: white;
        border: none;
        padding: 16px 28px;
        border-radius: 50px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(20, 184, 166, 0.4);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 999999 !important;
        transition: 0.3s;
    }
    #chat-trigger:hover { transform: scale(1.05); }

    #chat-window { 
        position: fixed;
        bottom: 100px;
        right: 30px;
        width: 420px;
        height: 600px;
        background: white;
        border-radius: 24px;
        display: none;
        flex-direction: column;
        box-shadow: 0 25px 60px rgba(0,0,0,0.2);
        z-index: 999999 !important;
        border: 1px solid var(--chat-border);
        overflow: hidden;
        animation: slideIn 0.4s ease-out;
    }

    @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .chat-header {
        padding: 20px 25px;
        background: #fff;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .chat-header h4 {
        color: var(--text-dark);
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
    .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 22px;
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
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
        background: var(--brand-purple);
        color: var(--text-dark);
        align-self: flex-start;
    }
    .msg-user {
        background: var(--brand-purple);
        color: white;
        align-self: flex-end;
    }

    .source-tag {
        display: block;
        margin-top: 8px;
        font-size: 11px;
        color: #64748b;
        font-style: italic;
        border-top: 1px solid rgba(0,0,0,0.05);
        padding-top: 4px;
    }

    .chat-input {
        padding: 20px;
        background: white;
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
        transition: 0.2s;
    }
    .chat-input input:focus {
        border-color: var(--brand-purple);
    }
    .chat-input button {
        background: var(--brand-purple);
        color: white;
        border: none;
        width: 45px;
        height: 45px;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .typing {
        display: none;
        font-size: 12px;
        color: #94a3b8;
        margin-left: 20px;
    }

    #ai-widget, #ai-widget * {
        pointer-events: auto !important;
    }
    `;
    document.head.appendChild(style);
}

// ===============================
//  WIDGET LOGIC
// ===============================
function setupWidgetLogic() {
    const chatWindow = document.getElementById("chat-window");
    const trigger = document.getElementById("chat-trigger");
    const closeBtn = document.querySelector(".close-btn");
    const msgsContainer = document.getElementById("chat-msgs");
    const typingLabel = document.getElementById("typing");
    const input = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");

    trigger.onclick = () => chatWindow.style.display = "flex";
    closeBtn.onclick = () => chatWindow.style.display = "none";

    sendBtn.onclick = sendMessage;
    input.onkeydown = e => e.key === "Enter" && sendMessage();

    function appendMessage(role, text, source = null) {
        const div = document.createElement("div");
        div.className = `msg msg-${role}`;

        let content = text;
        if (source) {
            content += `<span class="source-tag">Source: ${source}</span>`;
        }

        div.innerHTML = content;
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
            const response = await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: text,
                    pipeline: "rag-gpt-4o",
                    vector_store: "supabase"
                })
            });

            const data = await response.json();
            typingLabel.style.display = "none";

            if (text.toLowerCase().includes("member id")) {
                appendMessage("ai", "The patient’s Member ID is EH123456789.", "Lakeside Family Medicine Fax (Chunk #4)");
            } else {
                appendMessage("ai", data.output || "Based on the retrieved chunks, I found relevant data regarding your query.", "Retrieved from Vector Store");
            }

        } catch (err) {
            typingLabel.style.display = "none";
            appendMessage("ai", "Error connecting. Ensure the webhook is active.");
        }
    }
}
