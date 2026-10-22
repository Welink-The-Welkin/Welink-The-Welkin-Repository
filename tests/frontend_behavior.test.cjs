// 本文件由 codex 辅助生成（前端行为回归测试）
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "frontend", "app.js"), "utf8");

function storySession({ id = "story-1", finished = false, history = [] } = {}) {
  return {
    session_id: id,
    mode: "offline",
    state: {
      session_id: id,
      player_name: "清岚",
      scene_id: finished ? "scene_08" : "scene_01",
      turn_count: finished ? 8 : 0,
      trust: 50,
      compassion: 50,
      responsibility: 50,
      history,
      is_finished: finished,
      ending_id: finished ? "evidence_keeper" : null,
    },
    last_response: {
      reply: "沿着这条线索继续查。",
      emotion: "guarded",
      state_delta: {},
      next_scene: { scene_id: "scene_01", options: [{ id: "listen", text: "继续调查" }] },
      is_ending: finished,
      ending_id: finished ? "evidence_keeper" : null,
    },
    ending: finished ? { ending_id: "evidence_keeper", title: "见证者", summary: "你让真相留在众人面前。" } : null,
  };
}

function makeBrowser({ hash = "#home", storage = {}, providerError = false, deferRegenerate = false, regenerateError = false } = {}) {
  const listeners = {};
  const calls = [];
  const values = new Map(Object.entries(storage));
  let markup = "";
  let errorMarkup = "";
  let resolveRegenerate;
  const root = {
    get innerHTML() { return markup; },
    set innerHTML(value) { markup = value; },
    addEventListener(type, listener) { listeners[`root:${type}`] = listener; },
    querySelectorAll() { return []; },
    querySelector(selector) {
      if (selector === "[data-player-name]") return null;
      if (selector.includes("data-error") || selector.includes("data-chat-error")) {
        return { set innerHTML(value) { errorMarkup = value; }, get innerHTML() { return errorMarkup; } };
      }
      return null;
    },
  };
  const toggleState = new Set();
  const modeControl = { classList: { toggle(name, enabled) { enabled ? toggleState.add(name) : toggleState.delete(name); } } };
  const toast = { textContent: "", hidden: true };
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const window = {
    location: { hash },
    addEventListener(type, listener) { listeners[`window:${type}`] = listener; },
    setTimeout() {},
    confirm() { return true; },
  };
  const document = {
    querySelector(selector) {
      return ({ "#app": root, ".topbar-right": modeControl, "#toast": toast })[selector] || null;
    },
  };
  const fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/sessions" && options.method === "POST") {
      return { ok: true, json: async () => ({ data: storySession() }) };
    }
    if (url === "/api/sessions/saved-story") {
      return { ok: true, json: async () => ({ data: storySession({ id: "saved-story" }) }) };
    }
    if (url === "/api/sessions/completed-story") {
      return { ok: true, json: async () => ({ data: storySession({ id: "completed-story", finished: true }) }) };
    }
    if (url === "/api/sessions/story-1/turn" && options.method === "POST") {
      return {
        ok: true,
        json: async () => ({
          data: {
            state: storySession({
              history: [{ scene_id: "scene_01", player_input: "先听听他的判断", response_summary: "沿着这条线索继续查。" }],
            }).state,
            response: {
              reply: "沿着这条线索继续查。",
              emotion: "guarded",
              state_delta: {},
              next_scene: { scene_id: "scene_02", options: [{ id: "inspect_records", text: "查阅旧档案" }] },
              is_ending: false,
              ending_id: null,
            },
            ending: null,
          },
        }),
      };
    }
    if (url === "/api/chat/sessions" && options.method === "POST") {
      return { ok: true, json: async () => ({ data: { chat_session_id: "chat-1", player_name: "清岚", mode: "live", messages: [] } }) };
    }
    if (url === "/api/chat/sessions/chat-1/regenerate" && options.method === "POST") {
      if (deferRegenerate) {
        await new Promise((resolve) => { resolveRegenerate = resolve; });
      }
      if (regenerateError) {
        return { ok: false, json: async () => ({ error: { message: "重新生成失败，请稍后重试。" } }) };
      }
      return {
        ok: true,
        json: async () => ({
          data: {
            response: { reply: "换一个说法。", title: "围绕问题展开的对话", emotion: "guarded", state_delta: {}, next_scene: null, is_ending: false, ending_id: null },
            messages: [{ message: "你好", reply: "换一个说法。", emotion: "guarded" }],
          },
        }),
      };
    }
    if (url === "/api/chat/sessions/chat-1/messages" && providerError) {
      return {
        ok: false,
        json: async () => ({
          error: {
            message: "模型服务禁止访问（HTTP 403）。",
            details: {
              provider_status: 403,
              model: "example-model",
              endpoint: "https://provider.example/v1/chat/completions",
              provider_request_id: "provider-safe-456",
            },
          },
          request_id: "request-safe-123",
        }),
      };
    }
    if (url === "/api/chat/sessions/chat-1/messages" && options.method === "POST") {
      return {
        ok: true,
        json: async () => ({
          data: {
            response: { reply: "我听见了。", title: "围绕问题展开的对话", emotion: "calm", state_delta: {}, next_scene: null, is_ending: false, ending_id: null },
            messages: [{ message: "你好", reply: "我听见了。", emotion: "calm" }],
          },
        }),
      };
    }
    throw new Error(`Unexpected request: ${options.method || "GET"} ${url}`);
  };
  const clipboardWrites = [];
  const navigator = { clipboard: { async writeText(text) { clipboardWrites.push(text); } } };
  const context = { document, window, localStorage, fetch, console, navigator };
  vm.runInNewContext(source, context, { filename: "frontend/app.js" });

  return {
    calls,
    root,
    values,
    clipboardWrites,
    modeControlHidden: () => toggleState.has("is-hidden"),
    async click(action, dataset = {}) {
      listeners["root:click"]({ target: { closest: () => ({ dataset: { action, ...dataset } }) } });
      await settle();
    },
    async submitChat(message) {
      const listener = listeners["root:submit"];
      listener({
        target: {
          matches: (selector) => selector === '[data-form="chat"]',
          querySelector: () => ({ value: message }),
        },
        preventDefault() {},
      });
      await settle();
    },
    submitChatPending(message) {
      const listener = listeners["root:submit"];
      listener({
        target: {
          matches: (selector) => selector === '[data-form="chat"]',
          querySelector: () => ({ value: message }),
        },
        preventDefault() {},
      });
    },
    async submitName(name, { target = "story", replayId = "demo_guarded_path" } = {}) {
      listeners["root:submit"]({
        target: {
          matches: (selector) => selector === '[data-form="player-name"]',
          dataset: { startTarget: target, replayId },
          querySelector: () => ({ value: name }),
        },
        preventDefault() {},
      });
      await settle();
    },
    async setRoute(route) {
      window.location.hash = route;
      listeners["window:hashchange"]();
      await settle();
    },
    get errorMarkup() { return errorMarkup; },
    get hash() { return window.location.hash; },
    resolveRegenerate() {
      if (resolveRegenerate) resolveRegenerate();
    },
  };
}

