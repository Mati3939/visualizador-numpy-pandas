# Notebook 05 — Matplotlib: tu primer gráfico bien hecho (contexto Control 5)
from nbkit import Notebook, VIZ

nb = Notebook(
    5, "visualizacion", "Matplotlib: tu primer gráfico bien hecho", "📈",
    "usar la interfaz orientada a objetos (`fig, ax = plt.subplots()`) para armar "
    "histogramas, líneas, barras y scatter — siempre con título y etiquetas.",
    [("viz", "Visualización")],
    "## Contexto: turismo aventura con SERNATUR\n\n"
    "Analizas la temporada de una operadora de turismo aventura de la región: "
    "trekking, kayak, cabalgatas y rafting. Gerencia no quiere números sueltos, "
    "quiere GRÁFICOS — el mismo escenario del **Control 5** del curso.")

nb.md("## 0 · Preparación\n\n"
      "Ojo con el orden: `matplotlib.use('Agg')` va ANTES de importar `pyplot` "
      "(fija un backend sin ventana, para que el notebook corra en cualquier parte).")
nb.code(
    "import matplotlib\n"
    "matplotlib.use('Agg')\n"
    "import matplotlib.pyplot as plt\n"
    "import numpy as np\nimport pandas as pd\n\n"
    "rng = np.random.default_rng(5)\n"
    "n = 200\n"
    "ACTIVIDADES = ['Trekking', 'Kayak', 'Cabalgata', 'Rafting', 'Buceo']\n"
    "tours = pd.DataFrame({\n"
    "    'actividad': rng.choice(ACTIVIDADES, n, p=[.35, .2, .2, .15, .1]),\n"
    "    'precio': rng.integers(15_000, 120_000, n),      # CLP\n"
    "    'duracion_dias': rng.integers(1, 8, n),\n"
    "    'mes': rng.integers(1, 13, n),\n"
    "})\n"
    "tours.head()")

nb.md("## 1 · Calentamiento")

nb.ejercicio(
    "1.1 Histograma de precios",
    "Con la interfaz orientada a objetos (`fig, ax = plt.subplots()`), arma un "
    "histograma de `tours['precio']` con `ax.hist(...)`. Ponle título con "
    "`ax.set_title(...)` y etiquetas con `ax.set_xlabel(...)` / `ax.set_ylabel(...)` "
    "— sin esto el autochequeo no pasa.",
    "fig, ax = plt.subplots()\n"
    "...   # TU CÓDIGO AQUÍ: ax.hist(...), set_title, set_xlabel, set_ylabel\n\n"
    "print(ax.get_title())",
    "fig, ax = plt.subplots()\n"
    "ax.hist(tours['precio'], bins=20, color='#4C72B0')\n"
    "ax.set_title('Distribución de precios de los tours')\n"
    "ax.set_xlabel('Precio (CLP)')\n"
    "ax.set_ylabel('Cantidad de tours')\n\n"
    "print(ax.get_title())",
    "assert len(ax.patches) > 0, 'ax.hist debe dibujar al menos una barra'\n"
    "assert ax.get_xlabel() != '' and ax.get_ylabel() != '', 'faltan las etiquetas de los ejes'\n"
    "assert ax.get_title() != '', 'falta el título'",
    pista="`ax.hist(datos, bins=20)` — el resto son solo los métodos `set_*` del "
          "eje `ax`, no de `plt`.")

