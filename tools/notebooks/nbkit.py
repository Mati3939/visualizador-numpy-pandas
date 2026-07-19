# nbkit — framework de la batería de notebooks del Visualizador TOPD.
# Una sola fuente (nbNN.py) genera el notebook del estudiante (con huecos
# "TU CÓDIGO AQUÍ" + celdas de autochequeo) y su solución en soluciones/.
# Regenerar todo: python tools/notebooks/build_all.py
import json
import itertools
from pathlib import Path

_ids = itertools.count(1)

VIZ = "https://mati3939.github.io/visualizador-numpy-pandas/"
GH = "Mati3939/visualizador-numpy-pandas"
OUT = Path(__file__).resolve().parents[2] / "notebooks"


def _cell(tipo, src):
    c = {"cell_type": tipo, "id": f"c{next(_ids):03d}", "metadata": {},
         "source": src.splitlines(keepends=True)}
    if tipo == "code":
        c["outputs"] = []
        c["execution_count"] = None
    return c


class Notebook:
    """Acumula celdas en paralelo para la versión estudiante y la solución."""

    def __init__(self, num, slug, titulo, emoji, objetivos, modulos, contexto):
        self.num, self.slug = num, slug
        self.filename = f"{num:02d}_{slug}.ipynb"
        self.est, self.sol = [], []
        colab = (f"https://colab.research.google.com/github/{GH}/blob/main/"
                 f"notebooks/{self.filename}")
        colab_sol = colab.replace("notebooks/", "notebooks/soluciones/").replace(
            ".ipynb", "_solucion.ipynb")
        links = " · ".join(
            f"[{nombre}]({VIZ}#{h})" for h, nombre in modulos)
        for cells, badge, extra in ((self.est, colab, ""), (self.sol, colab_sol,
                                    " — **SOLUCIÓN**")):
            cells.append(_cell("markdown",
                f"# {emoji} {titulo}{extra}\n\n"
                f"**Taller de Obtención y Preparación de Datos** · batería de práctica "
                f"del [Visualizador TOPD]({VIZ})\n\n"
                f"[![Abrir en Colab](https://colab.research.google.com/assets/colab-badge.svg)]({badge})\n\n"
                f"**Objetivos:** {objetivos}\n\n"
                f"🔎 **Apóyate en el visualizador:** {links} — ten la pestaña abierta "
                f"mientras resuelves; cada concepto de aquí está animado allá.\n\n---\n\n{contexto}"))

    # --- celdas idénticas en ambas versiones ---
    def md(self, texto):
        self.est.append(_cell("markdown", texto))
        self.sol.append(_cell("markdown", texto))

    def code(self, codigo):
        self.est.append(_cell("code", codigo))
        self.sol.append(_cell("code", codigo))

    # --- ejercicio con hueco + autochequeo ---
    def ejercicio(self, titulo, enunciado, scaffold, solucion, check,
                  pista=None, nivel=1):
        estrellas = "⭐" * nivel
        cuerpo = f"### {titulo} {estrellas}\n\n{enunciado}"
        if pista:
            cuerpo += (f"\n\n<details><summary>💡 Pista (haz clic)</summary>\n\n"
                       f"{pista}\n\n</details>")
        self.md(cuerpo)
        self.est.append(_cell("code", scaffold))
        self.sol.append(_cell("code", solucion))
        if check:
            chk = ("# ✅ AUTOCHEQUEO — corre esta celda: si no reclama, vas bien\n"
                   + check + "\nprint('✅ ¡Correcto!')")
            self.est.append(_cell("code", chk))
            self.sol.append(_cell("code", chk))

    def cierre(self, tema):
        self.md(
            "---\n\n## 🎯 Chequea tu intuición\n\n"
            f"Antes de cerrar, abre el visualizador y en el botón **🎯 Ejercicios** "
            f"corre una ronda de [Predice la salida]({VIZ}#predice) y "
            f"[Detective de bugs]({VIZ}#detective) filtrando por **{tema}**. "
            f"Si un error de Python te deja pegado, pégalo en el "
            f"[Traductor de errores]({VIZ}#traductor).")

    def save(self):
        OUT.mkdir(exist_ok=True)
        (OUT / "soluciones").mkdir(exist_ok=True)
        base = {"nbformat": 4, "nbformat_minor": 5,
                "metadata": {"kernelspec": {"display_name": "Python 3",
                                            "language": "python",
                                            "name": "python3"},
                             "language_info": {"name": "python"}}}
        est = dict(base, cells=self.est)
        sol = dict(base, cells=self.sol)
        p1 = OUT / self.filename
        p2 = OUT / "soluciones" / self.filename.replace(".ipynb", "_solucion.ipynb")
        p1.write_text(json.dumps(est, ensure_ascii=False, indent=1), encoding="utf-8")
        p2.write_text(json.dumps(sol, ensure_ascii=False, indent=1), encoding="utf-8")
        return p1, p2
