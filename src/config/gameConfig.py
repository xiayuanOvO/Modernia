import random

import yaml

import config


class GameConfig:
    game_yaml: yaml
    _game_path = f'{config.run_path}\\config\\game.yaml'
    select_content: str
    menu_text: str

    def read_config(self):
        with open(self._game_path, encoding="utf-8") as file:
            self.game_yaml = yaml.load(file.read(), yaml.FullLoader)

    def save_config(self):
        with open(self._game_path, "w", encoding="utf-8") as file:
            yaml.dump(self.game_yaml, yaml.load(file.read(), yaml.FullLoader))

    def __init__(self):
        self.read_config()
        self.select_content = self.game_yaml.get("select", {}).get("content", "查询内容为空。")
        self.menu_text = self.game_yaml.get("menu", {}).get("content", "菜单内容为空。")

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.save_config()

    def get_sign_gold(self) -> int:
        gold_max = self.game_yaml.get("sign", {}).get("gold_max", 0)
        if gold_max == 0:
            return 0
        gold_min = self.game_yaml.get("sign", {}).get("gold_min", 0)
        gold = random.randint(gold_min, gold_max)
        return gold

    def get_daily_news(self):
        """
        返回每天 60 秒读懂世界的配置信息。
        :return: 上次获取时间戳，图片路径
        """
        times = self.game_yaml["daily_news"]["date_times"]
        path = self.game_yaml["daily_news"]["image_path"]
        return times, path

    def set_daily_news(self, times, path):
        self.game_yaml["daily_news"]["date_times"] = times
        self.game_yaml["daily_news"]["image_path"] = path
        self.save_config()


game_config = GameConfig()
