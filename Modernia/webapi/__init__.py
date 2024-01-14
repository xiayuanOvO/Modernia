import json

import requests

from config import DATA_GAME_CONF
from internal import base
from utils import times


def get_daily_news_path() -> [bool, str, str]:
    """
    获取每天60秒读懂世界图片路径
    :return: 获取成功 (bool), 图片路径 (str)
    """
    last_times, image_path, image_url = DATA_GAME_CONF.get_daily_news()
    local_times = times.get_today_timestamp()
    if last_times == local_times:
        return True, image_path, image_url

    req = requests.get("https://jx.iqfk.top/60s.php?key=54K55paw6Iqx6Zuo")
    if req.status_code != 200:
        return False, f"获取今日每天60秒读懂世界错误，错误码: {req.status_code}", image_url

    j = json.loads(req.text)
    date = j.get("data", {}).get("date")
    image_url = j.get("data", {}).get("image", "")
    if not image_url:
        return False, f"获取今日每天60秒读懂世界错误，错误码: MEa1", image_url

    req = requests.get(image_url)
    image_path = f"{base.PATH_RUN}\\data\\static\\images\\dailyNews\\{date}.png"
    with open(image_path, "wb") as file:
        file.write(req.content)
    DATA_GAME_CONF.set_daily_news(local_times, image_path, image_url)
    return True, image_path, image_url


def get_one_say_text() -> str:
    req = requests.get("http://api.treason.cn/API/yiyan.php")
    return req.text


def get_anime_persona(name: str) -> str:
    req = requests.get(f"https://api.lolimi.cn/API/Ser/?name={name}&type=text")
    return req.text
