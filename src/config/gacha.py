import json

from internal import base
from utils import times


def read_table():
    with open(base.PATH_GACHA_TABLE, encoding="utf-8") as f:
        return json.load(f).get("gachaPool", {})


class GachaInfo:
    Gacha_Pools = []

    def load_pool(self):
        temp_list = []
        pools = read_table()
        # 只添加开放的卡池
        for pool in pools:
            local_time = times.get_today_timestamp()
            ga = base.Gacha(pool)
            if ga.openTime <= local_time < ga.endTime:
                temp_list.append(ga)
        self.Gacha_Pools = temp_list

    def get_open_pool(self) -> str:
        msg = "目前开放卡池：\n"
        for ga in self.Gacha_Pools:
            local_time = times.get_today_timestamp()
            print(f"{local_time}, {ga.openTime}, {ga.endTime}")
            if ga.openTime <= local_time < ga.endTime:
                msg += ga.name + "\n"

        msg += ("招募指令: \n"
                "招募一次 【/卡池名 1】\n"
                "招募十次 【/卡池名 10】")
        return msg


GACHA_INFO = GachaInfo()
