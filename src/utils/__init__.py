import time


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
