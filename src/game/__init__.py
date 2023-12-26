import json
import re

import user
import utils
from config.gameConfig import config_game


def sign(user_data: user.UserData) -> str:
    """
    玩家功能：签到
    :param user_data: player_object: 已创建的玩家对象
    :return: 返回签到消息。
    """
    # 获取今天凌晨时间戳
    times = utils.get_local_times()

    # 获取上一次签到时间戳
    last_times = user_data.get_sign_times()

    # 今日已签到
    if last_times == times:
        return '你今天已经签过到了！明天再来吧。'

    # 今日未签到，签到奖励
    gold = config_game.get_sign_gold()
    user_data.add_gold(gold)

    user_data.set_sign_times(times)
    return f'签到成功：\n获得：{gold}金币'


def find_user(content: str) -> str:
    # <@!1748895015815895279>
    user_list = re.findall("追击<@!(.*?)>", content)
    user_id = user_list[0]
    return user_id


class PK:
    player1: json
    player2: json

    def __init__(self, player1: user.UserData, player2: user.UserData):
        """Weapon:"""
        self.player1 = player1
        self.player2 = player2

    def attack(self, is_player1: bool = True) -> str:
        """
        追击玩家
        :param is_player1: True: 发送人攻击被发送人（虽然不知道这个函数有什么用，但是就是有用。）
        :return:
        """
        weapon: str
        if is_player1:
            weapon = self.player1.get_equipment_weapon()
        else:
            weapon = self.player2.get_equipment_weapon()

        if weapon == "":
            return "手无寸铁，怎么追击别人。\n去商店买把趁手的武器吧。"

        return ""
