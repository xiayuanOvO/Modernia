PATH_RUN: str  # 运行目录
PATH_CONFIG: str
PATH_GAME_CONF: str
PATH_USER: str  # 玩家数据目录
PATH_TEMP_GOOD_LIST: str
PATH_GACHA_TABLE: str
PATH_ARENA_RANKINGS: str


class Gacha:
    id: str  # 抽卡池 ID
    name: str
    openTime: int  # 开始时间
    endTime: int  # 结束时间
    ruleType: str  # 抽卡池类型
    """
    ruleType:
    - NORMAL 普通池
    - LIMITED 特殊池
    """

    def __init__(self, data=None):
        if data is None:
            data = {}
        self.id = data.get("id", "NORMAL_1")
        self.name = data.get("name", "普通招募")
        self.openTime = data.get("openTime", 0)
        self.endTime = data.get("endTime", 0)
        self.ruleType = data.get("ruleType", "NORMAL")
