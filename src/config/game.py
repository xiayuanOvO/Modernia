import random

import yaml

from internal import base


class GameConfig:
    yaml_game = {}

    select_content: str
    menu_content: str

    def read_config(self):
        with open(base.PATH_GAME_CONF, encoding="utf-8") as f:
            content = f.read()
            if content != "":
                self.yaml_game = yaml.load(content, yaml.FullLoader)
        self.select_content = self.yaml_game.get("select", {}).get("content", "查询内容为空。")
        self.menu_content = self.yaml_game.get("menu", {}).get("content", "菜单内容为空。")

    def save_config(self):
        with open(base.PATH_GAME_CONF, "w", encoding="utf-8") as file:
            yaml.dump(self.yaml_game, file, allow_unicode=True)
        self.select_content = self.yaml_game.get("select", {}).get("content", "查询内容为空。")
        self.menu_content = self.yaml_game.get("menu", {}).get("content", "菜单内容为空。")

    def get_sign_gold(self) -> int:
        """
        获取签到奖励金币数量
        :return:
        """
        gold_max = self.yaml_game.get("sign", {}).get("gold_max", 0)
        if gold_max == 0:
            return 0
        gold_min = self.yaml_game.get("sign", {}).get("gold_min", 0)
        gold = random.randint(gold_min, gold_max)
        return gold

    def get_daily_news(self):
        """
        返回每天 60 秒读懂世界的配置信息。
        :return: 上次获取时间戳，图片路径
        """
        times = self.yaml_game.get("daily_news", {}).get("date_times", "")
        path_ = self.yaml_game.get("daily_news", {}).get("image_path", "")
        return times, path_

    def set_daily_news(self, times, path_):
        self.yaml_game["daily_news"]["date_times"] = times
        self.yaml_game["daily_news"]["image_path"] = path_
        self.save_config()


GAME_CONF = GameConfig()
