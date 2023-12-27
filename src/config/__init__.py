import os
import random
import sys

import yaml

if len(sys.argv) == 1:
    path_run = sys.path[0]
else:
    path_run = sys.argv[1]

path_config = f"{path_run}\\config\\config.yaml"
path_game = f"{path_run}\\config\\game.yaml"
path_user = f"{path_run}\\data\\user\\all\\"


def check_file_missing():
    import os
    if not os.path.exists(f"{path_run}/data/"):
        os.mkdir(f"{path_run}/data/")
    if not os.path.exists(f"{path_run}/config/"):
        os.mkdir(f"{path_run}/config/")
    if os.path.isfile(path_game):
        with open(path_game, "w", encoding="utf-8") as f:
            f.write("menu:\n"
                    r"  content: \"{at_author} 欢迎体验Modernia：\n        /签到    签到打开，获得金币\n        /查询    查询自身信息\""
                    "\nselect:\n"
                    r"  content: \"{at_author}\n金币: {author_gold}\""
                    "\nsign:"
                    "\n  gold_min: 0"
                    "\n  gold_max: 10"
                    "daily_news")


class GameConfig:
    yaml_game = {}

    select_content: str
    menu_text: str

    def read_config(self):
        with open(path_config, encoding="utf-8") as f:
            content = f.read()
            if content != "":
                self.yaml_game = yaml.load(content, yaml.FullLoader)

    def save_config(self):
        with open(path_config, "w", encoding="utf-8") as file:
            yaml.dump(self.yaml_game, file, allow_unicode=True)

    def __init__(self):
        print("GameConfig: __init__")
        self.read_config()
        self.select_content = self.yaml_game.get("select", {}).get("content", "查询内容为空。")
        self.menu_text = self.yaml_game.get("menu", {}).get("content", "菜单内容为空。")

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.save_config()

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
        path = self.yaml_game["daily_news"]["image_path"]
        return times, path

    def set_daily_news(self, times, path):
        self.yaml_game["daily_news"]["date_times"] = times
        self.yaml_game["daily_news"]["image_path"] = path
        self.save_config()


config_game: object


def load():
    print(f"debug: run_path = {path_run}")
    check_file_missing()
    if not os.path.isfile(path_config):  # 查找配置文件：第一次启动
        with open(path_config, "w+", encoding="utf-8") as file:
            file.write("token:\n  # qq开放平台申请的机器人信息"
                       "  appid: \"\"\n"
                       "  token: \"\"\n"
                       "  secret: \"\"\n")
        print(r"未找到配置文件，已为你生成初始化配置文件，请前往 config\config.yaml 配置")
        os.system("pause")
        sys.exit(0)

    with open(path_config, encoding="utf-8") as file:
        config_json = yaml.load(file.read(), yaml.FullLoader)
    appid = config_json.get("token", {}).get("appid", "")
    token = config_json.get("token", {}).get("token", "")
    secret = config_json.get("token", {}).get("secret", "")
    del config_json

    if appid == "" or secret == "":
        pas = "appid" if appid == "" else "secret"

    return appid, secret
