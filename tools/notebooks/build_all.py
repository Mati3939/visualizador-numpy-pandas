# Regenera toda la batería y VALIDA ejecutando cada solución de punta a punta.
# Uso: python tools/notebooks/build_all.py [nb01 nb02 ...]  (sin args = todos)
import sys, subprocess, json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
OUT = AQUI.parents[1] / "notebooks"

mods = sys.argv[1:] or sorted(p.stem for p in AQUI.glob("nb[0-9][0-9].py"))
fallas = []
for m in mods:
    r = subprocess.run([sys.executable, str(AQUI / f"{m}.py")], cwd=AQUI,
                       capture_output=True, text=True)
    if r.returncode:
        fallas.append((m, "GENERACIÓN", r.stderr.strip()[-800:]))
        continue
    # ejecutar la solución completa: si un assert o import falla, se reporta
    num = m[2:]
    sol = next((OUT / "soluciones").glob(f"{num}_*_solucion.ipynb"))
    try:
        import nbformat
        from nbclient import NotebookClient
        nbk = nbformat.read(sol, as_version=4)
        NotebookClient(nbk, timeout=120, kernel_name="python3").execute()
        print(f"✅ {m}: generado y solución ejecuta completa ({sol.name})")
    except Exception as e:
        fallas.append((m, "EJECUCIÓN", str(e)[-1200:]))

if fallas:
    print("\n════ FALLAS ════")
    for m, fase, err in fallas:
        print(f"\n✘ {m} [{fase}]\n{err}")
    sys.exit(1)
print(f"\nTodo OK: {len(mods)} notebook(s).")
