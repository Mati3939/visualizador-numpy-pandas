# Notebook 01 — NumPy básico: arrays, forma y reshape (contexto Control 1)
from nbkit import Notebook, VIZ

nb = Notebook(
    1, "numpy_basico", "NumPy básico: arrays, forma y reshape", "🧮",
    "crear arrays, entender `shape`, operar vectorizado y cambiar la forma con `reshape`.",
    [("numpy", "Arrays NumPy")],
    "## Contexto: vigilancia epidemiológica en el Biobío\n\n"
    "La SEREMI de Salud te pasó los casos semanales de una infección respiratoria "
    "en 4 comunas de la región. Tu misión: ordenar esos datos en arrays y sacar "
    "las primeras cifras — el mismo escenario del **Control 1** del curso.")

nb.md("## 0 · Preparación\n\nCorre esta celda primero (define los datos de todo el notebook).")
nb.code(
    "import numpy as np\n\n"
    "np.random.seed(42)  # mismos datos para todo el mundo\n"
    "COMUNAS = ['Concepción', 'Talcahuano', 'San Pedro', 'Hualpén']\n"
    "# casos notificados por día durante 4 semanas en Concepción (28 días)\n"
    "casos_conce = np.random.randint(5, 60, size=28)\n"
    "print(casos_conce)")

nb.md("## 1 · Calentamiento")

nb.ejercicio(
    "1.1 Tu primer array",
    "Crea el array `dias` con los números **1 a 28** (los días del mes epidemiológico) "
    "usando `np.arange`. Ojo con el extremo final.",
    "dias = ...   # TU CÓDIGO AQUÍ\n\nprint(dias)",
    "dias = np.arange(1, 29)\n\nprint(dias)",
    "assert dias.shape == (28,), f'shape esperada (28,), obtuviste {dias.shape}'\n"
    "assert dias[0] == 1 and dias[-1] == 28, 'debe ir de 1 a 28 inclusive'",
    pista="`np.arange(inicio, fin)` NO incluye `fin` — igual que los slices de Python.")

nb.ejercicio(
    "1.2 Estadísticas al vuelo",
    "Sin escribir ningún loop, calcula sobre `casos_conce`:\n"
    "- `total`: la suma de casos del mes\n"
    "- `promedio`: el promedio diario\n"
    "- `peor_dia`: el número del día (1 a 28) con MÁS casos",
    "total = ...      # TU CÓDIGO AQUÍ\npromedio = ...\npeor_dia = ...\n\n"
    "print(total, round(promedio, 1), peor_dia)",
    "total = casos_conce.sum()\npromedio = casos_conce.mean()\n"
    "peor_dia = casos_conce.argmax() + 1  # argmax da la POSICIÓN (parte de 0)\n\n"
    "print(total, round(promedio, 1), peor_dia)",
    "assert total == casos_conce.sum()\n"
    "assert abs(promedio - total / 28) < 1e-9\n"
    "assert casos_conce[peor_dia - 1] == casos_conce.max(), 'peor_dia debe ser 1..28, no 0..27'",
    pista="`argmax()` devuelve la posición del máximo, y las posiciones parten de 0…")

nb.md("## 2 · Núcleo: de vector a matriz\n\n"
      "Un vector de 28 días esconde la estructura semanal. `reshape` la revela — "
      f"míralo animado [aquí]({VIZ}#numpy?shape=4x3) antes de seguir.")

nb.ejercicio(
    "2.1 Semanas × días",
    "Convierte `casos_conce` (28 valores) en la matriz `semanal` de **4 filas** "
    "(semanas) × **7 columnas** (días). Luego imprime su `shape`.",
    "semanal = ...   # TU CÓDIGO AQUÍ\n\nprint(semanal.shape)\nprint(semanal)",
    "semanal = casos_conce.reshape(4, 7)\n\nprint(semanal.shape)\nprint(semanal)",
    "assert semanal.shape == (4, 7)\n"
    "assert (semanal.ravel() == casos_conce).all(), 'reshape no debe cambiar el orden de los datos'",
    nivel=1)

nb.ejercicio(
    "2.2 El reshape imposible",
    "Intenta hacer `casos_conce.reshape(5, 6)` dentro del `try` y guarda en "
    "`mensaje` el texto del error. ¿Por qué falla? Escríbelo en el comentario.",
    "mensaje = ''\ntry:\n    ...   # TU CÓDIGO AQUÍ\nexcept ValueError as e:\n"
    "    mensaje = str(e)\n\n# falla porque: <escribe aquí tu explicación>\nprint(mensaje)",
    "mensaje = ''\ntry:\n    casos_conce.reshape(5, 6)\nexcept ValueError as e:\n"
    "    mensaje = str(e)\n\n# falla porque 5×6 = 30 celdas y el array solo tiene 28:\n"
    "# reshape nunca inventa ni bota datos\nprint(mensaje)",
    "assert 'reshape' in mensaje and '28' in mensaje, 'el intento debe lanzar ValueError'",
    pista="5 × 6 = 30 ≠ 28. Prueba el botón «5 × 3 ✗» en el visualizador.", nivel=2)

