"""Build a printable HTML version of PROJECT_REPORT.md.

Usage:
    python build_report.py

Then open PROJECT_REPORT.html in a browser and print to PDF
(Ctrl+P -> Destination: Save as PDF).

The university logo at assets/uok-logo.png is embedded directly into the HTML
as a data URI, so the generated file is self-contained and prints correctly
even when moved to another machine.
"""

import base64
import io
import os
import re

import markdown

REPORT_MD = "PROJECT_REPORT.md"
REPORT_HTML = "PROJECT_REPORT.html"
LOGO_PATH = os.path.join("assets", "uok-logo.png")


def embed_logo(html: str) -> str:
    """Replace the logo <img src> with an inline data URI."""
    if not os.path.exists(LOGO_PATH):
        print(f"WARNING: {LOGO_PATH} not found - title page will have no logo.")
        # Drop the broken image entirely rather than showing a broken icon.
        return re.sub(r'<img[^>]*uok-logo\.png[^>]*>', '', html)

    with open(LOGO_PATH, "rb") as handle:
        encoded = base64.b64encode(handle.read()).decode("ascii")

    suffix = os.path.splitext(LOGO_PATH)[1].lower()
    mime = "image/svg+xml" if suffix == ".svg" else f"image/{suffix.lstrip('.')}"
    if mime == "image/jpg":
        mime = "image/jpeg"

    size_kb = len(encoded) / 1024
    print(f"Embedded logo: {LOGO_PATH} ({size_kb:.0f} KB base64)")
    return html.replace(f'src="{LOGO_PATH.replace(os.sep, "/")}"',
                        f'src="data:{mime};base64,{encoded}"')


CSS = """
  @page { size: A4; margin: 20mm 18mm; }

  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt; line-height: 1.55; color: #111;
    max-width: 820px; margin: 0 auto; padding: 24px;
  }

  /* ---- Title page ---------------------------------------------------- */
  .title-page {
    text-align: center;
    page-break-after: always;
    padding-top: 8mm;
  }
  .title-page .uok-logo {
    width: 135px; height: auto;
    margin: 0 auto 14px;
    display: block;
  }
  .title-page h1 { font-size: 26pt; border: none; margin: 8px 0; }
  .title-page h2 { font-size: 17pt; border: none; margin: 18px 0 8px; }
  .title-page h3 { font-size: 13pt; margin: 6px 0; font-weight: normal; }
  .title-page p  { text-align: center; margin: 6px 0; }
  .title-page hr { width: 60%; margin: 18px auto; }
  .title-page table {
    width: 78%; margin: 12px auto 20px; font-size: 10.5pt;
  }
  .title-page table th, .title-page table td { text-align: left; }

  /* ---- Body ---------------------------------------------------------- */
  h1 { font-size: 20pt; margin: 0 0 6px; line-height: 1.25; }
  h2 { font-size: 14pt; margin: 26px 0 10px; padding-bottom: 5px;
       border-bottom: 1.5px solid #333; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 18px 0 8px; page-break-after: avoid; }
  h4 { font-size: 11pt; margin: 14px 0 6px; }
  p  { margin: 0 0 10px; text-align: justify; }

  table { border-collapse: collapse; width: 100%; margin: 12px 0 16px;
          font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #bbb; padding: 6px 9px; text-align: left;
           vertical-align: top; }
  th { background: #eee; font-weight: bold; }
  tr:nth-child(even) td { background: #fafafa; }
  .title-page table, .title-page th, .title-page td { border-color: #ccc; }

  code { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt;
         background: #f4f4f4; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f7f7f7; border: 1px solid #ddd; border-left: 3px solid #666;
        padding: 10px 12px; overflow-x: auto; font-size: 9pt; line-height: 1.4;
        page-break-inside: avoid; }
  pre code { background: none; padding: 0; }

  blockquote { border-left: 3px solid #999; margin: 12px 0; padding: 4px 16px;
               color: #333; font-style: italic; }
  ul, ol { margin: 0 0 10px; padding-left: 26px; }
  li { margin-bottom: 5px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 22px 0; }
  a { color: #14418b; text-decoration: none; word-break: break-word; }
  strong { font-weight: bold; }

  @media print {
    body { padding: 0; max-width: none; }
    a { color: #000; }
    h2 { page-break-after: avoid; }
  }
"""


def main() -> None:
    md_text = io.open(REPORT_MD, encoding="utf-8").read()

    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "md_in_html"],
    )
    body = embed_logo(body)

    html = (
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        "<title>YELO Project Report - University of Karachi</title>\n"
        f"<style>{CSS}</style>\n</head>\n<body>\n{body}\n</body>\n</html>\n"
    )

    io.open(REPORT_HTML, "w", encoding="utf-8", newline="\n").write(html)
    size_kb = os.path.getsize(REPORT_HTML) / 1024
    print(f"Wrote {REPORT_HTML} ({size_kb:.0f} KB)")
    print("Open it in a browser and press Ctrl+P -> Save as PDF.")


if __name__ == "__main__":
    main()
