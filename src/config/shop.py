import config
import json

import user

_shop_path = f"{config.run_path}\\data\\shop\\tempGoodList.json"
_good_list: list
_temp_good_list_json: json

with open(_shop_path, encoding="utf-8") as file:
    _temp_good_list_json = json.load(file)
_good_list = _temp_good_list_json.get("goodList", {"goodList": []})


def get_good_list(pages: int) -> str:
    """
    获取商品详细列表，每页 3 个商品
    :param pages: 当前页数
    :return: 返回商品文本格式
    """
    content = "商城暂未开放，敬请期待..."
    list_num = len(_good_list)
    index_start = pages * 3

    number = list_num - index_start
    if number <= 0:  # 如果是负数。
        number = list_num

    print(f"number: {number}, list_num: {list_num}, index_start: {index_start}")
    for i in range(number):
        print(i, number)

        good_name = _good_list[i].get("goodName", "商品名称")
        price = _good_list[i].get("price", 99999)
        content = f"[{good_name}]×1 价格：" + f"{price}\n"
    """
    {
        'goodId': 'tempGoodList_1',
        'goodName': '铁剑',
        'item': {
            'id': 'weapon_iron_sword',
            'count': 1,
            'type': 'weapon'
        },
        'price': 100,
        'description': 'Restores 50 health points.'}
    """
    return content


def buy_item(item_name: str, quantity: int, user_data: user.UserData) -> str:
    if quantity <= 0:
        quantity = 1

    for item in _good_list:
        if item['goodName'] == item_name:
            if quantity > item['availCount']:
                return "购买失败，超过售卖数量。"
            price = item["price"] * quantity
            if user_data.add_gold(-price) == -1:
                return "购买失败，金币不足。"
            user_data.set_equipment_weapon(item["item"]["id"], item_name)
            return f"购买成功：\n获得：[{item_name}] × {quantity}，已装备。\n查看装备：/装备"
    return "购买失败，未能找到商品。"
