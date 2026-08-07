"""Genera dist/visualizador-topd.html: un único archivo autocontenido
(CSS y JS inlineados) listo para compartir con estudiantes o proyectar sin internet.

Uso:  python tools/build.py           genera el archivo
      python tools/build.py --check   solo avisa si dist/ quedó desactualizado
                                      (sale con código 1 si hay que regenerarlo)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "visualizador-topd.html"


def construir() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def inline(m, etiqueta):
        ruta = ROOT / m.group(1)
        texto = ruta.read_text(encoding="utf-8")
        # un </script> dentro de un string rompería el bundle en silencio
        if etiqueta == "script" and "</script" in texto.lower():
            raise SystemExit(f"ERROR: {ruta} contiene '</script' y rompería el archivo único")
        return f"<{etiqueta}>\n{texto}\n</{etiqueta}>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: inline(m, "style"), html)
    html = re.sub(r'<script defer src="([^"]+)"></script>', lambda m: inline(m, "script"), html)
    # sin defer, los <script> inline corren en orden antes de DOMContentLoaded: mismo comportamiento
    return html


html = construir()

if "--check" in sys.argv:
    actual = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    if actual == html:
        print(f"OK -> {OUT.name} está al día")
    else:
        print(f"DESACTUALIZADO -> corre 'python tools/build.py' antes de commitear")
        sys.exit(1)
else:
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"OK -> {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
