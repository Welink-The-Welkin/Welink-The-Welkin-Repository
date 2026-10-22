"""核心模块错误分类。

按「输入非法 / 响应非法 / 结局不一致 / 模型故障」四类细分，
供门面在不同阶段抛出，拒绝时携带可审计原因。
"""
from __future__ import annotations


class CoreError(RuntimeError):
    """所有核心错误的基类。"""


class InvalidTurnInputError(CoreError):
    """玩家输入非法（恰好一项约束、非法会话标识）。"""


class SessionFinishedError(CoreError):
    """会话已结束，拒绝继续推进回合。"""


class TurnLimitExceededError(CoreError):
    """回合数已达上限，拒绝继续推进。"""


class InvalidOptionError(CoreError):
    """选项无法解析或不属于当前可选集合。"""


class InvalidAIResponseError(CoreError, ValueError):
    """模型原始响应或规范化后的响应非法。"""


class InconsistentTurnResultError(CoreError):
    """终局状态、响应标志与结局标识相互矛盾。"""


class ModelTimeoutError(CoreError):
    """模型调用超时。"""


class ModelProviderError(CoreError):
    """模型供应商不可用或返回错误。"""

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        user_message: str | None = None,
        provider_code: str | None = None,
        provider_request_id: str | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.user_message = user_message or "模型服务暂时不可用，请检查实时接口配置后重试。"
        self.provider_code = provider_code
        self.provider_request_id = provider_request_id
