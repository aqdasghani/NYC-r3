import os
import subprocess
import markdown

md_path = r"C:\Users\sbhrn\.gemini\antigravity\brain\e98b1cc8-3ff6-4015-bcb8-45ce58f23e66\HACKATHON_10_PAGE_PPT_DECK.md"
html_path = r"C:\Users\sbhrn\.gemini\antigravity\scratch\greenshop-ai\ppt_deck.html"
pdf_desktop_path = r"C:\Users\sbhrn\Desktop\GreenQuant_AI_10_Slide_PPT_Deck.pdf"
pdf_artifact_path = r"C:\Users\sbhrn\.gemini\antigravity\brain\e98b1cc8-3ff6-4015-bcb8-45ce58f23e66\GreenQuant_AI_10_Slide_PPT_Deck.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'nl2br'])

html_document = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Green Quant AI — 10-Slide PPT Deck Content</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  @page {{
    size: A4 landscape;
    margin: 12mm 12mm 12mm 12mm;
  }}

  body {{
    font-family: 'Inter', sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #0f172a;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
  }}

  h1 {{
    font-size: 20pt;
    font-weight: 800;
    color: #063120;
    border-bottom: 2px solid #0FA958;
    padding-bottom: 4px;
    margin-top: 0;
  }}

  h2 {{
    font-size: 14pt;
    font-weight: 700;
    color: #063120;
    background-color: #f0fdf4;
    border-left: 5px solid #0FA958;
    padding: 6px 10px;
    margin-top: 20px;
    margin-bottom: 10px;
    page-break-before: always;
  }}

  h2:first-of-type {{
    page-break-before: avoid;
  }}

  h3 {{
    font-size: 11pt;
    font-weight: 600;
    color: #1e293b;
    margin-top: 10px;
    margin-bottom: 6px;
  }}

  p {{
    margin-top: 0;
    margin-bottom: 8px;
  }}

  blockquote {{
    background-color: #fffbe6;
    border-left: 4px solid #f59e0b;
    margin: 8px 0;
    padding: 8px 12px;
    font-style: italic;
    color: #92400e;
    border-radius: 4px;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 9.5pt;
  }}

  th {{
    background-color: #063120;
    color: #ffffff;
    padding: 6px 8px;
    text-align: left;
  }}

  td {{
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
  }}

  ul {{
    margin-top: 0;
    margin-bottom: 8px;
    padding-left: 18px;
  }}

  li {{
    margin-bottom: 3px;
  }}

  strong {{
    color: #0f172a;
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

edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
subprocess.run([edge_exe, "--headless", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={pdf_desktop_path}", html_path])
subprocess.run([edge_exe, "--headless", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={pdf_artifact_path}", html_path])
print("PPT PDF Generated successfully!")
