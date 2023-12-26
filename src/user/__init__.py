import json
import os

import config


class UserData:
    author_id: str
    player_path: str
    player_json: json

    def __init__(self, author_id):
        """
        创建 UserData 对象，操作玩家数据。
        :param author_id: 玩家频道 ID
        """
        self.author_id = author_id
        self.player_path = f"{config.user_path}{self.author_id}.json"

        # 查询文件是否存在
        if os.path.isfile(self.player_path):
            with open(self.player_path, "r", encoding="utf-8") as f:
                self.player_json = json.load(f)
        else:
            self.player_json = {}

    def __exit__(self, exc_type, exc_val, exc_tb):
        with open(self.player_path, "w", encoding="utf-8") as f:
            json.dump(self.player_json, f, ensure_ascii=False)

    # def __del__(self):
    #     with open(self.player_path, 'w', encoding="utf-8") as f:
    #         json.dump(self.player_json, f, ensure_ascii=False)

    def set_sign_times(self, sign_times: float):
        """
        设置签到时间
        :param sign_times: 设置签到时间戳
        :return:
        """
        data = {
            "status": {
                "signTimes": sign_times
            }
        }
        self.player_json.update(data)

    def get_sign_times(self) -> float:
        return self.player_json.get("status", {}).get("signTimes", 1701360000)

    def add_gold(self, gold: int) -> int:
        """
        增加金币 也可以是负数
        :param gold: 增加金币数量
        :return: 返回增加后的金币。
        """
        gold += self.player_json.get("gold", 0)
        if gold < 0:
            return -1

        data = {
            "gold": gold
        }
        self.player_json.update(data)
        return gold

    def get_gold(self) -> int:
        return self.player_json.get("gold", 0)

    def set_status(self, code: int):
        data = {
            "status": {
                "code": code
            }
        }
        self.player_json.update(data)

    def get_status(self) -> int:
        return self.player_json.get("status", {}).get("code", 0)

    def give_inventory(self, key: str, value: str):
        """

        :param key:
        :param value:
        :return:
        """
        """
        "inventory": [
            {
                "item_id": "key_001",
                "name": "大门钥匙",
                "category": "key",
                "quantity": 1,
                "description": "打开城堡大门的钥匙"
            }
        ]
        """
        data = {
            "inventory": {
                key: {

                }
            }
        }
        self.player_json.update(data)

    def set_equipment_weapon(self, weapon_id: str, name: str):
        data = {
            "equipment": {
                "weapon": {
                    "id": weapon_id,
                    "name": name,
                    "attack": 10,  # 攻击伤害
                    "durability": 10,  # 耐久
                    "description": "一把普通的铁剑"
                }
            }
        }
        self.player_json.update(data)

    def get_equipment_weapon(self) -> str:
        """
        取当前装载的玩家武器 (Weapon)。
        :return: 返回武器 id
        """
        weapon = self.player_json.get("equipment", {}).get("weapon", "")
        return weapon
