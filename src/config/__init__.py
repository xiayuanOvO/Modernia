import os
import sys
import yaml

if getattr(sys, 'frozen', False):
    RUN = os.path.dirname(sys.executable)  # 获取可执行文件所在目录
else:
    # 当前是在源代码中运行
    if len(sys.argv) == 1:
        RUN = sys.path[0]
    else:
        RUN = sys.argv[1]
print(RUN)

CONFIG = os.path.join(RUN, "config", "config.yml")
GAME = os.path.join(RUN, "config", "game.yml")
USER = os.path.join(RUN, "data", "USER", "all")
TEMP_GOOD_LIST = os.path.join(RUN, "data", "shop", "tempGoodList.json")
arena_rankings_data = os.path.join(RUN, "data", "arena", "all", "rankings.json")
GACHA_LIMITED = os.path.join(RUN, "data", "gacha", "limited.json")

# path = {
#     "Config": os.path.join(RUN, "config", "config.yaml")
#     "Game": os.path.join(RUN, "config", "game.yaml")
# }


def get_bot_info():
    """
    获取 config.yaml 中机器人的信息
    :return: appid, secret, token
    """
    with open(CONFIG, encoding="utf-8") as file:
        config_json = yaml.load(file.read(), yaml.FullLoader)
        robot = config_json.get("robot", {})
        appid = robot.get("appid", "")
        token = robot.get("token", "")
        secret = robot.get("secret", "")
    return appid, secret, token


# def parse() -> {}:
#     with open()
#     return {"a": "1"}
