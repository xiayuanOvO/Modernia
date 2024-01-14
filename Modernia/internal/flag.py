import os
import sys

from internal import base
from utils import conf


def init():
    # 判断运行环境，获取程序当前运行目录
    if getattr(sys, 'frozen', False):
        base.PATH_RUN = os.path.dirname(sys.executable)
    else:
        if len(sys.argv) == 1:
            base.PATH_RUN = sys.path[0]
        else:
            base.PATH_RUN = sys.argv[1]

    base.PATH_CONFIG = os.path.join(base.PATH_RUN, "config", "config.yml")
    base.PATH_GAME_CONF = os.path.join(base.PATH_RUN, "config", "game.yml")
    base.PATH_USER = os.path.join(base.PATH_RUN, "data", "USER", "all")
    base.PATH_TEMP_GOOD_LIST = os.path.join(base.PATH_RUN, "data", "shop", "tempGoodList.json")
    base.PATH_ARENA_RANKINGS = os.path.join(base.PATH_RUN, "data", "arena", "all", "rankings.json")
    base.PATH_GACHA_TABLE = os.path.join(base.PATH_RUN, "data", "excel", "gacha_table.json")

    base.PATH_ANSWER_DATA = os.path.join(base.PATH_RUN, "data", "excel", "answer_data.json")
    base.PATH_ANSWER_TABLE = os.path.join(base.PATH_RUN, "data", "excel", "answer_table.json")

    conf.create_directory()

    if not os.path.isfile(base.PATH_CONFIG):
        conf.generate_config()
        print(r"未找到配置文件，已为你生成初始化配置文件，请前往 config\config.yml 配置")
        os.system("pause")
        sys.exit(0)

    if not os.path.isfile(base.PATH_GAME_CONF):
        conf.generate_game_conf()

    if not os.path.isfile(base.PATH_TEMP_GOOD_LIST):
        conf.generate_temp_good_list()

    if not os.path.isfile(base.PATH_GACHA_TABLE):
        conf.generate_gacha_table()

    conf.load_all_filedata()