nb.ejercicio(
    "1.2 ¿Cuál actividad se vende más?",
    "Cuenta las ventas por `actividad` con `.value_counts()` en `conteo` (queda "
    "ordenado de mayor a menor solito). Luego grafica barras HORIZONTALES "
    "(`ax.barh`) con ese orden, título y etiquetas.",
    "conteo = ...   # TU CÓDIGO AQUÍ\n\n"
    "fig, ax = plt.subplots()\n"
    "...   # ax.barh(...), set_title, set_xlabel, set_ylabel\n\n"
    "print(conteo)",
    "conteo = tours['actividad'].value_counts()  # ya viene ordenado de mayor a menor\n\n"
    "fig, ax = plt.subplots()\n"
    "ax.barh(conteo.index, conteo.values, color='#55A868')\n"
    "ax.set_title('Tours vendidos por actividad')\n"
    "ax.set_xlabel('Cantidad de tours')\n"
    "ax.set_ylabel('Actividad')\n\n"
    "print(conteo)",
    "assert list(conteo.values) == sorted(conteo.values, reverse=True), 'value_counts ya ordena de mayor a menor'\n"
    "assert len(ax.patches) == len(conteo)\n"
    "anchos = [p.get_width() for p in ax.patches]\n"
    "assert anchos == list(conteo.values), 'las barras deben dibujarse en el mismo orden que conteo'\n"
    "assert ax.get_xlabel() != '' and ax.get_ylabel() != '' and ax.get_title() != ''",
    pista="`value_counts()` sin argumentos YA ordena de mayor a menor — no necesitas "
          "`sort_values` aparte.")

nb.md("## 2 · Núcleo")

nb.ejercicio(
    "2.1 Evolución mensual (primero los datos, después el gráfico)",
    "Antes de graficar hay que agregar: cuenta cuántos tours se vendieron por "
    "`mes` con `.groupby('mes').size()` en `evolucion` (queda ordenado por mes, "
    "de enero a diciembre). Luego grafica una LÍNEA (`ax.plot`) con marcador "
    "`marker='o'`, título y etiquetas.",
    "evolucion = ...   # TU CÓDIGO AQUÍ\n\n"
    "fig, ax = plt.subplots()\n"
    "...   # ax.plot(evolucion.index, evolucion.values, marker='o'), set_title, etiquetas\n\n"
    "print(evolucion)",
    "evolucion = tours.groupby('mes').size()  # groupby ordena las llaves ascendente: mes 1..12\n\n"
    "fig, ax = plt.subplots()\n"
    "ax.plot(evolucion.index, evolucion.values, marker='o', color='#C44E52')\n"
    "ax.set_title('Tours vendidos por mes')\n"
    "ax.set_xlabel('Mes')\n"
    "ax.set_ylabel('Cantidad de tours')\n\n"
    "print(evolucion)",
    "assert evolucion.sum() == len(tours), 'la suma de todos los meses debe dar el total de tours'\n"
    "assert list(evolucion.index) == sorted(evolucion.index), 'groupby debe entregar los meses en orden'\n"
    "assert len(ax.lines) == 1, 'debe haber una sola línea dibujada'\n"
    "assert ax.get_xlabel() != '' and ax.get_ylabel() != '' and ax.get_title() != ''",
    pista="`groupby('mes').size()` cuenta FILAS por grupo (no requiere elegir una "
          "columna) y entrega los meses ya ordenados de forma ascendente.",
    nivel=2)

nb.ejercicio(
    "2.2 Precio vs duración",
    "Arma un scatter (`ax.scatter`) de `duracion_dias` (eje X) contra `precio` "
    "(eje Y), con `alpha=0.4` para que se noten las zonas más densas. Título y "
    "etiquetas obligatorios.",
    "fig, ax = plt.subplots()\n"
    "...   # TU CÓDIGO AQUÍ: ax.scatter(..., alpha=0.4), set_title, etiquetas\n\n"
    "print(ax.get_title())",
    "fig, ax = plt.subplots()\n"
    "ax.scatter(tours['duracion_dias'], tours['precio'], alpha=0.4, color='#8172B2')\n"
    "ax.set_title('Precio según duración del tour')\n"
    "ax.set_xlabel('Duración (días)')\n"
    "ax.set_ylabel('Precio (CLP)')\n\n"
    "print(ax.get_title())",
    "assert len(ax.collections) >= 1, 'ax.scatter debe agregar una colección de puntos'\n"
    "assert ax.collections[0].get_alpha() == 0.4, 'usa alpha=0.4 para ver la densidad'\n"
    "assert ax.get_xlabel() != '' and ax.get_ylabel() != '' and ax.get_title() != ''",
    pista="`ax.scatter(x, y, alpha=0.4)` — el `alpha` se queda guardado en la "
          "colección de puntos, por eso el chequeo lo puede leer de vuelta.",
    nivel=2)

