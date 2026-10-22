# 剧情目录、续玩与实时对话诊断实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将剧情入口改为可扩展目录，固定使用离线回放，支持未完成旅途续玩，清除指定 UI 元素，并让实时对话错误显示可核查的安全诊断信息。

**Architecture:** 剧情目录数据放在前端独立常量中，创建剧情会话时始终请求 `offline` 并传入目录项的 `replay_id`。当前未完成会话仍由 SQLite 保存进度，浏览器 localStorage 保存会话 ID；恢复时通过现有 GET session API 读取。自由对话继续沿用原有实时/离线模式，403 不做自动伪造回退，错误详情只返回上游状态、模型名和去除查询串/凭据的目标地址。

**Tech Stack:** 原生 HTML/CSS/JavaScript、FastAPI、Pydantic、SQLite、pytest。

**Spec:** 用户本轮提出的六项修改；保留现有暗色配色、字体、装饰和剧情正文，仅按第二张参考图调整目录信息布局。

## Global Constraints

- 剧情旅途创建和推进始终使用 `offline` 固定回放，实时模型仅用于自由对话。
- 剧情目录只展示已有故事，不伪造尚未实现的路线；目录数据须可直接追加新条目。
- 未完成存档通过现有 `wanderer-session` ID 和 `/api/sessions/{session_id}` 恢复；选择不继续不得删除存档。
- 403 诊断不得包含 API 密钥、Authorization 头或 URL 查询参数；不得把上游拒绝伪装成成功回复。
- 保留现有画风、颜色、字体、正文故事内容；移除用户点名的角色心情、身份文字和免责声明。

---

### Task 1: 固定剧情使用回放并保留旧存档

**Files:**
- Modify: `backend/app/services/session_service.py`
- Test: `tests/test_live_and_chat.py`, `tests/test_api.py`

**Interfaces:**
- `SessionService.create(requested_mode, replay_id, player_name)` 始终保存 `mode="offline"`。
- `SessionService.turn(session_id, player_message, option_id)` 对旧 `live` 存档也使用离线引擎推进，并在保存时归一为离线。
- `/api/chat/*` 的会话模式保持现状。

- [x] 新增测试：`POST /api/sessions` 即使请求 `mode="live"` 也返回并保存 `offline`。
- [x] 新增测试：旧 `live` 剧情存档推进时不调用 LiveModelClient，返回固定回放回复并保存为 `offline`。
- [x] 运行 `pytest tests/test_api.py tests/test_live_and_chat.py -q` 确认新断言失败。
- [x] 修改 `SessionService.create` 和 `turn`，只把剧情服务模式归一为离线，不改变自由对话模式。
- [x] 重跑上述测试并运行全套 pytest。

### Task 2: 剧情目录、续玩确认、首页导航与界面删减

**Files:**
- Modify: `frontend/index.html`, `frontend/app.js`, `frontend/styles.css`
- Test: `tests/test_frontend.py`

**Interfaces:**
- `storyCatalog` 条目包含 `id`, `title`, `summary`, `replayId`。
- `renderStoryDirectory()` 展示目录；`startSession(replayId)` 固定发送 `mode: "offline"`。
- `restoreSession()` 读取未完成存档；`showResumeDialog()` 只提示是否恢复，不继续选项时不删除进度。
- 路由 `#/stories`、`#/game`、`#/chat`、`#/intro` 与 `#home` 分别渲染目录、剧情、聊天、角色介绍和首页。

- [x] 新增行为测试：目录路由/标题摘要、固定 `offline` 请求、主页导航与续玩弹窗。
- [x] 新增行为测试：剧情台词不渲染 emotion、剧情侧栏不渲染模式徽标、指定免责声明和身份文字不出现在产品页面。
- [x] 运行前端测试先确认回归行为，再完成实现。
- [x] 用现有颜色、字体与边框实现目录章节行；仅改变布局，不引入新图像、颜色或字体。
- [x] 首页剧情按钮进入 `#/stories`；已实现的两条回放开场可选；缺少姓名时先收集姓名。
- [x] 刷新任何路由恢复到未完成会话时都会询问是否续玩；确认恢复原进度，拒绝时返回安全页面且保留存档。
- [x] 剧情情绪标签、剧情模式徽标、指定身份文字和作品免责声明均从产品页面移除；模型开关只在首页/自由对话页面显示。
- [x] 重跑前端行为测试、全套 pytest、`compileall` 与 `node --check frontend/app.js`。

### Task 3: 为实时模型拒绝补充安全诊断

**Files:**
- Modify: `backend/app/core/errors.py`, `backend/app/core/model_client.py`, `backend/app/services/session_service.py`, `backend/app/main.py`, `frontend/app.js`, `frontend/styles.css`
- Test: `tests/test_model_client.py`, `tests/test_live_and_chat.py`

**Interfaces:**
- HTTP provider errors may carry `status_code`, allowlisted `provider_code`, allowlisted `provider_request_id`。
- App error details may include `model` and credential/query-free `endpoint` only.
- Missing provider response body remains a 403 with the existing honest error; no fallback response is stored.

- [x] 新增测试：HTTP 403 错误保留可用的上游错误码/请求 ID，且响应文本不含测试 API 密钥。
- [x] 新增测试：自由对话 API 将安全的模型名、接口目标和 403 状态放入 details；不含 Authorization 值或 URL 查询参数。
- [x] 运行对应测试确认断言可以捕获泄漏或缺失诊断。
- [x] 在 `LiveModelClient` 中解析错误 JSON 的 allowlist 字段，解析失败时保留状态码而不回显原始正文。
- [x] 为 `AppError` 增加可选 `details`，仅对模型供应商错误传递安全诊断，并在前端显示。
- [x] 运行对应测试、全套 pytest、compileall、`node --check`；实际本机上游请求返回 HTTP 403、未提供服务商代码/请求编号，权限仍需服务商侧处理。
