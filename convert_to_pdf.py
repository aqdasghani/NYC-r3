import os
import subprocess
import markdown

md_path = r"C:\Users\sbhrn\.gemini\antigravity\brain\e98b1cc8-3ff6-4015-bcb8-45ce58f23e66\HACKATHON_PITCH_AND_JUDGING_HANDBOOK.md"
html_path = r"C:\Users\sbhrn\.gemini\antigravity\scratch\greenshop-ai\handbook.html"
pdf_artifact_path = r"C:\Users\sbhrn\.gemini\antigravity\brain\e98b1cc8-3ff6-4015-bcb8-45ce58f23e66\GreenQuant_AI_Hackathon_Handbook.pdf"
pdf_desktop_path = r"C:\Users\sbhrn\Desktop\GreenQuant_AI_Hackathon_Handbook.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

# Convert markdown to html
html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'nl2br'])

html_document = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Green Quant AI — Hackathon Pitch & Judging Handbook</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  @page {{
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
    @bottom-right {{
      content: counter(page);
    }}
  }}

  * {{
    box-sizing: border-box;
  }}

  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #0f172a;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
  }}

  h1 {{
    font-size: 24pt;
    font-weight: 800;
    color: #063120;
    border-bottom: 3px solid #0FA958;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 16px;
    page-break-before: always;
  }}

  h1:first-of-type {{
    page-break-before: avoid;
  }}

  h2 {{
    font-size: 16pt;
    font-weight: 700;
    color: #063120;
    border-left: 4px solid #0FA958;
    padding-left: 10px;
    margin-top: 24px;
    margin-bottom: 12px;
    page-break-after: avoid;
  }}

  h3 {{
    font-size: 13pt;
    font-weight: 600;
    color: #1e293b;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }}

  h4 {{
    font-size: 11pt;
    font-weight: 700;
    color: #0FA958;
    margin-top: 14px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }}

  p {{
    margin-top: 0;
    margin-bottom: 10px;
  }}

  blockquote {{
    background-color: #f0fdf4;
    border-left: 4px solid #0FA958;
    margin: 12px 0;
    padding: 10px 14px;
    font-style: italic;
    color: #166534;
    border-radius: 0 6px 6px 0;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }}

  th {{
    background-color: #063120;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #063120;
  }}

  td {{
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }}

  tr:nth-child(even) {{
    background-color: #f8fafc;
  }}

  code {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5pt;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
  }}

  pre {{
    background-color: #0f172a;
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.45;
    page-break-inside: avoid;
  }}

  pre code {{
    background-color: transparent;
    color: inherit;
    padding: 0;
  }}

  ul, ol {{
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 20px;
  }}

  li {{
    margin-bottom: 4px;
  }}

  strong {{
    color: #0f172a;
    font-weight: 700;
  }}

  .qa-block {{
    page-break-inside: avoid;
    margin-bottom: 12px;
  }}
</style>
</head>
<body>
{html_body}
</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_document)

print("HTML generated successfully!")

# Convert HTML to PDF using MS Edge headless
edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_desktop_path}",
    html_path
]

result = subprocess.run(cmd, capture_output=True, text=True)
print("Desktop PDF Result:", result.returncode)

cmd2 = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_artifact_path}",
    html_path
]

result2 = subprocess.run(cmd2, capture_output=True, text=True)
print("Artifact PDF Result:", result2.returncode)
