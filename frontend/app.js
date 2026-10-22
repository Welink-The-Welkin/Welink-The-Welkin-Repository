// 本文件由 codex 辅助生成（外围模块）
const root = document.querySelector("#app");
const toast = document.querySelector("#toast");
const CHARACTER_NAME = "「浮浪倾客」";

const storyCatalog = [
  {
    id: "archive-wind",
    chapter: "第一篇",
    title: "旧档案里的风声",
    summary: "从一宗遭人改写的旧档案开始，沿着目击者留下的线索，查明真相并决定由谁承担代价。",
    replayId: "demo_guarded_path",
    mark: "風",
  },
  {
    id: "archive-truth",
    chapter: "另一种开端",
    title: "直面委托背后的真相",
    summary: "从开场便追问委托隐瞒的部分；踏入同一条调查主线后，后续场景和结局仍由你的选择决定。",
    replayId: "demo_direct_path",
    mark: "问",
  },
];

const sceneLabels = {
  scene_01: "荒野边缘",
  scene_02: "旧址入口",
  scene_03: "风起之前",
  scene_truth: "被改写的真相",
  scene_task: "委托现场",
  scene_evidence: "证据与代价",
  scene_confrontation: "正面冲突",
  scene_return: "归来的风",
};

const sceneDescriptions = {
  scene_01: "风掠过荒野边缘，委托人的话有几处说不通。「浮浪倾客」停下脚步，等你给出一个理由。",
  scene_02: "旧档案的纸页被潮气卷起，几行关键字迹像是后来才被人补上的。",
  scene_truth: "被撕掉的记录露出半截名字。「浮浪倾客」看着那道裂口，神情比风更冷。",
  scene_03: "你沿着风里残留的气息走向旧址，脚下的砂砾掩着无人愿意提起的代价。",
  scene_witness: "目击者把声音压得很低，仿佛多说一个字，就会让某段过去重新醒来。",
  scene_truth_evidence: "被抹去的痕迹终于连成一线，真相开始显出让人无法回避的形状。",
  scene_confront: "委托人站在风口，仍试图用漂亮话填平记录里的缺口。",
  scene_04: "证据已经足够。现在要决定的不是谁说得更好听，而是谁愿意接住后果。",
  scene_05: "真相摆在两人之间，沉默和坦白都不再是没有代价的选择。",
  scene_06: "风从旧址上方掠过，留下来的脚步声和离开的脚步声一样清楚。",
  scene_07: "最后一段路没有旁观者。你要护住谁，也要承认自己准备失去什么。",
  scene_08: "风停在悬崖边，旅途的答案只剩下最后一个动作。",
};

const endingLabels = {
  evidence_keeper: "见证者",
  burden_bearer: "负重者",
  merciful_wanderer: "留风之人",
  solitary_wanderer: "独行者",
};

const endingEpilogues = {
  evidence_keeper: "你把证据留在众人面前。记住真相不是为了让旧事重演，而是让后来的人不必再替谎言付账。",
  burden_bearer: "你选择接过后果。没有谁因此获得赦免，但至少这一次，责任没有被推给沉默的人。",
  merciful_wanderer: "你没有替任何人宣判，也没有把伤害说成过去。留下的善意很轻，却足够让风继续向前。",
  solitary_wanderer: "你独自离开现场。脚步会渐渐远去，做过的决定却仍属于你。",
};

function sceneLabel(sceneId) {
  return sceneLabels[sceneId] || "旅途片段";
}

function endingLabel(endingId) {
  return endingLabels[endingId] || "未命名结局";
}

function endingEpilogue(endingId, playerName) {
  const closing = endingEpilogues[endingId] || "风会继续吹过这里。你带走的不是答案，而是自己愿意承担的部分。";
  return `${playerName}，${closing}`;
}

