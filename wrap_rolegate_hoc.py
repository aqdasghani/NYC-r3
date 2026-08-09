import os
import re

pages = [
    ('app/dashboard/briefing/page.tsx', 'analytics'),
    ('app/dashboard/reports/page.tsx', 'reports'),
    ('app/dashboard/settings/page.tsx', 'settings'),
    ('app/dashboard/procurement/page.tsx', 'procurement'),
    ('app/dashboard/suppliers/page.tsx', 'suppliers'),
    ('app/dashboard/transfers/page.tsx', 'transfers'),
    ('app/dashboard/sustainability/page.tsx', 'sustainability'),
    ('app/dashboard/ai-intelligence/page.tsx', 'ai'),
    ('app/dashboard/returns/page.tsx', 'returns')
]

for filepath, module in pages:
    if not os.path.exists(filepath):
        print(f'Missing {filepath}')
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'RoleGate' in content:
        print(f'Already has RoleGate: {filepath}')
        continue
    
    import_stmt = "import RoleGate from '@/components/layout/RoleGate';\n"
    
    if "'use client';" in content:
        content = content.replace("'use client';", "'use client';\n" + import_stmt)
    elif '"use client";' in content:
        content = content.replace('"use client";', '"use client";\n' + import_stmt)
    else:
        content = import_stmt + content
        
    # Find `export default function SomeName(`
    match = re.search(r'export default function\s+([A-Za-z0-9_]+)\s*\(', content)
    if not match:
        print(f"Could not find default export in {filepath}")
        continue
        
    func_name = match.group(1)
    new_func_name = func_name + "Content"
    
    # Replace `export default function Name` with `function NameContent`
    content = content.replace(f"export default function {func_name}", f"function {new_func_name}")
    
    # Append the wrapper at the end of the file
    wrapper = f"\n\nexport default function {func_name}() {{\n  return (\n    <RoleGate module=\"{module}\">\n      <{new_func_name} />\n    </RoleGate>\n  );\n}}\n"
    content += wrapper
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath} with HOC")
