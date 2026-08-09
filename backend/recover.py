import json
import os

log_file = r'C:\Users\sbhrn\.gemini\antigravity\brain\e98b1cc8-3ff6-4015-bcb8-45ce58f23e66\.system_generated\logs\transcript.jsonl'
targets = ['behavior_engine.py', 'insight_engine.py', 'sustainability_engine.py', 'billing_engine.py']

# We want the LAST write for each file.
files_content = {}
with open(log_file, encoding='utf-8') as f:
    for line in f:
        if '"CodeContent"' in line and 'write_to_file' in line:
            try:
                data = json.loads(line)
                args = data.get('tool_calls', [{}])[0].get('arguments', {})
                if 'TargetFile' in args and 'CodeContent' in args:
                    filename = os.path.basename(args['TargetFile'])
                    if filename in targets:
                        files_content[filename] = args['CodeContent']
            except Exception as e:
                pass

for filename, content in files_content.items():
    path = f'app/engines/{filename}'
    with open(path, 'w', encoding='utf-8') as out:
        out.write(content)
    print(f"Restored {filename}")