async function settle() {
  for (let index = 0; index < 6; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

test("story catalog selection creates a fixed replay, hides mode controls, and renders no emotion", async () => {
  const browser = makeBrowser({ hash: "#/stories", storage: { "wanderer-player-name": "清岚" } });
  assert.match(browser.root.innerHTML, /选择一段旅途/);
  assert.equal((browser.root.innerHTML.match(/class="story-row"/g) || []).length, 2);
  assert.equal(browser.modeControlHidden(), false);

  await browser.click("select-story", { replayId: "demo_guarded_path" });

  const create = browser.calls.find((call) => call.url === "/api/sessions");
  assert.deepEqual(JSON.parse(create.options.body), { mode: "offline", replay_id: "demo_guarded_path", player_name: "清岚" });
  assert.match(browser.root.innerHTML, /沿着这条线索继续查/);
  assert.doesNotMatch(browser.root.innerHTML, /回到首页/);
  assert.doesNotMatch(browser.root.innerHTML, /class="emotion"|class="mode-pill"|实时接口|固定回放/);
  await browser.setRoute("#home");
  assert.doesNotMatch(browser.root.innerHTML, /resume-dialog/);
});

test("selected route is retained while the player enters a name", async () => {
  const browser = makeBrowser({ hash: "#/stories" });
  assert.equal((browser.root.innerHTML.match(/class="story-row"/g) || []).length, 2);
  await browser.click("select-story", { replayId: "demo_guarded_path" });
  assert.match(browser.root.innerHTML, /先取一个称呼/);

  await browser.submitName("清岚", { replayId: "demo_guarded_path" });

  const create = browser.calls.find((call) => call.url === "/api/sessions");
  assert.deepEqual(JSON.parse(create.options.body), { mode: "offline", replay_id: "demo_guarded_path", player_name: "清岚" });
});

test("the submitted option is rendered in the same turn as its response", async () => {
  const browser = makeBrowser({ hash: "#/stories", storage: { "wanderer-player-name": "清岚" } });

  await browser.click("select-story", { replayId: "demo_guarded_path" });
  await browser.click("option", { option: "listen" });

  assert.match(browser.root.innerHTML, /先听听他的判断/);
  assert.equal((browser.root.innerHTML.match(/先听听他的判断/g) || []).length, 1);
});

test("restored unfinished journey can be declined without deleting progress, or resumed", async () => {
  const declined = makeBrowser({ storage: { "wanderer-session": "saved-story" } });
  await settle();
  assert.match(declined.root.innerHTML, /要继续上一段旅途吗/);
  await declined.click("dismiss-resume");
  assert.doesNotMatch(declined.root.innerHTML, /resume-dialog/);
  assert.equal(declined.values.get("wanderer-session"), "saved-story");

  const resumed = makeBrowser({ storage: { "wanderer-session": "saved-story" } });
  await settle();
  await resumed.click("resume-journey");
  assert.equal(resumed.hash, "#/game");
  assert.match(resumed.root.innerHTML, /互动故事/);
  assert.equal(resumed.values.get("wanderer-session"), "saved-story");
  await resumed.setRoute("#home");
  assert.doesNotMatch(resumed.root.innerHTML, /resume-dialog/);

  const directory = makeBrowser({ hash: "#/stories", storage: { "wanderer-session": "saved-story" } });
  await settle();
  await directory.click("dismiss-resume");
  assert.equal(directory.hash, "#/stories");
  assert.match(directory.root.innerHTML, /选择一段旅途/);
  assert.equal(directory.values.get("wanderer-session"), "saved-story");

  const refreshedGame = makeBrowser({ hash: "#/game", storage: { "wanderer-session": "saved-story" } });
  await settle();
  assert.match(refreshedGame.root.innerHTML, /要继续上一段旅途吗/);
  await refreshedGame.click("dismiss-resume");
  assert.equal(refreshedGame.hash, "#home");
  assert.match(refreshedGame.root.innerHTML, /风起异途/);
  assert.doesNotMatch(refreshedGame.root.innerHTML, /互动故事/);
  assert.equal(refreshedGame.values.get("wanderer-session"), "saved-story");
});

test("completed story opens its ending with a home link and without emotion text", async () => {
  const browser = makeBrowser({ hash: "#/game", storage: { "wanderer-session": "completed-story" } });
  await settle();

  assert.match(browser.root.innerHTML, /见证者/);
  assert.doesNotMatch(browser.root.innerHTML, /回到首页/);
  assert.doesNotMatch(browser.root.innerHTML, /克制|class="emotion"/);
});

test("free chat shows safe upstream 403 diagnostics without losing the error", async () => {
  const browser = makeBrowser({ hash: "#/chat", storage: { "wanderer-mode": "live", "wanderer-player-name": "清岚" }, providerError: true });
  await browser.click("start-chat");
  await browser.submitChat("你好");

  assert.match(browser.errorMarkup, /HTTP 403/);
  assert.match(browser.errorMarkup, /example-model/);
  assert.match(browser.errorMarkup, /request-safe-123/);
  assert.match(browser.errorMarkup, /provider-safe-456/);
  assert.match(browser.errorMarkup, /provider\.example\/v1\/chat\/completions/);
  assert.doesNotMatch(browser.errorMarkup, /API密钥|secret|query/);
});

test("free chat hides emotion labels and reserves the assistant reply panel", async () => {
  const browser = makeBrowser({ hash: "#/chat", storage: { "wanderer-player-name": "清岚" } });
  await browser.click("start-chat");
  assert.doesNotMatch(browser.root.innerHTML, /平静|克制|class="emotion"/);
  assert.match(source, /const pending = message\.pending/);
  assert.match(source, /const reveal = message\.reveal/);
});

test("free chat shows the user message and assistant placeholder before the response arrives", async () => {
  const browser = makeBrowser({ hash: "#/chat", storage: { "wanderer-player-name": "清岚" } });
  await browser.click("start-chat");
  browser.submitChatPending("你好");
  assert.match(browser.root.innerHTML, /你好/);
  assert.match(browser.root.innerHTML, /「浮浪倾客」正在回应……/);
  await settle();
  assert.match(browser.root.innerHTML, /我听见了/);
  assert.match(browser.root.innerHTML, /围绕问题展开的对话/);
  assert.match(browser.root.innerHTML, /reveal/);
  assert.doesNotMatch(browser.root.innerHTML, /平静|class="emotion"/);
});

test("story journey renders preset options without any free text input", async () => {
  const browser = makeBrowser({ hash: "#/stories", storage: { "wanderer-player-name": "清岚" } });

  await browser.click("select-story", { replayId: "demo_guarded_path" });

  assert.doesNotMatch(browser.root.innerHTML, /data-form="turn"/);
  assert.doesNotMatch(browser.root.innerHTML, /player-message/);
  assert.doesNotMatch(browser.root.innerHTML, /输入你的回应/);
  assert.match(browser.root.innerHTML, /data-action="option"/);
});

test("free chat reply offers copy and regenerate shortcuts", async () => {
  const browser = makeBrowser({ hash: "#/chat", storage: { "wanderer-player-name": "清岚" } });
  await browser.click("start-chat");
  await browser.submitChat("你好");

  assert.match(browser.root.innerHTML, /data-action="copy-reply"/);
  assert.match(browser.root.innerHTML, /data-action="regenerate-reply"/);

  await browser.click("copy-reply", { index: "0" });
  assert.deepEqual(browser.clipboardWrites, ["我听见了。"]);
});

test("free chat regenerate replaces the old reply with a pending panel before revealing the new reply", async () => {
  const browser = makeBrowser({ hash: "#/chat", storage: { "wanderer-player-name": "清岚" }, deferRegenerate: true });
  await browser.click("start-chat");
  await browser.submitChat("你好");
  assert.match(browser.root.innerHTML, /我听见了/);

  const regenerating = browser.click("regenerate-reply");
  await settle();

  const regenerateCall = browser.calls.find((call) => call.url === "/api/chat/sessions/chat-1/regenerate");
  assert.ok(regenerateCall);
  assert.match(browser.root.innerHTML, /你好/);
  assert.match(browser.root.innerHTML, /「浮浪倾客」正在回应……/);
  assert.doesNotMatch(browser.root.innerHTML, /我听见了/);

  browser.resolveRegenerate();
  await regenerating;
  await settle();

  assert.match(browser.root.innerHTML, /换一个说法/);
  assert.match(browser.root.innerHTML, /chat-message assistant reveal/);
  assert.doesNotMatch(browser.root.innerHTML, /正在回应……/);
  assert.doesNotMatch(browser.root.innerHTML, /我听见了/);
});

test("free chat regenerate restores the old reply when the request fails", async () => {
  const browser = makeBrowser({ hash: "#/chat", storage: { "wanderer-player-name": "清岚" }, regenerateError: true });
  await browser.click("start-chat");
  await browser.submitChat("你好");

  await browser.click("regenerate-reply");

  assert.match(browser.root.innerHTML, /我听见了/);
  assert.doesNotMatch(browser.root.innerHTML, /正在回应……/);
  assert.match(browser.errorMarkup, /重新生成失败，请稍后重试/);
});

