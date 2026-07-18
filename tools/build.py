"""Genera dist/visualizador-topd.html: un único archivo autocontenido
(CSS y JS inlineados) listo para compartir con estudiantes o proyectar sin internet.

Uso:  python tools/build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")

def inline_css(m):
    css = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return f"<style>\n{css}\n</style>"

def inline_js(m):
    js = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return f"<script>\n{js}\n</script>"

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
html = re.sub(r'<script defer src="([^"]+)"></script>', inline_js, html)

# sin defer, los <script> inline corren en orden antes de DOMContentLoaded: mismo comportamiento
out = ROOT / "dist" / "visualizador-topd.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"OK -> {out} ({out.stat().st_size/1024:.0f} KB)")
