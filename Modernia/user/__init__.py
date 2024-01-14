import json
import os

from internal import base
from game.answer import Answer


class UserData:
    def __init__(self, author_id: str):
        """
        创建 UserData 对象，操作玩家数据。
        :param author_id: 玩家频道 ID
        """
        self.author_id = author_id
        self.path = os.path.join(base.PATH_USER, f"{self.author_id}.json")
        self.data = self.load_data()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False)

    def load_data(self):
        if os.path.isfile(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

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
        self.data.update(data)

    def get_sign_times(self) -> float:
        return self.data.get("status", {}).get("signTimes", 1701360000)

    def add_gold(self, gold: int) -> int:
        """
        增加金币 也可以是负数
        :param gold: 增加金币数量
        :return: 返回增加后的金币。
        """
        gold += self.data.get("gold", 0)
        if gold < 0:
            return -1

        data = {
            "gold": gold
        }
        self.data.update(data)
        return gold

    def get_gold(self) -> int:
        return self.data.get("gold", 0)

    def set_status(self, code: int):
        """
        设置玩家状态
        :param code: 0-正常状态, 1-监禁状态, 2-答题状态
        :return:
        """
        data = {
            "status": {
                "code": code
            }
        }
        self.data.update(data)

    def get_status(self) -> int:
        return self.data.get("status", {}).get("code", 0)

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
        self.data.update(data)

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
        self.data.update(data)

    def get_equipment_weapon(self) -> str:
        """
        取当前装载的玩家武器 (Weapon)。
        :return: 返回武器 id
        """
        weapon = self.data.get("equipment", {}).get("weapon", "")
        return weapon

    def get_gacha_data(self, rule_type):
        self.data.get("gacha")
        UserCachaData()
        return UserCachaData()

    def set_question_answer(self, answer: []):
        data = {
            "question": {
                "answer": answer
            }
        }
        self.data.update(data)

    def get_question_start_times(self) -> int:
        return self.data.get("question", {}).get("startTimes", 1704384000)

    def set_question_start_times(self, start_times: int):
        self.data["question"]["startTimes"] = start_times

    def get_question_answer(self):
        answer_list = self.data.get("question", {}).get("answer", [])
        for answer in answer_list:
            yield answer


class UserCachaData:
    def __init__(self, data: {}):
        print(1)
