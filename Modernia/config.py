import json
import random

import yaml

from internal import base
from utils import times


class GameConfig:
    def __init__(self):
        self.data = {}
        self.select_content = ""
        self.menu_content = ""

    def read_config(self):
        with open(base.PATH_GAME_CONF, encoding="utf-8") as f:
            content = f.read()
        if content != "":
            self.data = yaml.load(content, yaml.FullLoader)
        self.select_content = self.data.get("select", {}).get("content", "查询内容为空。")
        self.menu_content = self.data.get("menu", {}).get("content", "菜单内容为空。")

    def save_config(self):
        with open(base.PATH_GAME_CONF, "w", encoding="utf-8") as file:
            yaml.dump(self.data, file, allow_unicode=True)
        self.select_content = self.data.get("select", {}).get("content", "查询内容为空。")
        self.menu_content = self.data.get("menu", {}).get("content", "菜单内容为空。")

    def get_sign_gold(self) -> int:
        """
        获取签到奖励金币数量
        :return:
        """
        gold_max = self.data.get("sign", {}).get("gold_max", 0)
        if gold_max == 0:
            return 0
        gold_min = self.data.get("sign", {}).get("gold_min", 0)
        gold = random.randint(gold_min, gold_max)
        return gold

    def get_daily_news(self):
        """
        返回每天 60 秒读懂世界的配置信息。
        :return: 上次获取时间戳，图片路径
        """
        time = self.data.get("daily_news", {}).get("date_times", "")
        path_ = self.data.get("daily_news", {}).get("image_path", "")
        url = self.data.get("daily_news", {}).get("image_url", "")
        return time, path_, url

    def set_daily_news(self, time: str, path_: str, url: str):
        """
        :param time:
        :param path_:
        :param url:
        :return:
        """
        self.data["daily_news"]["date_times"] = time
        self.data["daily_news"]["image_path"] = path_
        self.data["daily_news"]["image_url"] = url
        self.save_config()


class TempGoodList:
    from user import UserData

    def __init__(self):
        self.good_list = {}
        self.temp_good_list_json = {}

    def read_config(self):
        with open(base.PATH_TEMP_GOOD_LIST, encoding="utf-8") as file:
            self.temp_good_list_json = json.load(file)
        self.good_list = self.temp_good_list_json.get("goodList", [])

    def get_good_list(self, pages: int) -> str:
        """
        获取商品详细列表，每页 3 个商品
        :param pages: 当前页数
        :return: 返回商品文本格式
        """
        content = "商城暂未开放，敬请期待..."
        list_num = len(self.good_list)
        index_start = pages * 3

        number = list_num - index_start
        if number <= 0:  # 如果是负数。
            number = list_num

        # print(f"number: {number}, list_num: {list_num}, index_start: {index_start}")
        for i in range(number):
            good_name = self.good_list[i].get("goodName", "商品名称")
            price = self.good_list[i].get("price", 99999)
            content = f"[{good_name}]×1 价格：" + f"{price}\n"
        return content

    def buy_item(self, item_name: str, quantity: int, user_data: UserData) -> str:
        if quantity <= 0:
            quantity = 1

        for item in self.good_list:
            if item['goodName'] == item_name:
                if quantity > item['availCount']:
                    return "购买失败，超过售卖数量。"
                price = item["price"] * quantity
                if user_data.add_gold(-price) == -1:
                    return "购买失败，金币不足。"
                user_data.set_equipment_weapon(item["item"]["id"], item_name)
                return f"购买成功：\n获得：[{item_name}] × {quantity}，已装备。\n查看装备：/装备"
        return "购买失败，未能找到商品。"


def read_table():
    with open(base.PATH_GACHA_TABLE, encoding="utf-8") as f:
        return json.load(f).get("gachaPool", {})


class GachaInfo:
    from user import UserData

    Gacha_Pools = []

    def load_pool(self):
        temp_list = []
        pools = read_table()
        # 只添加开放的卡池
        for pool in pools:
            local_time = times.get_today_timestamp()
            ga = base.Gacha(pool)
            if ga.openTime <= local_time < ga.endTime:
                temp_list.append(ga)
        self.Gacha_Pools = temp_list

    def get_open_pool(self) -> str:
        msg = "目前开放卡池：\n"
        for ga in self.Gacha_Pools:
            local_time = times.get_today_timestamp()
            print(f"{local_time}, {ga.openTime}, {ga.endTime}")
            if ga.openTime <= local_time < ga.endTime:
                msg += ga.name + "\n"

        msg += ("招募指令: \n"
                "招募一次 【/卡池名 1】\n"
                "招募十次 【/卡池名 10】")
        return msg

    def wish(self, user_data: UserData):
        user_data.get_gold()


class Answer_DATA:
    def __init__(self):
        self.data = {}
        self.success_reward = 0
        self.expiration_time = 15

    def read(self):
        with open(base.PATH_ANSWER_DATA, "r", encoding="utf-8") as file:
            self.data = json.load(file)
        self.success_reward = self.data.get("success_reward")
        self.expiration_time = self.data.get("expiration_time")


DATA_ANSWER = Answer_DATA()
DATA_GAME_CONF = GameConfig()
DATA_GACHA_INFO = GachaInfo()
DATA_TEMP_GOOD_LIST = TempGoodList()
