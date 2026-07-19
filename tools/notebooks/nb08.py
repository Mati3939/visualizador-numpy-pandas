# Notebook 08 — GroupBy y pivoteo (espejo de la Guía GroupBy 2026-1)
from nbkit import Notebook, VIZ

nb = Notebook(
    8, "groupby_pivoteo", "GroupBy y pivoteo: la cafetería", "☕",
    "dominar split-apply-combine: agregaciones, `agg` múltiple, `pivot_table` "
    "y porcentajes por grupo.",
    [("groupby", "GroupBy y pivoteo")],
    "## Contexto: cadena de cafeterías en Concepción\n\n"
    "Administras 3 sucursales (Centro, San Pedro, Talcahuano). Gerencia quiere "
    "respuestas, no tablas crudas — las mismas preguntas de la **Guía de GroupBy** "
    "oficial del curso, aquí con autochequeo.")

nb.md("## 0 · Preparación")
nb.code(
    "import numpy as np\nimport pandas as pd\n\n"
    "rng = np.random.default_rng(2026)\n"
    "n = 300\n"
    "ventas = pd.DataFrame({\n"
    "    'sucursal': rng.choice(['Centro', 'San Pedro', 'Talcahuano'], n, p=[.5, .3, .2]),\n"
    "    'categoria': rng.choice(['Café', 'Té', 'Pastelería', 'Sándwich'], n, p=[.4, .15, .25, .2]),\n"
    "    'vendedor': rng.choice(['Amanda', 'Bruno', 'Carla', 'Diego'], n),\n"
    "    'pago': rng.choice(['efectivo', 'débito', 'crédito'], n, p=[.25, .55, .2]),\n"
    "    'cantidad': rng.integers(1, 5, n),\n"
    "    'precio_unit': rng.choice([1800, 2500, 3200, 4500], n),\n"
    "})\n"
    "ventas['total'] = ventas['cantidad'] * ventas['precio_unit']\n"
    "ventas.head()")

nb.md("## 1 · Calentamiento\n\n"
      f"Ten a mano la animación de split-apply-combine: [{VIZ}#groupby]({VIZ}#groupby)")

nb.ejercicio(
    "1.1 Facturación por sucursal (pregunta 1 de la guía)",
    "Calcula `fact`, la facturación total (`total`) de **cada sucursal**, "
    "ordenada de mayor a menor.",
    "fact = ...   # TU CÓDIGO AQUÍ\n\nprint(fact)",
    "fact = ventas.groupby('sucursal')['total'].sum().sort_values(ascending=False)\n\nprint(fact)",
    "assert len(fact) == 3\n"
    "assert fact.sum() == ventas['total'].sum(), 'la suma de los grupos debe cuadrar con el total'\n"
    "assert list(fact) == sorted(fact, reverse=True), 'debe venir ordenada de mayor a menor'",
    pista="groupby entrega los grupos en orden alfabético — el ranking lo da `sort_values`.")

nb.ejercicio(
    "1.2 Ticket promedio por medio de pago (pregunta 2)",
    "Calcula `ticket`, el promedio de `total` según `pago`. ¿Cuál medio de pago "
    "tiene el ticket más alto? Guárdalo en `pago_top` (texto).",
    "ticket = ...     # TU CÓDIGO AQUÍ\npago_top = ...\n\nprint(ticket.round(0))\nprint(pago_top)",
    "ticket = ventas.groupby('pago')['total'].mean()\npago_top = ticket.idxmax()\n\n"
    "print(ticket.round(0))\nprint(pago_top)",
    "assert set(ticket.index) == {'efectivo', 'débito', 'crédito'}\n"
    "assert pago_top == ticket.idxmax()\n"
    "assert isinstance(pago_top, str), 'pago_top es el NOMBRE del medio de pago'",
    pista="`idxmax()` devuelve la etiqueta del índice donde está el máximo — "
          "para un groupby, el nombre del grupo ganador.")

nb.md("## 2 · Núcleo")

nb.ejercicio(
    "2.1 count vs size (pregunta 3)",
    "Calcula `n_ventas`, el número de **transacciones** que atendió cada vendedor. "
    "Piensa: ¿`count()` o `size()`? ¿Qué cambiaría si `total` tuviera nulos?",
    "n_ventas = ...   # TU CÓDIGO AQUÍ\n\nprint(n_ventas)",
    "n_ventas = ventas.groupby('vendedor').size()\n"
    "# count() cuenta valores NO nulos de una columna; size() cuenta FILAS.\n"
    "# Aquí da lo mismo (no hay nulos), pero con nulos count() subcontaría.\n\nprint(n_ventas)",
    "assert n_ventas.sum() == len(ventas)\nassert len(n_ventas) == 4",
    nivel=2)

