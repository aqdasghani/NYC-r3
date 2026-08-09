import json
import os

targets = ['behavior_engine.py', 'insight_engine.py', 'sustainability_engine.py', 'billing_engine.py']
for i in range(11):
    try:
        with open(f'dump_{i}.txt', encoding='utf-8') as f:
            data = json.load(f)
            for t in data.get('tool_calls', []):
                if t.get('name') == 'write_to_file':
                    args = t.get('arguments', {})
                    fname = os.path.basename(args.get('TargetFile', ''))
                    if fname in targets:
                        path = f'app/engines/{fname}'
                        with open(path, 'w', encoding='utf-8') as out:
                            out.write(args['CodeContent'])
                        print(f"Restored {fname}")
    except Exception as e:
        print(e)
