from internal import flag
from utils import terminal
import event


def get_bot_config():
    from internal import base
    import yaml
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


if __name__ == '__main__':
    terminal.set_title()
    terminal.welcome()
    flag.init()

    appid, secret, _ = get_bot_config()
    event.run(appid, secret)
