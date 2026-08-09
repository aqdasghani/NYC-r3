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
        
    # Replace the main return block. Wait, some files might just return a single element.
    # A safer way using regex to find `return (` and `)` matching for the default function.
    # Actually, simpler: finding the `export default function` block, and wrapping its return.
    # For Next.js page files, the outer return usually starts with `return (` or `return <...>` 
    # Let's just do a regex replace for the outermost `return (` or `return <`
    
    # We can use regex or just string splitting, but these pages typically have a straightforward `return (...)`
    # Let's search for the first `return (` inside `export default function`
    
    def_idx = content.find('export default function')
    if def_idx == -1:
        print(f"Could not find default export in {filepath}")
        continue
        
    ret_idx = content.find('return (', def_idx)
    if ret_idx != -1:
        prefix = content[:ret_idx + 8]
        suffix = content[ret_idx + 8:]
        # we need to close the RoleGate at the very end. The page.tsx usually ends with `  );\n}`
        # Let's replace the last `);` before `}` with `</RoleGate>);`
        
        # let's just insert `<RoleGate module="{module}">` after `return (`
        # and insert `</RoleGate>` before the last `);`
        
        last_paren_idx = content.rfind(');')
        if last_paren_idx != -1:
            new_content = (
                content[:ret_idx + 8] +
                f"\n    <RoleGate module=\"{module}\">\n" +
                content[ret_idx + 8:last_paren_idx] +
                f"\n    </RoleGate>\n" +
                content[last_paren_idx:]
            )
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
        else:
            print(f"Could not find ending ');' in {filepath}")
    else:
        print(f"Could not find 'return (' in {filepath}")