const appState = {
  playerName: localStorage.getItem("wanderer-player-name") || "",
  sessionId: localStorage.getItem("wanderer-session"),
  session: null,
  ending: null,
  chatSessionId: localStorage.getItem("wanderer-chat-session"),
  chatSession: null,
  pendingChat: null,
  regeneratingChat: false,
  revealChatReply: false,
  chatHistory: readChatHistory(),
  chatTitles: readChatTitles(),
  selectedReplayId: "demo_guarded_path",
  resumePromptRequired: false,
  resumePromptDismissed: false,
  busy: false,
};

function readChatHistory() {
  try {
    const value = JSON.parse(localStorage.getItem("wanderer-chat-history") || "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function readChatTitles() {
  try {
    const value = JSON.parse(localStorage.getItem("wanderer-chat-titles") || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function rememberChatSession(sessionId) {
  if (!sessionId) return;
  appState.chatHistory = [sessionId, ...appState.chatHistory.filter((id) => id !== sessionId)].slice(0, 8);
  localStorage.setItem("wanderer-chat-history", JSON.stringify(appState.chatHistory));
}

function rememberChatTitle(sessionId, title) {
  if (!sessionId || !title || title === "新对话") return;
  if (appState.chatTitles[sessionId] !== title) {
    appState.chatTitles[sessionId] = title.trim().slice(0, 24);
    localStorage.setItem("wanderer-chat-titles", JSON.stringify(appState.chatTitles));
  }
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const normalizePlayerName = (value) => Array.from(String(value ?? "").trim()).slice(0, 20).join("");

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) {
    const details = body.error?.details || {};
    const diagnosticLines = [
      body.request_id ? `本地请求编号：${body.request_id}` : "",
      details.provider_status ? `上游状态：HTTP ${details.provider_status}` : "",
      details.provider_code ? `服务商错误码：${details.provider_code}` : "",
      details.model ? `模型：${details.model}` : "",
      details.endpoint ? `请求地址：${details.endpoint}` : "",
      details.provider_request_id ? `服务商请求编号：${details.provider_request_id}` : "",
    ].filter(Boolean);
    throw new Error([body.error?.message || "请求失败，请稍后重试。", ...diagnosticLines].join("\n"));
  }
  return body.data;
}

function announce(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 2400);
}

function setBusy(value) {
  appState.busy = value;
  root.querySelectorAll("button,input").forEach((control) => { control.disabled = value; });
}

function showError(message) {
  const node = root.querySelector("[data-error], [data-chat-error]");
  if (node) node.innerHTML = `<div class="error-box" role="alert">${escapeHtml(message)}</div>`;
  else announce(message);
}

function renderHome() {
  root.innerHTML = `
    <section class="home">
      <div class="home-mark"><span>風</span></div>
      <div class="eyebrow">文字互动旅途</div>
      <h1>风起异途</h1>
      <p class="home-lead">一段关于选择、真相与承担的短途旅程。<br>风不会替任何人停留，答案也不会自己出现。</p>
      <div class="home-rule"></div>
      <p class="home-sub">纯文字互动 · 约 5 分钟 · 可随时重新开始</p>
      <a class="intro-link" href="#/intro">角色与玩法</a>
      <label class="player-name-field" for="player-name">开始前，先告诉我该如何称呼你</label>
      <input class="player-name-input" id="player-name" data-player-name name="player_name" maxlength="20" autocomplete="nickname" required placeholder="输入你的名字" value="${escapeHtml(appState.playerName)}">
      <div class="home-actions"><a class="primary-btn" data-action="story-directory" href="#/stories">开始剧情旅途 <span aria-hidden="true">→</span></a><a class="secondary-btn home-chat-link" href="#/chat">进入自由对话</a></div>
    </section>`;
}

function showResumeDialog() {
  if (!appState.session || appState.session.state?.is_finished || appState.resumePromptDismissed) return "";
  return `<div class="resume-overlay"><section class="resume-dialog" role="dialog" aria-modal="true" aria-labelledby="resume-title"><div class="eyebrow">未完成的旅途</div><h2 id="resume-title">要继续上一段旅途吗？</h2><p>上一段故事停在「${escapeHtml(sceneLabel(appState.session.state.scene_id))}」，你的选择与进度都还在。</p><div class="resume-actions"><button class="primary-btn" data-action="resume-journey">是，继续上一段旅途</button><button class="secondary-btn" data-action="dismiss-resume">否，暂不继续</button></div></section></div>`;
}

function dismissResumePrompt() {
  appState.resumePromptRequired = false;
  appState.resumePromptDismissed = true;
  if (window.location.hash === "#/game") window.location.hash = "#home";
  renderRoute();
}

function renderStoryDirectory() {
  const rows = storyCatalog.map((story) => `
    <button class="story-row" data-action="select-story" data-replay-id="${escapeHtml(story.replayId)}">
      <span class="story-chapter">${escapeHtml(story.chapter)}</span>
      <span class="story-copy"><strong>${escapeHtml(story.title)}</strong><small>${escapeHtml(story.summary)}</small></span>
      <span class="story-mark" aria-hidden="true">${escapeHtml(story.mark)}</span>
    </button>`).join("");
  root.innerHTML = `<section class="story-directory"><div class="eyebrow">可选故事</div><h1>选择一段旅途</h1><p class="directory-intro">从一宗旧档案篡改事件开始，追寻失踪目击者留下的线索。当前收录的故事会随你的调查选择分出不同走向；更多故事线可在此目录中继续扩展。</p><div class="story-list" aria-label="剧情目录">${rows}</div></section>`;
}

function selectStory(replayId) {
  const story = storyCatalog.find((item) => item.replayId === replayId);
  if (!story) return;
  appState.selectedReplayId = story.replayId;
  if (!appState.playerName) renderNameGate("story", story.replayId);
  else startSession(story.replayId);
}

function renderRoleIntro() {
  root.innerHTML = `
    <section class="intro-page">
      <div class="eyebrow">角色与玩法</div>
      <h1>${CHARACTER_NAME}</h1>
      <p class="intro-lead">身份成谜的浮浪人，心随形至的修验者，如清风一般，活在世间，行在人间。</p>
      <div class="intro-rule"></div>
      <h2>关于这段旅途</h2>
      <p>你可以用自己的名字踏上旅途。须弥近郊一宗关于旧档案遭篡改的委托，把你和${CHARACTER_NAME}带到同一条线索上。追查、保护他人或承担风险，都会留下不同的后果；这段故事不会替任何人开脱。</p>
      <h2>前情概要</h2>
      <p>一名委托人声称，旧档案里记录的事故经过遭人改写，唯一知情的目击者也失去了踪迹。你将在荒野与旧址间寻找证据，判断该保护谁、公开什么，以及谁应该承担代价。</p>
      <h2>操作方式</h2>
       <p>每回合点击当前选项推进剧情。剧情旅途无需网络；自由对话是否连接模型服务由项目配置决定。</p>
      <label class="player-name-field" for="intro-player-name">你希望故事如何称呼你？</label>
      <input class="player-name-input" id="intro-player-name" data-player-name name="player_name" maxlength="20" autocomplete="nickname" required placeholder="输入你的名字" value="${escapeHtml(appState.playerName)}">
      <div class="home-actions"><button class="primary-btn" data-action="start">开始剧情旅途 <span aria-hidden="true">→</span></button><a class="secondary-btn home-chat-link" href="#/chat">进入自由对话</a></div>
    </section>`;
}

function renderNameGate(target = "story", replayId = appState.selectedReplayId) {
  root.innerHTML = `
    <section class="intro-page name-gate">
      <div class="eyebrow">旅途准备</div>
      <h1>先取一个称呼</h1>
      <p>开始前，请告诉「浮浪倾客」该如何称呼你。这个名字会显示在对话和旅途记录中。</p>
      <form data-form="player-name" data-start-target="${target}" data-replay-id="${escapeHtml(replayId)}">
        <label class="player-name-field" for="gate-player-name">你的名字</label>
        <input class="player-name-input" id="gate-player-name" data-player-name name="player_name" maxlength="20" autocomplete="nickname" required placeholder="输入你的名字">
        <button class="primary-btn" type="submit">继续</button>
      </form>
    </section>`;
}

function chatMessageText(message) {
  return message?.role === "user"
    ? (message.content || message.message || message.reply || "")
    : (message.reply || message.content || message.message || "");
}

function renderReplyActions({ index, canRegenerate = false }) {
  const copy = `<button class="chat-action" type="button" data-action="copy-reply" data-index="${index}" title="复制这条回复">复制</button>`;
  const regenerate = canRegenerate ? `<button class="chat-action" type="button" data-action="regenerate-reply" title="让${CHARACTER_NAME}重新回应这条消息">重新生成</button>` : "";
  return `<div class="chat-actions">${copy}${regenerate}</div>`;
}

function renderChatMessage(message, playerName = appState.playerName || "你", actions = {}) {
  if (message?.role) {
    const pending = message.pending ? " pending" : "";
    const reveal = message.reveal ? " reveal" : "";
    const text = message.pending ? `${CHARACTER_NAME}正在回应……` : chatMessageText(message);
    const isAssistant = message.role !== "user";
    const showActions = isAssistant && !message.pending && Number.isInteger(actions.index);
    const replyActions = showActions ? renderReplyActions({ index: actions.index, canRegenerate: Boolean(actions.canRegenerate) }) : "";
    return `<div class="chat-message ${message.role === "user" ? "user" : "assistant"}${pending}${reveal}"><div class="chat-speaker">${message.role === "user" ? escapeHtml(playerName) : CHARACTER_NAME}</div><p>${escapeHtml(text)}</p><time>${escapeHtml(message.created_at || "")}</time>${replyActions}</div>`;
  }
  return `${renderChatMessage({ role: "user", message: message?.message }, playerName)}${renderChatMessage({ role: "assistant", reply: message?.reply, reveal: message?.reveal }, playerName, actions)}`;
}

function chatHistoryMarkup() {
  if (!appState.chatHistory.length) return `<p class="chat-history-empty">尚无历史对话</p>`;
  return appState.chatHistory.map((id) => `<div class="chat-history-entry"><button class="chat-history-item ${id === appState.chatSessionId ? "active" : ""}" data-action="restore-chat" data-chat-session="${escapeHtml(id)}"><span>${escapeHtml(appState.chatTitles[id] || "历史对话")}</span></button><button class="chat-history-delete" data-action="delete-chat" data-chat-session="${escapeHtml(id)}" aria-label="删除这段对话">删除</button></div>`).join("");
}

function renderChat() {
  const session = appState.chatSession;
  const messages = session?.messages || [];
  const chatPlayerName = session?.player_name || appState.playerName || "你";
  const regeneratingMessage = appState.regeneratingChat && messages.length ? messages.at(-1) : null;
  const visibleMessages = regeneratingMessage ? messages.slice(0, -1) : messages;
  const storedMarkup = visibleMessages.length
    ? visibleMessages.map((message, index) => renderChatMessage(
        { ...message, reveal: appState.revealChatReply && index === messages.length - 1 },
        chatPlayerName,
        { index, canRegenerate: !regeneratingMessage && index === messages.length - 1 },
      )).join("")
    : "";
  const regeneratingMarkup = regeneratingMessage
    ? `${renderChatMessage({ role: "user", message: regeneratingMessage.message }, chatPlayerName)}${renderChatMessage({ role: "assistant", pending: true }, chatPlayerName)}`
    : "";
  const pendingMarkup = appState.pendingChat
    ? `${renderChatMessage({ role: "user", message: appState.pendingChat.message }, chatPlayerName)}${renderChatMessage({ role: "assistant", pending: true }, chatPlayerName)}`
    : "";
  const messageMarkup = messages.length
    ? `${storedMarkup}${regeneratingMarkup}${pendingMarkup}`
    : (pendingMarkup || `<div class="chat-empty"><div class="role-symbol" aria-hidden="true">風</div><h2>让风听见你的话</h2><p>这里没有预设选项。你可以直接说出想问的事，${CHARACTER_NAME}会以自己的方式回应。</p></div>`);
  root.innerHTML = `
    <section class="chat-layout">
      <aside class="chat-history">
        <div class="chat-history-head"><div><div class="side-label">历史</div><h2>对话记录</h2></div><button class="quiet-btn" data-action="start-chat" title="新建对话">新建</button></div>
        <div class="chat-history-list">${chatHistoryMarkup()}</div>
      </aside>
      <section class="chat-panel" aria-label="自由对话">
        <div class="scene-head"><div><div class="eyebrow">自由对话</div><h1 class="chat-title">与${CHARACTER_NAME}交谈</h1></div></div>
        <p class="chat-disclaimer">自由对话不改变剧情模式的状态与结局。</p>
        <div class="chat-messages" aria-live="polite">${messageMarkup}</div>
        <div data-chat-error></div>
        ${session ? `<form class="input-row chat-input-row" data-form="chat"><label class="screen-reader" for="chat-message">输入对话</label><input id="chat-message" maxlength="1000" placeholder="说点什么……" autocomplete="off"><button class="primary-btn" type="submit">发送</button></form>` : `<button class="primary-btn chat-start-btn" data-action="start-chat">开始自由对话</button>`}
      </section>
    </section>`;
}

function renderGame() {
  const session = appState.session;
  if (!session) return renderHome();
  const state = session.state;
  const response = session.last_response;
  const history = state.history || [];
  // The backend records the submitted choice on the current history item before
  // returning its response. Keep that player input visible in the same turn;
  // the response is rendered from last_response below to avoid duplicating it.
  const completedHistory = history.slice(0, -1);
  const currentPlayerInput = state.is_finished ? null : history.at(-1)?.player_input;
  const playerName = state.player_name || appState.playerName || "你";
  const lines = completedHistory.map((item) => `<div class="dialogue player"><div class="speaker">${escapeHtml(playerName)}</div><p>${escapeHtml(item.player_input)}</p></div><div class="dialogue"><div class="speaker">${CHARACTER_NAME}</div><p>${escapeHtml(item.response_summary)}</p></div>`).join("");
  const currentLine = currentPlayerInput ? `<div class="dialogue player"><div class="speaker">${escapeHtml(playerName)}</div><p>${escapeHtml(currentPlayerInput)}</p></div>` : "";
  const options = response?.next_scene?.options || [];
  const ended = state.is_finished;

  if (ended) return renderEnding(response, appState.ending, playerName);

  root.innerHTML = `
    <section class="game-layout">
      <aside class="side-rail">
        <div class="role-symbol" aria-hidden="true">風</div>
        <div><h2>${CHARACTER_NAME}</h2></div>
        <div class="side-divider"></div>
        <div class="side-label">旅途状态</div>
        <div class="status-list">
          <div class="status-item"><span>信任</span><strong>${state.trust}</strong></div>
          <div class="status-item"><span>共情</span><strong>${state.compassion}</strong></div>
          <div class="status-item"><span>承担</span><strong>${state.responsibility}</strong></div>
        </div>
        <button class="quiet-btn" data-action="restart">重新开始</button>
      </aside>
      <section class="conversation" aria-label="互动故事">
        <div class="scene-head"><h3 class="scene-title">${escapeHtml(sceneLabel(state.scene_id))}</h3><span class="turn-count">第 ${state.turn_count + 1} 回合</span></div>
        ${state.turn_count === 0 ? `<section class="story-briefing" aria-label="前情概要"><h2>前情概要</h2><p>须弥近郊有人委托调查一宗旧档案篡改事件，唯一知情的目击者也失去了踪迹。你将和${CHARACTER_NAME}沿着遗留线索寻找真相，并决定保护谁、公开什么，以及谁来承担代价。</p><p>本局将以「${escapeHtml(playerName)}」称呼你。</p></section>` : ""}
        <p class="scene-copy">${escapeHtml(sceneDescriptions[state.scene_id] || `风从身侧掠过，${CHARACTER_NAME}等着你给出一个理由。`)}</p>
        <div class="dialogue-list">
          ${lines}${currentLine}
          ${response ? `<div class="dialogue"><div class="speaker">${CHARACTER_NAME}</div><p>${escapeHtml(response.reply)}</p></div>` : ""}
        </div>
        <div data-error></div>
        ${options.length ? `<div class="options" aria-label="可选行动">${options.map((option) => `<button class="option-btn" data-action="option" data-option="${escapeHtml(option.id)}">${escapeHtml(option.text)}</button>`).join("")}</div>` : ""}

        <p class="loading" data-loading hidden>正在整理这段回应……</p>
      </section>
    </section>`;
}

function renderEnding(response, ending, playerName = "你") {
  const endingDetails = ending
    ? `<div class="ending-id">结局记录 · ${escapeHtml(endingLabel(ending.ending_id))}</div><h2>${escapeHtml(ending.title)}</h2><p>${escapeHtml(ending.summary)}</p>`
    : `<p class="ending-pending">结局说明暂不可用。</p>`;
  root.innerHTML = `<section class="result"><div class="eyebrow">旅途记录</div><h1>旅途暂告一段落</h1>${endingDetails}<section class="ending-epilogue"><h2>旅途之后</h2><p>${escapeHtml(endingEpilogue(ending?.ending_id, playerName))}</p></section><div class="ending-quote"><span class="speaker">${CHARACTER_NAME}</span><p>${escapeHtml(response?.reply || "风停了片刻。接下来要走哪条路，由你自己决定。")}</p></div><button class="primary-btn" data-action="restart">重新开始</button></section>`;
}

async function startSession(replayId = appState.selectedReplayId) {
  const nameInput = root.querySelector("[data-player-name]");
  const playerName = normalizePlayerName(nameInput?.value || appState.playerName);
  if (!playerName) {
    if (nameInput) showError("开始旅途前，请先填写你的名字。最多 20 个字。");
    else renderNameGate("story", replayId);
    return;
  }
  appState.playerName = playerName;
  localStorage.setItem("wanderer-player-name", appState.playerName);
  setBusy(true);
  try {
    const session = await request("/api/sessions", { method: "POST", body: JSON.stringify({ mode: "offline", replay_id: replayId, player_name: appState.playerName }) });
    appState.sessionId = session.session_id;
    appState.session = session;
    appState.ending = session.ending || null;
    localStorage.setItem("wanderer-session", session.session_id);
    appState.selectedReplayId = replayId;
    appState.resumePromptDismissed = false;
    appState.resumePromptRequired = false;
    window.location.hash = "#/game";
    renderGame();
  } catch (error) {
    showError(error.message);
  } finally {
    setBusy(false);
  }
}

async function submitTurn(input) {
  if (!appState.sessionId || appState.busy) return;
  setBusy(true);
  const loading = root.querySelector("[data-loading]");
  if (loading) loading.hidden = false;
  try {
    const result = await request(`/api/sessions/${appState.sessionId}/turn`, { method: "POST", body: JSON.stringify(input) });
    appState.session.state = result.state;
    appState.session.last_response = result.response;
    appState.ending = result.ending || null;
    renderGame();
  } catch (error) {
    setBusy(false);
    showError(error.message);
  } finally {
    appState.busy = false;
    root.querySelectorAll("button,input").forEach((control) => { control.disabled = false; });
  }
}

async function restoreSession() {
  if (!appState.sessionId) return;
  try {
    appState.session = await request(`/api/sessions/${appState.sessionId}`);
    appState.ending = appState.session.ending || null;
    appState.resumePromptRequired = !appState.session.state?.is_finished;
    if (!appState.playerName && appState.session.state?.player_name) {
      appState.playerName = appState.session.state.player_name;
      localStorage.setItem("wanderer-player-name", appState.playerName);
    }
    renderRoute();
  } catch {
    localStorage.removeItem("wanderer-session");
    appState.sessionId = null;
    appState.session = null;
    renderRoute();
  }
}

async function restartSession() {
  if (!appState.sessionId) return startSession();
  setBusy(true);
  try {
    const session = await request(`/api/sessions/${appState.sessionId}/restart`, { method: "POST" });
    appState.sessionId = session.session_id;
    appState.session = session;
    appState.ending = session.ending || null;
    localStorage.setItem("wanderer-session", session.session_id);
    window.location.hash = "#/game";
    renderGame();
  } catch (error) {
    showError(error.message);
  } finally {
    setBusy(false);
  }
}

async function startChatSession() {
  if (!appState.playerName) {
    renderNameGate("chat");
    return;
  }
  setBusy(true);
  try {
    const session = await request("/api/chat/sessions", { method: "POST", body: JSON.stringify({ player_name: appState.playerName || "同行者" }) });
    appState.chatSessionId = session.chat_session_id || session.session_id;
    appState.chatSession = session;
    rememberChatSession(appState.chatSessionId);
    localStorage.setItem("wanderer-chat-session", appState.chatSessionId);
    renderChat();
  } catch (error) {
    showError(error.message);
  } finally {
    setBusy(false);
  }
}

async function restoreChatSession(sessionId = appState.chatSessionId) {
  if (!sessionId) return;
  try {
    appState.chatSession = await request(`/api/chat/sessions/${sessionId}`);
    appState.chatSessionId = appState.chatSession.chat_session_id || appState.chatSession.session_id || sessionId;
    if (!appState.playerName && appState.chatSession.player_name) {
      appState.playerName = appState.chatSession.player_name;
      localStorage.setItem("wanderer-player-name", appState.playerName);
    }
    rememberChatSession(appState.chatSessionId);
    rememberChatTitle(appState.chatSessionId, appState.chatSession.title);
    localStorage.setItem("wanderer-chat-session", appState.chatSessionId);
    renderChat();
  } catch (error) {
    if (sessionId === appState.chatSessionId) {
      appState.chatSession = null;
      localStorage.removeItem("wanderer-chat-session");
    }
    showError(error.message);
  }
}

async function submitChat(message) {
  if (!appState.chatSessionId || appState.busy) return;
  appState.pendingChat = { message };
  renderChat();
  setBusy(true);
  try {
    const result = await request(`/api/chat/sessions/${appState.chatSessionId}/messages`, { method: "POST", body: JSON.stringify({ message }) });
    const title = result.title || result.response?.title || appState.chatSession.title;
    appState.chatSession = { ...appState.chatSession, ...result, title, session_id: result.session_id || appState.chatSessionId };
    rememberChatTitle(appState.chatSessionId, title);
    appState.pendingChat = null;
    appState.revealChatReply = true;
    renderChat();
    window.setTimeout(() => { appState.revealChatReply = false; }, 700);
  } catch (error) {
    appState.pendingChat = null;
    renderChat();
    showError(error.message);
  } finally {
    appState.busy = false;
    root.querySelectorAll("button,input").forEach((control) => { control.disabled = false; });
  }
}

async function deleteChatSession(sessionId) {
  if (!sessionId || !window.confirm("删除这段历史对话？删除后无法恢复。")) return;
  setBusy(true);
  try {
    await request(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    appState.chatHistory = appState.chatHistory.filter((id) => id !== sessionId);
    delete appState.chatTitles[sessionId];
    localStorage.setItem("wanderer-chat-history", JSON.stringify(appState.chatHistory));
    localStorage.setItem("wanderer-chat-titles", JSON.stringify(appState.chatTitles));
    if (sessionId === appState.chatSessionId) {
      appState.chatSessionId = null;
      appState.chatSession = null;
      localStorage.removeItem("wanderer-chat-session");
    }
    renderChat();
    announce("这段对话已删除");
  } catch (error) {
    showError(error.message);
  } finally {
    appState.busy = false;
    root.querySelectorAll("button,input").forEach((control) => { control.disabled = false; });
  }
}

async function writeClipboard(text) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (typeof document !== "undefined" && typeof document.createElement === "function" && document.body) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
      document.body.removeChild(area);
      return Boolean(copied);
    }
  } catch {
    return false;
  }
  return false;
}

async function copyReply(index) {
  const messages = appState.chatSession?.messages || [];
  const text = messages[index]?.reply;
  if (!text) return;
  const copied = await writeClipboard(text);
  announce(copied ? `已复制${CHARACTER_NAME}的回复` : "复制失败，请重试");
}

async function regenerateReply() {
  if (!appState.chatSessionId || appState.busy) return;
  appState.regeneratingChat = true;
  renderChat();
  setBusy(true);
  try {
    const result = await request(`/api/chat/sessions/${appState.chatSessionId}/regenerate`, { method: "POST" });
    appState.chatSession = { ...appState.chatSession, ...result, session_id: result.session_id || appState.chatSessionId };
    appState.regeneratingChat = false;
    appState.revealChatReply = true;
    renderChat();
    window.setTimeout(() => { appState.revealChatReply = false; }, 700);
  } catch (error) {
    appState.regeneratingChat = false;
    renderChat();
    showError(error.message);
  } finally {
    appState.busy = false;
    root.querySelectorAll("button,input").forEach((control) => { control.disabled = false; });
  }
}

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || appState.busy) return;
  if (button.dataset.action === "start") startSession();
  if (button.dataset.action === "select-story") selectStory(button.dataset.replayId);
  if (button.dataset.action === "resume-journey" && appState.session && !appState.session.state?.is_finished) {
    appState.resumePromptRequired = false;
    appState.resumePromptDismissed = true;
    window.location.hash = "#/game";
    renderGame();
  }
  if (button.dataset.action === "dismiss-resume") dismissResumePrompt();
  if (button.dataset.action === "restart") restartSession();
  if (button.dataset.action === "option") submitTurn({ option_id: button.dataset.option });
  if (button.dataset.action === "start-chat") startChatSession();
  if (button.dataset.action === "restore-chat") restoreChatSession(button.dataset.chatSession);
  if (button.dataset.action === "delete-chat") deleteChatSession(button.dataset.chatSession);
  if (button.dataset.action === "copy-reply") copyReply(Number(button.dataset.index));
  if (button.dataset.action === "regenerate-reply") regenerateReply();
});

