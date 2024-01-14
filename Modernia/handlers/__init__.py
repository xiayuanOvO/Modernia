from internal import base

import game
from user import UserData
import webapi
from config import DATA_GAME_CONF, DATA_TEMP_GOOD_LIST, DATA_GACHA_INFO, DATA_ANSWER

from typing import Union
from botpy.message import Message, DirectMessage, GroupMessage, C2CMessage
from game import answer
from utils import times


async def handle_init(
        message: Union[DirectMessage, Message, GroupMessage],
        api
) -> None:
    if isinstance(message, Message):  # 频道消息
        author = message.author.__dict__
        content = message.content
        generic_message = base.Message(
            0,
            api,
            author,
            content,
            message.channel_id,
            message.id,
            message.guild_id,
            ""
        )

        split = generic_message.content.split()
        if len(split) == 1:
            return
        split.pop(0)
    elif isinstance(message, DirectMessage):
        author = message.author.__dict__
        content = message.content
        generic_message = base.Message(
            1,
            api,
            author,
            content,
            message.channel_id,
            message.id,
            message.guild_id,
            ""
        )

        split = generic_message.content.split()
    elif isinstance(message, GroupMessage):
        author = message.author.__dict__
        content = message.content
        generic_message = base.Message(
            2,
            api,
            author,
            content,
            "",
            message.id,
            "",
            message.group_openid
        )

        split = generic_message.content.split()
        if len(split) == 0:
            return
    else:
        return

    with UserData(generic_message.author.id) as user_data:
        user_status = user_data.get_status()
    if user_status == 1:
        await generic_message.send_msg(content="当前正在被监禁。")
        return
    elif user_status == 2:
        await handle_answer(split, generic_message)
        return

    keyword = split[0]
    # 精准菜单
    command_handlers = {
        '/菜单': handle_menu,
        '/签到': handle_sign,
        '/查询': handle_query,
        # "/商店": handle_shop,
        # "/购买": handle_buy,
        # "/60s": handle_daily_news,
        "/一言": handle_one_say,
        # "/精灵招募": draw_sprite,
        # "/二次元的我": handle_create_2d_gril,
        "/开始答题": handle_answer
    }

    if keyword in command_handlers:
        await command_handlers[keyword](split, generic_message)
        return

    command_handlers = {
        "/追击": handle_chase
    }
    for key in command_handlers.keys():
        if key in keyword:
            await command_handlers[key](split, generic_message)
            return


async def handle_menu(_, message: base.Message) -> None:
    at_author = f'<@!{message.author.id}>'
    msg = (DATA_GAME_CONF.menu_content
           .replace("{at_author}", at_author)
           .replace("{author_id}", message.author.id))
    await message.send_msg(content=msg)


async def handle_sign(_, message: base.Message) -> None:
    with UserData(message.author.id) as user_data:
        msg = game.sign(user_data)
    await message.send_msg(content=msg)


async def handle_query(_, message: base.Message) -> None:
    with UserData(message.author.id) as user_data:
        author_gold = user_data.get_gold()
    at_author = f'<@!{message.author.id}>'

    msg = (DATA_GAME_CONF.select_content
           .replace("{at_author}", at_author)
           .replace("{author_id}", message.author.id)
           .replace("{author_gold}", str(author_gold)))
    await message.send_msg(content=msg)


async def handle_shop(split: list, message: base.Message) -> None:
    msg = DATA_TEMP_GOOD_LIST.get_good_list(1)
    await message.send_msg(content=msg)


async def handle_buy(split: list, message: base.Message) -> None:
    # 购买格式：购买 名称 数量(默认:1)
    #          0   1   2

    if len(split) == 1:  # 没有名称
        await message.send_msg(content="购买格式错误，正确格式：\n/购买 名称 数量(可不填，默认为 1)")
        return

    name = split[1]
    quantity = 1
    if len(split) == 3:
        quantity = split[2]
        if not quantity.isdigit():  # 是否能转化为整数
            await message.send_msg(content="购买数量有误，请重新填写。")
            return
        quantity = int(split[3])
    with UserData(message.author.id) as user_data:
        msg = DATA_TEMP_GOOD_LIST.buy_item(name, quantity, user_data)
    await message.send_msg(content=msg)


