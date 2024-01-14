import os

import yaml

from internal import base


def create_directory():
    paths = [
        # os.path.join(config.RUN, "data"),
        os.path.join(base.PATH_RUN, "data", "excel"),
        os.path.join(base.PATH_RUN, "data", "shop"),
        # os.path.join(base.PATH_RUN, "data", "static"),
        # os.path.join(base.PATH_RUN, "data", "static", "images"),
        os.path.join(base.PATH_RUN, "data", "static", "images", "dailyNews"),
        # os.path.join(base.PATH_RUN, "data", "user"),
        os.path.join(base.PATH_RUN, "data", "user", "all"),
        # config
        os.path.join(base.PATH_RUN, "config"),
    ]

    for path in paths:
        os.makedirs(path, exist_ok=True)


def generate_config():
    data = {
        "robot": {
            "appid": '',
            "token": '',
            "secret": ''
        },
        "admin": {
            "id": ["3082925737"]
        }
    }
    with open(base.PATH_CONFIG, "w", encoding="utf-8") as file:
        file.write("# 配置解释请查看：https://xiayuanovo.github.io/Modernia-docs/guide/config.html\n")
        yaml.dump(data, file, allow_unicode=True)


def generate_start_cmd():
    with open(os.path.join(base.PATH_RUN, "start.bat"), "w") as file:
        file.write("Modernia.exe")


def generate_game_conf():
    data = {
        "menu": {
            "content": "{at_author} 欢迎体验Modernia：\n"
                       "        /签到    签到打开，获得金币\n"
                       "        /查询    查询自身信息\n"
        },
        "select": {
            "content": "{at_author}\n金币: {author_gold}"
        },
        "sign": {
            "gold_min": 0,
            "gold_max": 10
        },
        "daily_news": {
            "date_times": float,
            "image_path": ""
        }
    }
    with open(base.PATH_GAME_CONF, "w", encoding="utf-8") as file:
        file.write("# 配置解释请查看：https://xiayuanovo.github.io/Modernia-docs/guide/config.html\n")
        yaml.dump(data, file, allow_unicode=True)


def generate_temp_good_list():
    data = {}
    with open(base.PATH_TEMP_GOOD_LIST, "w", encoding="utf-8") as file:
        yaml.dump(data, file, allow_unicode=True)


def generate_gacha_table():
    data = {}
    with open(base.PATH_GACHA_TABLE, "w", encoding="utf-8") as file:
        yaml.dump(data, file, allow_unicode=True)


def generate_answer_data():
    data = {
        "success_reward": 5,
        "expiration_time": 15
    }
    with open(base.PATH_GACHA_TABLE, "w", encoding="utf-8") as file:
        yaml.dump(data, file, allow_unicode=True)


def load_all_filedata():
    from config import DATA_GAME_CONF, DATA_GACHA_INFO, DATA_TEMP_GOOD_LIST, DATA_ANSWER
    DATA_GACHA_INFO.load_pool()
    DATA_GAME_CONF.read_config()
    DATA_TEMP_GOOD_LIST.read_config()
    DATA_ANSWER.read()
