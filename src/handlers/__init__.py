import requests
from botpy.message import Message

import game
import user
import webapi
from config.shop import temp_good_list
from config.game import GAME_CONF
from config.gacha import GACHA_INFO


async def handle_menu(split: list, message: Message, user_data: user.UserData):
    at_author = f'<@!{message.author.id}>'
    content = (GAME_CONF.menu_content
               .replace("{at_author}", at_author)
               .replace("{author_id}", message.author.id))
    await message.reply(content=content)


async def handle_sign(split: list, message: Message, user_data: user.UserData):
    msg = game.sign(user_data)
    await message.reply(content=msg)


async def handle_query(split: list, message: Message, user_data: user.UserData):
    at_author = f'<@!{message.author.id}>'
    author_gold = user_data.get_gold()

    msg = (GAME_CONF.select_content
           .replace("{at_author}", at_author)
           .replace("{author_id}", message.author.id)
           .replace("{author_gold}", str(author_gold)))
    await message.reply(content=msg)


async def handle_shop(split: list, message: Message, user_data: user.UserData):
    msg = temp_good_list.get_good_list(1)
    await message.reply(content=msg)


async def handle_buy(split: list, message: Message, user_data: user.UserData):
    if len(split) == 2:
        await message.reply(content="购买格式错误，正确格式：\n/购买 名称 数量(可不填，默认为 1)")
        return
    name = split[2]

    quantity = 1
    if len(split) == 4:
        quantity = split[3]
        if not quantity.isdigit():  # 是否能转化为整数
            await message.reply(content="购买数量有误，请重新填写。")
            return
        quantity = int(split[3])
    msg = temp_good_list.buy_item(name, quantity, user_data)
    await message.reply(content=msg)


async def handle_daily_news(split: list, message: Message, user_data: user.UserData):
    b, image_path = webapi.get_daily_news_path()
    await message.reply(file_image=image_path)


async def handle_chase(split: list, message: Message, user_data: user.UserData):
    if split[1] == "/追击":
        await message.reply(content=f"追击消息格式错误，正确格式：\n/追击@被追击人")
        return
    user2_id = game.find_user(split[1])
    user2_data = user.UserData(user2_id)
    pk = game.PK(user_data, user2_data)
    msg = pk.attack()

    await message.reply(content=msg)


async def handle_one_say(split: list, message: Message, user_data: user.UserData):
    req = requests.get("http://api.treason.cn/API/yiyan.php")
    msg = req.text
    await message.reply(content=msg)


async def draw_sprite(split: list, message: Message, user_data: user.UserData):
    # 消息格式：@机器人 /精灵招募 池子名称 数量
    #            0     1        2    3
    # 精灵招募说明
    if len(split) == 2:
        msg = GACHA_INFO.get_open_pool()
        await message.reply(content=msg)
        return

    def is_existing(pool_name: str) -> bool:
        for gacha in GACHA_INFO.Gacha_Pools:
            if pool_name == gacha.name:
                return True
        return False

    msg = "招募指令错误，请检查格式：\n招募指令: \n招募一次【/精灵招募 招募池名称 1】\n招募十次【/精灵招募 招募池名称 10】"
    if is_existing(split[2]):
        if len(split) == 3:  # 只有池子名，没有数量，默认单抽
            split.append("1")

        # 招募开始
        if split[3] == "1":
            msg = "1"
        elif split[3] == "10":
            msg = "10"
    await message.reply(content=msg)
    return
