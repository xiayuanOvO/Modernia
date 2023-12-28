import os
import time

import config


def get_local_times() -> float:
    """
    获取今天的时间戳（本地时间）
    :return: 时间戳
    """
    local_time = time.localtime()
    times = time.mktime((local_time.tm_year, local_time.tm_mon, local_time.tm_mday, 0, 0, 0, 0, 0, 0))
    # times = time.mktime(
    #     time.strptime(
    #         f"{local_time.tm_year}-{local_time.tm_mon}-{local_time.tm_mday} 00:00:00",
    #         "%Y-%m-%d %H:%M:%S"
    #     )
    # )
    return times


def create_file():

    if not os.path.exists(f"{config.RUN}/data/"):
        os.mkdir(f"{config.RUN}/data/")
    if not os.path.exists(f"{config.RUN}/config/"):
        os.mkdir(f"{config.RUN}/config/")

    with open(config.config, "w", encoding="utf-8") as file:
        file.write("robot:\n  # qq开放平台申请的机器人信息"
                   "  appid: \"\"\n"
                   "  token: \"\"\n"
                   "  secret: \"\"\n")

    if os.path.isfile(config.game):
        with open(config.game, "w", encoding="utf-8") as f:
            f.write("menu:\n"
                    r'  content: "{at_author} 欢迎体验Modernia：\n        /签到    签到打开，获得金币\n        /查询    查询自身信息"'
                    "\nselect:\n"
                    r'  content: "{at_author}\n金币: {author_gold}"'
                    "\nsign:"
                    "\n  gold_min: 0"
                    "\n  gold_max: 10"
                    "daily_news")
