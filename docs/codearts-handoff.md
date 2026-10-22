<!-- 本文件由 codex 辅助生成（赛事背景说明） -->
# CodeArts 与项目交接背景

本文件保留比赛工作流背景。当前工作区已包含完整核心实现，不再把核心代码列为 CodeArts 待办。

## 当前核心代码位置

- `backend/app/core/roleplay_engine.py`：剧情模式门面，编排模型响应、状态映射和结局结果。
- `backend/app/core/state_machine.py`：推进剧情状态并负责结局判定。
- `backend/app/core/response_mapping.py`：校验原始模型响应、限制状态变化并生成新状态。
- `backend/app/core/model_client.py`：离线确定性客户端、实时 OpenAI Chat Completions 兼容客户端及自由对话生成。

自由对话 API 在 `backend/app/api/routes/chat.py`，通过独立 SQLite 表保存对话；它不进入剧情状态机。

## 赛事材料说明

用户已授权由本工作区实现核心功能，因此本仓库中的代码和测试不构成 CodeArts IDE 使用过程的证据。若提交要求证明 CodeArts 在开发中的参与，必须依据真实的 IDE 操作、对话、代码改动和截图另行整理，不能把本项目的测试输出伪称为 CodeArts 截图或过程记录。

## 后续在 CodeArts 中快速定位

若需要在 CodeArts IDE 中演示功能调整，可从 `backend/app/core/roleplay_engine.py`、`backend/app/core/state_machine.py`、`backend/app/core/response_mapping.py` 或 `backend/app/core/model_client.py` 进入，并运行根目录 README 中的测试命令。修改状态字段或 API 响应时，需同步检查 `backend/app/contracts/`、`backend/app/services/`、前端消费者和对应测试。