nb.ejercicio(
    "2.3 Totales con axis",
    "Sobre `semanal` calcula:\n"
    "- `por_semana`: total de casos de cada semana (un valor por fila → 4 valores)\n"
    "- `por_dia_sem`: promedio de casos según día de la semana (7 valores)\n\n"
    "Recuerda: **axis es el eje que se recorre y desaparece**.",
    "por_semana = ...    # TU CÓDIGO AQUÍ\npor_dia_sem = ...\n\n"
    "print(por_semana)\nprint(por_dia_sem.round(1))",
    "por_semana = semanal.sum(axis=1)    # recorre columnas → queda un valor por fila\n"
    "por_dia_sem = semanal.mean(axis=0)  # recorre filas → un valor por columna\n\n"
    "print(por_semana)\nprint(por_dia_sem.round(1))",
    "assert por_semana.shape == (4,), 'una cifra por semana'\n"
    "assert por_dia_sem.shape == (7,), 'una cifra por día de la semana'\n"
    "assert por_semana.sum() == casos_conce.sum()",
    pista=f"Si dudas del axis, mira el barrido animado en {VIZ}#numpy (tarjeta «El famoso axis»).",
    nivel=2)

nb.md("## 3 · Las 4 comunas a la vez")
nb.code(
    "# matriz regional: 4 comunas (filas) × 28 días (columnas)\n"
    "np.random.seed(7)\n"
    "casos = np.vstack([casos_conce,\n"
    "                   np.random.randint(3, 45, size=(3, 28))])\n"
    "print(casos.shape)")

nb.ejercicio(
    "3.1 Ranking comunal",
    "Calcula `totales` (casos del mes por comuna) y usa `argmax` para obtener "
    "`comuna_critica`, el **nombre** de la comuna con más casos.",
    "totales = ...          # TU CÓDIGO AQUÍ\ncomuna_critica = ...\n\n"
    "print(dict(zip(COMUNAS, totales)))\nprint('crítica:', comuna_critica)",
    "totales = casos.sum(axis=1)\ncomuna_critica = COMUNAS[totales.argmax()]\n\n"
    "print(dict(zip(COMUNAS, totales)))\nprint('crítica:', comuna_critica)",
    "assert totales.shape == (4,)\n"
    "assert comuna_critica in COMUNAS, 'debe ser el NOMBRE, no el índice'\n"
    "assert totales[COMUNAS.index(comuna_critica)] == totales.max()",
    nivel=2)

nb.ejercicio(
    "3.2 Desafío: tasa por 100 mil habitantes 🏁",
    "Los totales brutos engañan: Concepción tiene mucha más población. "
    "Con `poblacion = np.array([223_351, 151_949, 131_674, 91_773])`, calcula "
    "`tasa`, los casos del mes **por cada 100 000 habitantes** de cada comuna, "
    "y `comuna_peor_tasa` (nombre). Todo vectorizado, sin loops.",
    "poblacion = np.array([223_351, 151_949, 131_674, 91_773])\n\n"
    "tasa = ...              # TU CÓDIGO AQUÍ\ncomuna_peor_tasa = ...\n\n"
    "print(dict(zip(COMUNAS, tasa.round(1))))\nprint('peor tasa:', comuna_peor_tasa)",
    "poblacion = np.array([223_351, 151_949, 131_674, 91_773])\n\n"
    "tasa = totales / poblacion * 100_000   # arrays del mismo largo: elemento a elemento\n"
    "comuna_peor_tasa = COMUNAS[tasa.argmax()]\n\n"
    "print(dict(zip(COMUNAS, tasa.round(1))))\nprint('peor tasa:', comuna_peor_tasa)",
    "assert tasa.shape == (4,)\n"
    "assert abs(tasa[0] - totales[0] / poblacion[0] * 100_000) < 1e-6\n"
    "assert comuna_peor_tasa in COMUNAS\n"
    "assert tasa[COMUNAS.index(comuna_peor_tasa)] == tasa.max()",
    pista="Dividir dos arrays del mismo largo opera posición por posición — "
          "no necesitas recorrer nada.", nivel=3)

nb.cierre("NumPy")
nb.save()
print("nb01 OK")
