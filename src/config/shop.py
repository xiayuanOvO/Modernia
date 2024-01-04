import json
from internal import base
from user import UserData


class TempGoodList:
    good_list = {}
    temp_good_list_json: json

    def read_config(self):
        with open(base.PATH_TEMP_GOOD_LIST, encoding="utf-8") as file:
            self.temp_good_list_json = json.load(file)
        self.good_list = self.temp_good_list_json.get("goodList", [])

    def get_good_list(self, pages: int) -> str:
        """
        获取商品详细列表，每页 3 个商品
        :param pages: 当前页数
        :return: 返回商品文本格式
        """
        content = "商城暂未开放，敬请期待..."
        list_num = len(self.good_list)
        index_start = pages * 3

        number = list_num - index_start
        if number <= 0:  # 如果是负数。
            number = list_num

        # print(f"number: {number}, list_num: {list_num}, index_start: {index_start}")
        for i in range(number):
            good_name = self.good_list[i].get("goodName", "商品名称")
            price = self.good_list[i].get("price", 99999)
            content = f"[{good_name}]×1 价格：" + f"{price}\n"
        return content

    def buy_item(self, item_name: str, quantity: int, user_data: UserData) -> str:
        if quantity <= 0:
            quantity = 1

        for item in self.good_list:
            if item['goodName'] == item_name:
                if quantity > item['availCount']:
                    return "购买失败，超过售卖数量。"
                price = item["price"] * quantity
                if user_data.add_gold(-price) == -1:
                    return "购买失败，金币不足。"
                user_data.set_equipment_weapon(item["item"]["id"], item_name)
                return f"购买成功：\n获得：[{item_name}] × {quantity}，已装备。\n查看装备：/装备"
        return "购买失败，未能找到商品。"


temp_good_list = TempGoodList()
