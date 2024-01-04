import yaml

from internal import base


def get_bot_config():
    """
    获取机器人配置信息
    :return:
    """
    with open(base.PATH_CONFIG, "r", encoding="utf-8") as file:
        config_json = yaml.load(file.read(), yaml.FullLoader)
        robot = config_json.get("robot", {})
        appid = robot.get("appid", "")
        token = robot.get("token", "")
        secret = robot.get("secret", "")
    return appid, secret, token
