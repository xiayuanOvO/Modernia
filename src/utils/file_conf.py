import os

import yaml

import config


def create_file():
    list_path = [
        os.path.join(config.RUN, "data"),
        os.path.join(config.RUN, "data", "excel"),
        os.path.join(config.RUN, "data", "shop"),
        os.path.join(config.RUN, "data", "static"),
        os.path.join(config.RUN, "data", "static", "images"),
        os.path.join(config.RUN, "data", "static", "images", "dailyNews"),
        os.path.join(config.RUN, "data", "user"),
        os.path.join(config.RUN, "data", "user", "all"),
        # config
        os.path.join(config.RUN, "config"),
    ]
    for path in list_path:
        if not os.path.exists(path):
            os.mkdir(path)

    conf = {
        'robot': {
            'appid': '',
            'token': '',
            'secret': ''
        }
    }
    with open(config.CONFIG, "w", encoding="utf-8") as file:
        yaml.dump(conf, file, allow_unicode=True)

    if not os.path.isfile(config.GAME):
        game_file()
    if not os.path.isfile(config.TEMP_GOOD_LIST):
        temp_good_list()


def game_file():
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
    with open(config.GAME, "w", encoding="utf-8") as file:
        yaml.dump(data, file, allow_unicode=True)


def temp_good_list():
    data = {}
    with open(config.TEMP_GOOD_LIST, "w", encoding="utf-8") as file:
        yaml.dump(data, file, allow_unicode=True)
