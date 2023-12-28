import random

import yaml

import config


class GameConfig:
    yaml_game = {}

    select_content: str
    menu_content: str

    def save_config(self):
        with open(config.GAME, "w", encoding="utf-8") as file:
            yaml.dump(self.yaml_game, file, allow_unicode=True)

    def __init__(self):
        print("GameConfig: __init__")
        self.read_config()
        self.select_content = self.yaml_game.get("select", {}).get("content", "查询内容为空。")
        self.menu_content = self.yaml_game.get("menu", {}).get("content", "菜单内容为空。")

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.save_config()

    def read_config(self):
        with open(config.GAME, encoding="utf-8") as f:
            content = f.read()
            if content != "":
                self.yaml_game = yaml.load(content, yaml.FullLoader)

    def get_sign_gold(self) -> int:
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
        times = self.yaml_game["daily_news"]["date_times"]
        path_ = self.yaml_game["daily_news"]["image_path"]
        return times, path_

    def set_daily_news(self, times, path_):
        self.yaml_game["daily_news"]["date_times"] = times
        self.yaml_game["daily_news"]["image_path"] = path_
        self.save_config()


game_config = GameConfig()
