from internal import flag
from utils import terminal
from config import config
import event

if __name__ == '__main__':
    terminal.set_title()
    terminal.welcome()
    flag.init()

    appid, secret, _ = config.get_bot_config()
    event.run(appid, secret)