async def handle_daily_news(_, message: base.Message) -> None:
    b, image_path, image_url = webapi.get_daily_news_path()
    if message.type == 2:
        await message.send_img(url=image_url)
        return
    await message.send_msg(file_image=image_path)


async def handle_chase(split: list, message: base.Message) -> None:
    if split[1] == "/追击":
        await message.send_msg(content="追击消息格式错误，正确格式：\n/追击@被追击人")
        return

    user2_id = game.find_user(split[1])

    with UserData(message.author.id) as user_data:
        with UserData(user2_id) as user2_data:
            pk = game.PK(user_data, user2_data)
            msg = pk.attack()
    await message.send_msg(content=msg)


async def handle_one_say(_, message: base.Message) -> None:
    msg = webapi.get_one_say_text()
    await message.send_msg(content=msg)


async def draw_sprite(split: list, message: base.Message) -> None:
    # msg: /精灵招募 池子名称 数量
    #         0      1      2

    if len(split) == 1:  # /精灵招募
        msg = DATA_GACHA_INFO.get_open_pool()
        await message.send_msg(content=msg)
        return

    def get_gacha_data(pool_name: str):
        for gacha in DATA_GACHA_INFO.Gacha_Pools:
            if pool_name == gacha.name:
                return gacha
        return None

    msg = "招募指令错误，请检查格式：\n招募指令: \n招募一次【/精灵招募 招募池名称 1】\n招募十次【/精灵招募 招募池名称 10】"
    ga = get_gacha_data(split[1])
    if not ga:
        await message.send_msg(content=msg)
        return

    if len(split) == 3:  # 只有池子名，没有数量，默认单抽
        split.append("1")
    # 招募开始
    if split[3] == "1":
        msg = "1"
    elif split[3] == "10":
        msg = "10"
    with UserData(message.author.id) as user_data:
        DATA_GACHA_INFO.wish(user_data)
    await message.send_msg(content=msg)


async def handle_create_2d_gril(split: [], message: base.Message) -> None:
    # msg: /二次元少女的我 夏源(可选)
    # index:     0       1
    if len(split) == 1:
        name = message.author.username


async def handle_answer(split: [], message: base.Message) -> None:
    # msg: /开始答题
    # index:  0
    keyword = split[0]

    with UserData(message.author.id) as user_data:
        if keyword == "/开始答题":
            user_data.set_status(2)

            question = answer.get_question()
            user_data.set_question_answer(question.answer)
            now_times = times.get_timestamp()
            user_data.set_question_start_times(now_times)

            await message.send_msg(content=f"答题已开始，回答时间【{DATA_ANSWER.expiration_time}】秒。\n{question.question}")
            return

        if keyword == "/结束答题":
            user_data.set_status(0)
            await message.send_msg(
                content="已退出答题。")
            return

        start_times = user_data.get_question_start_times() + DATA_ANSWER.expiration_time
        now_times = times.get_timestamp()
        if now_times >= start_times:
            # 过期
            question = answer.get_question()
            user_data.set_question_answer(question.answer)
            now_times = times.get_timestamp()
            user_data.set_question_start_times(now_times)
            await message.send_msg(content=f"回答已超出规定时间，进入下一题：\n{question.question}\n退出答题发送：/结束答题")
            return

        for a in user_data.get_question_answer():
            if a == keyword:
                # 回答正确
                user_data.add_gold(DATA_ANSWER.success_reward)

                question = answer.get_question()
                user_data.set_question_answer(question.answer)
                now_times = times.get_timestamp()
                user_data.set_question_start_times(now_times)

                await message.send_msg(
                    content=f"回答正确：\n"
                            f"奖励【{DATA_ANSWER.success_reward}】金币\n"
                            f"进入下一题：\n"
                            f"{question.question}\n"
                            f"退出答题发送：/结束答题"
                )

