import json
from user import UserData
import config


class ArenaRankings:
    user_data: UserData
    data_json = {}

    def __init__(self):
        self.read_data()

    def read_data(self):
        with open(config.arena_rankings_data) as f:
            self.data_json = json.load(f)

    def save_data(self):
        with open(f"config.run_path", "w", encoding="utf-8") as f:
            json.dump(self.user_data, f, ensure_ascii=False)

    def get_arena_rankings_info(self):
        pass


rankings = ArenaRankings()
