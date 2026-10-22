<!-- 本文件由 codex 辅助生成（核心与外围实现交接） -->
# 风起异途：「浮浪倾客」实现与交接

本文记录当前可运行产品的真实结构。与早期“核心模块占位、交由 CodeArts 实现”的规划相比，用户已明确授权在本工作区完成核心与模型接入；早期文档只保留为历史方案，不能再作为当前状态说明。

## 产品模式

| 模式 | 页面 | 服务端 | 状态/结局 |
|---|---|---|---|
| 自由对话 | `#/chat` | `/api/chat/sessions`、`/messages` | 独立聊天历史，不创建剧情状态、不判定结局 |
| 剧情旅途 | 首页“开始剧情旅途” | `/api/sessions`、`/{id}/turn` | 由核心状态机推进场景、状态、历史与结局 |

剧情旅途始终使用本地确定性回放，包含 8 个回合和 4 个结局；自由聊天由后端 `.env` 的 `WANDERER_DEMO_MODE` 决定使用确定性响应或 `LiveModelClient`。页面不再提供实时/离线切换模块，新建自由对话会使用服务端配置。模型缺失、超时或错误均明确返回错误，不回落伪造成功。

## 核心接口

```python
# backend/app/core/roleplay_engine.py
class RoleplayEngine(Protocol):
    def handle_turn(self, *, state: GameState, player_message: str | None,
                    option_id: str | None) -> CoreTurnResult: ...
    def create_initial_state(self, *, session_id: str) -> GameState: ...

# backend/app/core/state_machine.py
class GameStateMachine(Protocol):
    def advance(self, *, state: GameState,
                turn_result: CoreTurnResult) -> GameState: ...
    def determine_ending(self, *, state: GameState) -> EndingResult | None: ...

# backend/app/core/response_mapping.py
class ResponseStateMapper(Protocol):
    def normalize_response(self, *, raw_response: Mapping[str, object]) -> AIResponse: ...
    def apply(self, *, state: GameState, response: AIResponse) -> GameState: ...
```

当前具体实现为 `RoleplayEngineImpl`、`GameStateMachineImpl` 和 `ResponseStateMapperImpl`；对应 `*Placeholder` 类仍保留供边界测试使用。模型调用由 `ModelClient` 完成，`DeterministicModelClient` 用于离线和测试，`LiveModelClient` 对接 OpenAI Chat Completions 兼容接口。

## 剧情响应与状态约束

剧情 AI 响应字段为 `reply`、`emotion`、`state_delta`、`next_scene`、`is_ending`、`ending_id`。每个模型 delta 必须是整数（布尔值不算整数），未知字段和值类型拒绝；有效整数先夹到 `[-10, 10]`，再由映射器应用一次，三个状态分别夹到 `[0, 100]`。回合数不得超过 30。状态机单独负责场景推进和结局判定。终局的 `response.ending_id`、`GameState.ending_id` 与 `EndingResult.ending_id` 必须一致，否则拒绝结果。

自由对话使用 `ChatResponse`：`reply` 与 `emotion` 必填，`title` 为模型概括的可选主题（缺少时后端生成）；`state_delta` 必须为空；`next_scene` 和 `ending_id` 必须为 `null`，`is_ending` 必须为 `false`。自由聊天不会调用剧情状态机，情绪字段不向玩家显示。

角色资料的唯一项目内依据是 `docs/role-authority.md`。人物提示词不可把不同阶段写成不同角色，不得将角色写成雷元素或愚人众成员，不得自我洗白、要求原谅或自认 AI。本作页面统一称呼角色为「浮浪倾客」。

## API 契约

- `POST /api/sessions`：可选 `{mode, replay_id, player_name}`，返回 `{session_id, state, last_response, ending, mode, replay_id}`；姓名为 1-20 字并保存于剧情状态。
- `GET /api/sessions/{session_id}`：恢复剧情状态和结局。
- `POST /api/sessions/{session_id}/turn`：输入 `{option_id}`（剧情旅途只接受预设选项，玩家自定义文本会被拒绝并返回 `INVALID_REQUEST` / HTTP 400），返回 `{response, state, ending}`。
- `POST /api/chat/sessions`：入参 `{player_name}`，模式由服务端 `.env` 决定，返回 `{chat_session_id, mode, player_name, title, messages}`。
- `GET /api/chat/sessions/{chat_session_id}`：恢复自由聊天记录和持久化的主题标题。
- `DELETE /api/chat/sessions/{chat_session_id}`：删除一条历史对话及其服务端记录。
- `POST /api/chat/sessions/{chat_session_id}/messages`：输入 `{message}`，返回 `{response: {reply, title, emotion, ...}, game_state: null, messages}`；`title` 总是包含已生成或兜底的主题标题。
- `POST /api/chat/sessions/{chat_session_id}/regenerate`：无需请求体，按最后一条玩家输入重新生成回复并以替换方式落位，返回 `{response, game_state: null, messages}`；无历史回复时返回 `CHAT_NOTHING_TO_REGENERATE` / HTTP 409。
- 模型故障返回 `MODEL_TIMEOUT` / HTTP 504 或 `MODEL_PROVIDER_ERROR` / HTTP 502；HTTP 401/403 会指明凭据被拒绝，HTTP 400/404 会提示检查模型名与端点，限流和服务端错误也会显示对应类别。不会将供应商响应正文或密钥回传给前端。非法模型响应返回 `INVALID_AI_RESPONSE` / HTTP 502。

