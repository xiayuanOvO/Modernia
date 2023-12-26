import json

text = """
{
    
}"""

j = json.loads(text)

print(j.get("a", {}).get("b", 0))
