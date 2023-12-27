import botpy
from botpy import logging
from botpy.message import Message

import user
from handlers import handle_menu, handle_sign, handle_query, handle_chase, handle_shop, handle_buy, handle_daily_news

_log = logging.get_logger()


class MyClient(botpy.Client):
    async def on_at_message_create(self, message: Message):
        print(message.content)
        # 无消息情况
        split = message.content.split()
        if len(split) == 1:
            return

        # 检查监禁状态
        user_data = user.UserData(message.author.id)
        if user_data.get_status() == 1:
            await self.api.post_message(message.channel_id, '当前正在被监禁。')
            return

        keyword = split[1]

        command_handlers = {
            '/菜单': handle_menu,
            '/签到': handle_sign,
            '/查询': handle_query,
            "/商店": handle_shop,
            "/购买": handle_buy,
            "/60s": handle_daily_news,
        }

        if keyword in command_handlers:
            await command_handlers[keyword](split, message, user_data)
        else:
            command_handlers = {
                "/追击": handle_chase,
            }
            for key in command_handlers.keys():
                if key in keyword:
                    await command_handlers[key](split, message, user_data)
                    break


def run(appid, secret):
    intents = botpy.Intents(public_guild_messages=True)
    client = MyClient(intents=intents)
    try:
        client.run(appid=appid, secret=secret)
    except KeyError:
        print(f"error: 登录出现错误，用户配置错误，请检查。")