nb.ejercicio(
    "2.2 Tres respuestas en una tabla (pregunta 6)",
    "Para cada `categoria` entrega en UNA sola tabla `resumen`: la facturación "
    "total, el ticket promedio y el número de ventas — columnas `sum`, `mean` y "
    "`count` (en ese orden).",
    "resumen = ...   # TU CÓDIGO AQUÍ\n\nprint(resumen.round(0))",
    "resumen = ventas.groupby('categoria')['total'].agg(['sum', 'mean', 'count'])\n\n"
    "print(resumen.round(0))",
    "assert list(resumen.columns) == ['sum', 'mean', 'count']\n"
    "assert resumen['sum'].sum() == ventas['total'].sum()\n"
    "assert resumen['count'].sum() == len(ventas)",
    pista="`.agg(['sum', 'mean', 'count'])` aplica varias funciones de una pasada.",
    nivel=2)

nb.ejercicio(
    "2.3 La tabla cruzada (pregunta 7)",
    "Construye `cruce`: facturación total por **sucursal (filas) × categoría "
    "(columnas)** con `pd.pivot_table`. Si una combinación no registra ventas "
    "debe mostrar **0**, no NaN.",
    "cruce = ...   # TU CÓDIGO AQUÍ\n\nprint(cruce)",
    "cruce = pd.pivot_table(ventas, values='total', index='sucursal',\n"
    "                       columns='categoria', aggfunc='sum', fill_value=0)\n\nprint(cruce)",
    "assert cruce.shape == (3, 4)\n"
    "assert not cruce.isnull().any().any(), 'usa fill_value para los huecos'\n"
    "assert cruce.to_numpy().sum() == ventas['total'].sum()",
    pista=f"El heatmap del visualizador ES esta tabla: {VIZ}#groupby (tarjeta pivot_table).",
    nivel=2)

nb.md("## 3 · Desafíos de gerencia")

nb.ejercicio(
    "3.1 El producto estrella de cada sucursal (pregunta 9) 🏁",
    "¿Qué `categoria` vende más **unidades** (`cantidad`) dentro de cada sucursal? "
    "Construye `estrella`, una Serie con índice sucursal y valor la categoría "
    "ganadora (p. ej. `Centro → Café`).",
    "estrella = ...   # TU CÓDIGO AQUÍ\n\nprint(estrella)",
    "unidades = ventas.groupby(['sucursal', 'categoria'])['cantidad'].sum()\n"
    "estrella = unidades.groupby('sucursal').idxmax().str[1]\n"
    "# idxmax en el doble índice devuelve tuplas (sucursal, categoria);\n"
    "# .str[1] se queda con la categoría\n\nprint(estrella)",
    "assert len(estrella) == 3\n"
    "assert set(estrella.index) == {'Centro', 'San Pedro', 'Talcahuano'}\n"
    "_u = ventas.groupby(['sucursal', 'categoria'])['cantidad'].sum()\n"
    "for _s in estrella.index:\n"
    "    assert _u[_s][estrella[_s]] == _u[_s].max(), f'revisa {_s}'",
    pista="Agrupa por DOS llaves, y luego vuelve a agrupar el resultado solo "
          "por sucursal para pedir `idxmax()`.", nivel=3)

nb.ejercicio(
    "3.2 ¿Qué porcentaje aporta cada categoría? (pregunta 10) 🏁",
    "A partir de `cruce`, construye `pct` donde cada fila (sucursal) muestre el "
    "**porcentaje** que aporta cada categoría a SU facturación. Cada fila debe "
    "sumar 100.",
    "pct = ...   # TU CÓDIGO AQUÍ\n\nprint(pct.round(1))",
    "pct = cruce.div(cruce.sum(axis=1), axis=0) * 100\n"
    "# div con axis=0: divide cada fila por su propio total\n\nprint(pct.round(1))",
    "assert pct.shape == cruce.shape\n"
    "assert (abs(pct.sum(axis=1) - 100) < 1e-6).all(), 'cada fila debe sumar 100'",
    pista="`cruce.div(cruce.sum(axis=1), axis=0)` — el `axis=0` del div alinea "
          "el divisor con las filas.", nivel=3)

nb.cierre("GroupBy")
nb.save()
print("nb08 OK")
