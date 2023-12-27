import os
import sys
import yaml

if len(sys.argv) == 1:
    run = sys.path[0]
else:
    run = sys.argv[1]


config = os.path.join(run, "config", "config.yaml")
game = os.path.join(run, "config", "game.yaml")
user = os.path.join(run, "data", "user", "all")
temp_good_list = os.path.join(run, "data", "shop", "tempGoodList.json")
arena_rankings_data = os.path.join(run, "data", "arena", "all", "rankings.json")


def get_bot_info():
    """
    获取 config.yaml 中机器人的信息
    :return: appid, secret, token
    """
    with open(config, encoding="utf-8") as file:
        config_json = yaml.load(file.read(), yaml.FullLoader)
        robot = config_json.get("robot", {})
        appid = robot.get("appid", "")
        token = robot.get("token", "")
        secret = robot.get("secret", "")
    return appid, secret, token
