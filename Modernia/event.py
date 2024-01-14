import os
import sys

import botpy
from botpy import logging
from botpy.message import Message, DirectMessage, GroupMessage, C2CMessage

from handlers import handle_init

_log = logging.get_logger()


class MyClient(botpy.Client):
    async def on_at_message_create(self, message: Message):
        await handle_init(message, self.api)

    async def on_direct_message_create(self, message: DirectMessage):
        await handle_init(message, self.api)

    async def on_group_at_message_create(self, message: GroupMessage):
        await handle_init(message, self.api)


def run(appid, secret):
    intents = botpy.Intents(public_guild_messages=True, direct_message=True, public_messages=True)
    client = MyClient(intents=intents, log_level=20)
    try:
        client.run(appid=appid, secret=secret)
    except KeyError:
        print(f"error: robot登录出现错误，请检查用户配置(config.yml)。")
        os.system("pause")
        sys.exit(0)
