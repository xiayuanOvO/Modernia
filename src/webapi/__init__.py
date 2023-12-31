import json

import requests

import config
from config.game import game_config
import utils


def get_daily_news_path():
    """
    获取每天60秒读懂世界图片路径
    :return: 获取成功 (bool), 图片路径 (str)
    """
    last_times, image_path = game_config.get_daily_news()
    local_times = utils.get_local_times()
    if last_times == local_times:
        return True, image_path
    req = requests.get("https://jx.iqfk.top/60s.php?key=54K55paw6Iqx6Zuo")
    if req.status_code != 200:
        return False, f"获取今日每天60秒读懂世界错误，错误码: {req.status_code}"

    j = json.loads(req.text)
    date = j.get("data", {}).get("date")
    image_url = j.get("data", {}).get("image", "")

    if image_url == "":
        return False, f"获取今日每天60秒读懂世界错误，错误码: MEa1"
    req = requests.get(image_url)
    image_path = f"{config.RUN}\\data\\static\\images\\dailyNews\\{date}.png"
    with open(image_path, "wb") as file:
        file.write(req.content)
    game_config.set_daily_news(local_times, image_path)

    return True, image_path
