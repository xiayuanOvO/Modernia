from botpy.api import BotAPI

PATH_RUN: str  # 运行目录

PATH_ANSWER_TABLE: str  # 答题系统题目列表
PATH_ANSWER_DATA: str  # 答题系统配置：data/excel/weapon_table.json

PATH_CONFIG: str
PATH_GAME_CONF: str
PATH_USER: str  # 玩家数据目录
PATH_TEMP_GOOD_LIST: str
PATH_GACHA_TABLE: str
PATH_ARENA_RANKINGS: str


class Message:
    # __slots__ = (
    #     ''
    # )

    def __init__(
            self,
            type_: int,
            api: BotAPI,
            author,
            content,
            channel_id: str,
            id_,
            guild_id: str,
            group_openid: str
    ):
        """
        111
        :param type_: 1
        - 0: 频道消息类型
        - 1: 私聊消息类型
        - 2: 群聊信息类型
        :param api:
        :param author:
        :param content:
        """
        self.type = type_
        self.api = api
        self.author = self._User(author)
        self.content = content
        self.channel_id = channel_id
        self.id = id_
        self.guild_id = guild_id
        self.group_openid = group_openid

    class _User:
        def __init__(self, data):
            self.id = data.get("id", None)
            if self.id is None:
                self.id = data.get("member_openid", None)
            self.username = data.get("username", None)
            self.avatar = data.get("avatar", None)

    async def send_msg(self, **kwargs):
        if self.type == 0:
            await self.api.post_message(channel_id=self.channel_id, msg_id=self.id, **kwargs)
        elif self.type == 1:
            await self.api.post_dms(guild_id=self.guild_id, msg_id=self.id, **kwargs)
        elif self.type == 2:
            await self.api.post_group_message(group_openid=self.group_openid, msg_id=self.id, **kwargs)

    async def send_img(self, **kwargs):
        if self.type == 0:
            await self.api.post_message(channel_id=self.channel_id, msg_id=self.id, **kwargs)
        elif self.type == 1:
            await self.api.post_dms(guild_id=self.guild_id, msg_id=self.id, **kwargs)
        elif self.type == 2:
            upload_media = await self.api.post_group_file(
                group_openid=self.group_openid,
                file_type=1,
                srv_send_msg=False,
                **kwargs
            )
            await self.api.post_group_message(
                group_openid=self.group_openid,
                msg_type=7,
                msg_id=self.id,
                media=upload_media
            )


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
