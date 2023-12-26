import botpy
from botpy import logging
from botpy.message import Message

import config
import user
from handlers import handle_menu, handle_sign, handle_query, handle_chase, handle_shop, handle_buy, handle_daily_news

_log = logging.get_logger()


class MyClient(botpy.Client):
    async def on_at_message_create(self, message: Message):
        """
        {!!! -- 该计划暂时搁置 -- !!!}
        将消息处理分为三层
        第一层，最底层权限：即使在 status.code = 1[娱乐：监禁状态] 状态下，也可以正常使用。
        第二层，娱乐禁止权限：status.code = 1[娱乐：监禁状态] 状态下，不能正常唤醒的功能分区。
        第三层，不受影响区（？）
        """
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
                    await command_handlers[key](split, message, user_data, client)
                    break


if __name__ == '__main__':
    intents = botpy.Intents(public_guild_messages=True)
    client = MyClient(intents=intents)
    try:
        client.run(appid=config.appid, secret=config.secret)
    except KeyError:
        print(f"error: 登录出现错误，用户配置错误，请检查。")
