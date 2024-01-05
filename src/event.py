import os
import sys

import botpy
from botpy import logging
from botpy.message import Message

from user import UserData
from handlers import (
    handle_menu,
    handle_sign,
    handle_query,
    handle_shop,
    handle_buy,
    handle_daily_news,
    handle_one_say,
    handle_chase,
    draw_sprite
)

_log = logging.get_logger()


class MyClient(botpy.Client):
    async def on_at_message_create(self, message: Message):
        print(message.content)
        # 无消息情况
        split = message.content.split()
        if len(split) == 1:
            return

        # 检查监禁状态
        with UserData(message.author.id) as user_data:
            user_status = user_data.get_status()
        if user_status == 1:
            await self.api.post_message(message.channel_id, '当前正在被监禁。')
            return

        keyword = split[1]

        # 精准菜单
        command_handlers = {
            '/菜单': handle_menu,
            '/签到': handle_sign,
            '/查询': handle_query,
            "/商店": handle_shop,
            "/购买": handle_buy,
            "/60s": handle_daily_news,
            "/一言": handle_one_say,
            "/精灵招募": draw_sprite,
        }

        if keyword in command_handlers:
            await command_handlers[keyword](split, message)
            return

        command_handlers = {
            "/追击": handle_chase
        }
        for key in command_handlers.keys():
            if key in keyword:
                await command_handlers[key](split, message)
                break


def run(appid, secret):
    intents = botpy.Intents(public_guild_messages=True)
    client = MyClient(intents=intents)
    try:
        client.run(appid=appid, secret=secret)
    except KeyError:
        print(f"error: robot登录出现错误，请检查用户配置(config.yml)。")
        os.system("pause")
        sys.exit(0)
