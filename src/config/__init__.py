import os
import sys
import yaml

if len(sys.argv) == 1:
    RUN = sys.path[0]
else:
    RUN = sys.argv[1]

CONFIG = os.path.join(RUN, "config", "config.yaml")
GAME = os.path.join(RUN, "config", "game.yaml")
USER = os.path.join(RUN, "data", "USER", "all")
temp_good_list = os.path.join(RUN, "data", "shop", "tempGoodList.json")
arena_rankings_data = os.path.join(RUN, "data", "arena", "all", "rankings.json")

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