## 当前交互体验

- 剧情开场需要玩家名字；名字保存在浏览器和剧情状态中，也随自由对话保存并进入实时模型上下文。旧存档会使用兼容默认称呼。
- 首页不再显示只改变开场台词的“预录路径”选项；离线模式始终从统一开场进入完整多分支剧情。
- 剧情首回合显示前情概要，结局页显示结局说明、旅途收束文案和角色最后回应。
- 自由对话历史标题是对本轮问答主题的简短概括，不直接搬用首条玩家消息；侧栏提供删除按钮，对应服务端 DELETE API。
- 自由对话先显示玩家消息和助手占位气泡，回复到达后在原位置渐入；回复气泡不显示情绪标签。
- 自由对话每条「浮浪倾客」回复下方提供「复制」与「重新生成」操作：复制把回复正文写入剪贴板，重新生成针对同一条玩家消息在原位置替换为新的回复；生成进行中操作项不可重复触发。
- 剧情旅途不再提供自定义文本输入，界面只保留预设选项；服务端同步拒绝剧情回合中的玩家自定义文本，避免自定义输入引发的后续问题。
- “回到首页”仅保留页眉右侧一个固定入口，适用于剧情与自由对话页面。
- 页面不显示实时/离线模式模块；需要更换模型服务时修改项目根目录 `.env` 后重启服务。
- 当前 `.env` 已配置完整的 `/v1/chat/completions` 地址；修改密钥、端点或模型后，关闭正在运行的服务并重新双击 `start.bat`，不要分享密钥。

## 模型配置

密钥只在后端环境变量中配置，不写入前端、日志或提交文件。推荐复制 `.env.example` 为 `.env`：

```powershell
$env:WANDERER_MODEL_API_KEY = "你的密钥"
$env:WANDERER_MODEL_BASE_URL = "https://api.deepseek.com"
$env:WANDERER_MODEL_ENDPOINT = "https://api.deepseek.com/chat/completions"
$env:WANDERER_MODEL_NAME = "deepseek-v4.1-flash"
$env:WANDERER_MODEL_TIMEOUT = "30"
$env:WANDERER_DEMO_MODE = "live"
./start.ps1
```

兼容地址应提供 `/chat/completions`。客户端发送 `response_format: {type: text}`，system prompt 要求模型返回 JSON，随后由客户端解析 JSON 文本；这兼容 LM Studio 等不接受 `json_object` 的本地服务。可用 `WANDERER_MODEL_ENDPOINT` 填写服务商文档中的地址（填写 `/v1` 或基础地址时会自动追加 `/chat/completions`）；留空时程序会在 `WANDERER_MODEL_BASE_URL` 后追加 `/chat/completions`。客户端会发送 `User-Agent: wanderer-game/0.2.0`，避免兼容网关把 Python 默认请求识别为机器人。`WANDERER_DEMO_MODE=offline` 无需配置任何模型服务。

## 当前接手与比赛留证

当前核心和外围代码均可在本项目中审阅、测试和修改。若比赛评分要求 CodeArts IDE 全流程使用证明，工作区中的实现本身不能替代 CodeArts 对话、IDE 修改和截图证据；参赛者应按实际完成情况如实记录，不要把本仓库运行记录表述为 CodeArts 过程材料。

## 验证

项目根目录执行：

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q --basetemp=.pytest-basetemp
.\.venv\Scripts\python.exe -m compileall -q backend
node --check frontend/app.js
```

浏览器端仍需人工检查自由对话的输入、历史恢复与剧情旅途结局页；离线测试不代表真实模型服务或赛事评委环境已验证。

## 重启后启动

`127.0.0.1` 只在本机服务进程运行时可访问。每次重启后双击 `start.bat`；脚本会等待健康检查通过后自动打开页面。关闭启动脚本窗口会停止本次服务。
