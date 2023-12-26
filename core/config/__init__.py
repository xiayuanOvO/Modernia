import os
import sys

import yaml

if len(sys.argv) == 1:
    print("error: 未找到 run_path 参数")
    os.system("pause")
    sys.exit(0)

run_path = sys.argv[1]
config_path = f"{run_path}\\config\\config.yaml"
user_path = f"{run_path}\\data\\user\\all\\"

print(f"debug: run_path = {run_path}")

appid: str
token: str
secret: str

if os.path.isfile(config_path):  # 查找配置文件
    with open(f'{run_path}\\config\\config.yaml') as file:
        _config_json = yaml.load(file.read(), yaml.FullLoader)
    appid = _config_json.get("token", {"appid": ""}).get("appid", "")
    token = _config_json.get("token", {"token": ""}).get("token", "")
    secret = _config_json.get("token", {"secret": ""}).get("secret", "")
    del _config_json
else:
    print("未找到配置文件，将为您初始化配置文件...")
    appid = input("请输入 appid:")
    token = input("请输入 token:")
    secret = input("请输入 secret:")
    print("info: 正在初始化[config.yaml]")
    with open(config_path, "w+", encoding="utf-8") as file:
        file.write(
            "token:\n"
            f"  appid: \"{appid}\"\n"
            f"  token: \"{token}\"\n"
            f"  secret: \"{secret}\"\n"
        )
    print("配置文件生成完毕...")

if appid == "" or secret == "":
    pas = "appid" if appid == "" else "secret"

    print(f"error: 未配置 config.yaml 文件，缺少 token.{pas} 参数。")
    os.system("pause")
    sys.exit(0)
