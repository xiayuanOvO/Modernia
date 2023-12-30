import os
import sys

import event
from config.game import game_config
from config.shop import temp_good_list
from utils import terminal, file_conf
import config

if __name__ == '__main__':
    if not os.path.isfile(config.CONFIG):
        file_conf.create_file()
        print(r"未找到配置文件，已为你生成初始化配置文件，请前往 config\config.yml 配置")
        os.system("pause")
        sys.exit(0)
    print("欢迎使用Modernia。")
    print("在此推荐启动本程序时，使用start.bat，防止bug导致闪退。")
    game_config.load_data()
    temp_good_list.load_data()
    # GACHA.load()
    terminal.set_title()

    appid, secret, _ = config.get_bot_info()
    event.run(appid, secret)
