# from internal.base import Gacha
from config.gacha import GachaInfo
import random


class WishGacha(GachaInfo):

    def __init__(self, user_data: {}):
        super().__init__()
        self.user_data = user_data

    def wish(self, pool_name: str) -> str:
        for name in GachaInfo.Gacha_Pools["name"]:
            if pool_name == name:
                print(1)

        random_integer = random.randint(1, 100)
        if random_integer <= 2:
            self.user_data["character"].append("")
            self.user_data.update()
            # 6星
            return ""
        return ""