function renderRoute() {
  const route = window.location.hash || "#home";
  if (route === "#/intro") renderRoleIntro();
  else if (route === "#/stories") renderStoryDirectory();
  else if (route === "#/game") {
    if (appState.session) renderGame();
    else renderHome();
  }
  else if (route === "#/chat") {
    renderChat();
    if (!appState.chatSession && appState.chatSessionId) restoreChatSession();
  }
  else renderHome();
  if (appState.resumePromptRequired && appState.session && !appState.session.state?.is_finished && !appState.resumePromptDismissed) {
    root.innerHTML += showResumeDialog();
  }
}

window.addEventListener("hashchange", renderRoute);

root.addEventListener("input", (event) => {
  if (!event.target.matches("[data-player-name]")) return;
  appState.playerName = normalizePlayerName(event.target.value);
  localStorage.setItem("wanderer-player-name", appState.playerName);
});

root.addEventListener("submit", (event) => {
  if (event.target.matches('[data-form="player-name"]')) {
    event.preventDefault();
    const input = event.target.querySelector("[data-player-name]");
    const name = normalizePlayerName(input.value);
    if (!name) return showError("请填写名字后再继续。");
    appState.playerName = name;
    localStorage.setItem("wanderer-player-name", appState.playerName);
    if (event.target.dataset.startTarget === "chat") startChatSession();
    else startSession(event.target.dataset.replayId || appState.selectedReplayId);
    return;
  }
  if (!event.target.matches('[data-form="chat"]')) return;
  event.preventDefault();
  const input = event.target.querySelector("input");
  if (!input.value.trim()) return showError(`先输入一句话，再发送给${CHARACTER_NAME}。`);
  submitChat(input.value.trim());
});

renderRoute();
restoreSession();
