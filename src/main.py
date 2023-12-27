import os
import sys

import event
import utils
import config

if __name__ == '__main__':
    if not os.path.isfile(config.config):
        utils.create_file()
        print(r"未找到配置文件，已为你生成初始化配置文件，请前往 config\config.yaml 配置")
        os.system("pause")
        sys.exit(0)

    appid, secret, _ = config.get_bot_info()
    event.run(appid, secret)
