import time
from datetime import datetime


def get_today_timestamp() -> int:
    """
    （本地时间）获取今日凌晨的时间戳
    :return: 时间戳
    """
    local_time = time.localtime()
    timestamp = int(time.mktime((local_time.tm_year, local_time.tm_mon, local_time.tm_mday, 0, 0, 0, 0, 0, 0)))
    return timestamp


def get_timestamp() -> int:
    # 获取当前时间
    now = datetime.now()
    # 设置时间为今天的凌晨（将时、分、秒、毫秒置为0）
    today_midnight = datetime(now.year, now.month, now.day, now.hour, now.minute, now.second, 0)
    # 获取今天凌晨的时间戳（UTC时间）
    timestamp = int(today_midnight.timestamp())
    return timestamp
