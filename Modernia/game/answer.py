import json
import random

from internal import base


def get_question():
    with open(base.PATH_ANSWER_TABLE, "r", encoding="utf-8") as file:
        data = json.load(file)
    answer_list = data.get("answer_List", [])
    answer_list_len = len(answer_list) - 1
    if answer_list_len == -1:
        return
    answer_number = random.randint(0, answer_list_len)
    answer = Answer(answer_list[answer_number])
    return answer


class Answer:
    def __init__(self, data: {}):
        self.question = data.get("question", "")
        self.answer = data.get("answer", [])