nb.ejercicio(
    "2.3 Precio promedio por actividad, de mayor a menor",
    "Calcula `precio_prom`: el precio PROMEDIO por `actividad`, ordenado de mayor "
    "a menor (`sort_values`). Grafica barras VERTICALES (`ax.bar`) con ese orden, "
    "título y etiquetas.",
    "precio_prom = ...   # TU CÓDIGO AQUÍ\n\n"
    "fig, ax = plt.subplots()\n"
    "...   # ax.bar(...), set_title, etiquetas\n\n"
    "print(precio_prom)",
    "precio_prom = tours.groupby('actividad')['precio'].mean().sort_values(ascending=False)\n\n"
    "fig, ax = plt.subplots()\n"
    "ax.bar(precio_prom.index, precio_prom.values, color='#CCB974')\n"
    "ax.set_title('Precio promedio por actividad')\n"
    "ax.set_xlabel('Actividad')\n"
    "ax.set_ylabel('Precio promedio (CLP)')\n\n"
    "print(precio_prom)",
    "assert list(precio_prom.values) == sorted(precio_prom.values, reverse=True)\n"
    "assert len(ax.patches) == len(precio_prom)\n"
    "alturas = [p.get_height() for p in ax.patches]\n"
    "assert alturas == list(precio_prom.values), 'las barras deben ir en el mismo orden que precio_prom'\n"
    "assert ax.get_xlabel() != '' and ax.get_ylabel() != '' and ax.get_title() != ''",
    pista="`groupby(...).mean()` agrega, `sort_values(ascending=False)` ordena — "
          "el gráfico solo necesita seguir el orden que ya trae la Serie.",
    nivel=2)

nb.md("## 3 · Desafío 🏁")

nb.ejercicio(
    "3.1 Dos gráficos, una figura",
    "Arma una sola figura con DOS subplots lado a lado (`fig, axs = "
    "plt.subplots(1, 2, figsize=(10, 4))`): a la izquierda (`axs[0]`) el "
    "histograma de precios, a la derecha (`axs[1]`) el scatter de precio vs "
    "duración. Título y etiquetas en AMBOS ejes.",
    "fig, axs = plt.subplots(1, 2, figsize=(10, 4))\n"
    "...   # TU CÓDIGO AQUÍ: dibuja en axs[0] y en axs[1], con título y etiquetas en cada uno\n\n"
    "print(axs[0].get_title(), '|', axs[1].get_title())",
    "fig, axs = plt.subplots(1, 2, figsize=(10, 4))\n\n"
    "axs[0].hist(tours['precio'], bins=20, color='#4C72B0')\n"
    "axs[0].set_title('Distribución de precios')\n"
    "axs[0].set_xlabel('Precio (CLP)')\n"
    "axs[0].set_ylabel('Cantidad de tours')\n\n"
    "axs[1].scatter(tours['duracion_dias'], tours['precio'], alpha=0.4, color='#8172B2')\n"
    "axs[1].set_title('Precio según duración')\n"
    "axs[1].set_xlabel('Duración (días)')\n"
    "axs[1].set_ylabel('Precio (CLP)')\n\n"
    "print(axs[0].get_title(), '|', axs[1].get_title())",
    "assert len(axs) == 2, 'deben ser exactamente 2 subplots'\n"
    "assert len(axs[0].patches) > 0, 'el subplot izquierdo debe tener el histograma'\n"
    "assert len(axs[1].collections) >= 1, 'el subplot derecho debe tener el scatter'\n"
    "for _ax in axs:\n"
    "    assert _ax.get_xlabel() != '' and _ax.get_ylabel() != '' and _ax.get_title() != '', "
    "'cada subplot necesita su propio título y etiquetas'",
    pista="`axs` es un array de ejes: `axs[0]` y `axs[1]` se usan exactamente "
          "como el `ax` de un gráfico normal, cada uno con sus propios `set_*`.",
    nivel=3)

nb.cierre("Visualización")
nb.save()
print("nb05 OK")
