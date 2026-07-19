# Notebook 10 — Fechas + mini integrador (contexto Ejercicio Integrador 2: delivery)
from nbkit import Notebook, VIZ

nb = Notebook(
    10, "fechas_integrador", "Fechas + mini integrador: la app de delivery", "📦",
    "parsear fechas que llegan como texto, extraer componentes con `.dt`, medir "
    "demoras con `Timedelta`, agrupar en el tiempo con `resample` y cerrar con un "
    "pipeline completo estilo certamen.",
    [("fechas", "Fechas"), ("groupby", "GroupBy y pivoteo")],
    "## Contexto: la app de delivery penquista\n\n"
    "Una app de delivery exporta sus pedidos con las fechas en formato chileno "
    "`DD-MM-AAAA`… como **texto**. Todo el análisis temporal (demoras, "
    "estacionalidad, crecimiento por comuna) depende de arreglar eso primero — "
    "el mismo punto de partida del **Ejercicio Integrador 2** del curso.")

nb.md("## 0 · Preparación")
nb.code(
    "import numpy as np\nimport pandas as pd\n\n"
    "rng = np.random.default_rng(2026)\n"
    "n = 80\n"
    "_offsets = rng.integers(9, 90, n)\n"
    "_offsets[0] = 61   # un pedido el 01-05-2026 (ya verás por qué importa…)\n"
    "_offsets[1] = 9    # y el más antiguo de verdad: 10-03-2026\n"
    "_pedido = pd.to_datetime('2026-03-01') + pd.to_timedelta(_offsets, unit='D')\n"
    "_entrega = _pedido + pd.to_timedelta(rng.integers(1, 11, n), unit='D')\n"
    "pedidos = pd.DataFrame({\n"
    "    'id_pedido': np.arange(1, n + 1),\n"
    "    'fecha_pedido': _pedido.strftime('%d-%m-%Y'),    # ¡texto a propósito!\n"
    "    'fecha_entrega': _entrega.strftime('%d-%m-%Y'),  # ¡texto a propósito!\n"
    "    'comuna': rng.choice(['Concepción', 'Talcahuano', 'San Pedro'], n, p=[.5, .3, .2]),\n"
    "    'monto': rng.integers(8_000, 45_000, n),\n"
    "})\n"
    "print(pedidos.dtypes)\npedidos.head()")

nb.md("## 1 · Calentamiento\n\n"
      f"El flujo completo de hoy está animado en [{VIZ}#fechas]({VIZ}#fechas): "
      "parsear → `.dt` → restar → `resample`.")

nb.ejercicio(
    "1.1 El orden alfabético miente",
    "Sin parsear nada todavía: guarda en `primera_texto` el mínimo de "
    "`fecha_pedido` tal como está (texto), y en `primera_real` el mínimo "
    "después de parsear con `pd.to_datetime(..., format='%d-%m-%Y')` "
    "(formateado de vuelta a texto con `.strftime('%d-%m-%Y')`). Compara.",
    "primera_texto = ...   # TU CÓDIGO AQUÍ (min sobre el texto)\n"
    "primera_real = ...    # min sobre las fechas parseadas, de vuelta a '%d-%m-%Y'\n\n"
    "print('según el texto :', primera_texto)\nprint('en la realidad :', primera_real)",
    "primera_texto = pedidos['fecha_pedido'].min()\n"
    "primera_real = (pd.to_datetime(pedidos['fecha_pedido'], format='%d-%m-%Y')\n"
    "                .min().strftime('%d-%m-%Y'))\n"
    "# el texto compara carácter a carácter: '01-05-2026' le gana a '02-03-2026'\n"
    "# aunque mayo venga DESPUÉS de marzo\n\n"
    "print('según el texto :', primera_texto)\nprint('en la realidad :', primera_real)",
    "assert primera_texto != primera_real, "
    "'con formato DD-MM, el orden alfabético NO coincide con el cronológico'\n"
    "assert primera_real.endswith('-03-2026'), 'el primer pedido real es de marzo'",
    pista="En texto, `'01-05'` &lt; `'02-03'` porque `'1'` &lt; `'2'` en el segundo "
          "carácter. El mes ni alcanza a opinar.")

nb.ejercicio(
    "1.2 Parsear de una vez por todas",
    "Convierte AMBAS columnas de fecha a `datetime` (formato `%d-%m-%Y`), "
    "sobrescribiéndolas en `pedidos`. Verifica los `dtypes`.",
    "pedidos['fecha_pedido'] = ...    # TU CÓDIGO AQUÍ\n"
    "pedidos['fecha_entrega'] = ...\n\n"
    "print(pedidos.dtypes)",
    "pedidos['fecha_pedido'] = pd.to_datetime(pedidos['fecha_pedido'], format='%d-%m-%Y')\n"
    "pedidos['fecha_entrega'] = pd.to_datetime(pedidos['fecha_entrega'], format='%d-%m-%Y')\n"
    "# format explícito: sin él, pandas puede confundir día con mes (03-04, ¿marzo o abril?)\n\n"
    "print(pedidos.dtypes)",
    "assert pedidos['fecha_pedido'].dtype.kind == 'M', 'fecha_pedido debe ser datetime64'\n"
    "assert pedidos['fecha_entrega'].dtype.kind == 'M'\n"
    "assert (pedidos['fecha_entrega'] > pedidos['fecha_pedido']).all()",
    pista="`format='%d-%m-%Y'` le dice a pandas que el DÍA va primero — sin eso, "
          "un `03-04-2026` es ambiguo y puede terminar en el mes equivocado.")

nb.md("## 2 · Núcleo")

nb.ejercicio(
    "2.1 Componentes con .dt",
    "Agrega a `pedidos` las columnas `mes` (número de mes del pedido) y "
    "`dia_semana` (nombre del día, con `day_name()`). Después calcula "
    "`dia_top`: el día de la semana con MÁS pedidos. Ojo con el idioma del "
    "resultado.",
    "pedidos['mes'] = ...        # TU CÓDIGO AQUÍ\n"
    "pedidos['dia_semana'] = ...\ndia_top = ...\n\n"
    "print(pedidos['dia_semana'].value_counts())\nprint('día top:', dia_top)",
    "pedidos['mes'] = pedidos['fecha_pedido'].dt.month\n"
    "pedidos['dia_semana'] = pedidos['fecha_pedido'].dt.day_name()  # sale en INGLÉS\n"
    "dia_top = pedidos['dia_semana'].value_counts().idxmax()\n\n"
    "print(pedidos['dia_semana'].value_counts())\nprint('día top:', dia_top)",
    "assert set(pedidos['mes'].unique()).issubset({3, 4, 5})\n"
    "assert dia_top in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',\n"
    "                   'Saturday', 'Sunday'], 'day_name() habla inglés por defecto'\n"
    "assert pedidos['dia_semana'].value_counts()[dia_top] == pedidos['dia_semana'].value_counts().max()",
    pista="Sí, `day_name()` responde 'Friday' aunque tu notebook esté en español — "
          "es el mismo «¿por qué me salió Friday?» de la guía de GroupBy.",
    nivel=2)

nb.ejercicio(
    "2.2 ¿Cuánto tardamos en entregar?",
    "Crea `pedidos['demora_dias']`: los días entre pedido y entrega (resta de "
    "columnas + `.dt.days`). Luego guarda en `id_mas_lento` el `id_pedido` del "
    "pedido con mayor demora.",
    "pedidos['demora_dias'] = ...   # TU CÓDIGO AQUÍ\nid_mas_lento = ...\n\n"
    "print(pedidos['demora_dias'].describe().round(1))\nprint('más lento:', id_mas_lento)",
    "pedidos['demora_dias'] = (pedidos['fecha_entrega'] - pedidos['fecha_pedido']).dt.days\n"
    "id_mas_lento = pedidos.loc[pedidos['demora_dias'].idxmax(), 'id_pedido']\n"
    "# la resta de datetimes da Timedelta ('3 days'); .dt.days lo vuelve entero\n\n"
    "print(pedidos['demora_dias'].describe().round(1))\nprint('más lento:', id_mas_lento)",
    "assert pedidos['demora_dias'].dtype.kind == 'i', 'demora_dias debe ser entero (días)'\n"
    "assert (pedidos['demora_dias'] >= 1).all()\n"
    "assert pedidos.loc[pedidos['id_pedido'] == id_mas_lento, 'demora_dias'].iloc[0] == pedidos['demora_dias'].max()",
    nivel=2)

nb.ejercicio(
    "2.3 Un rango de fechas con máscara",
    "Filtra en `abril` los pedidos hechos en abril de 2026 usando una máscara "
    "con dos condiciones sobre `fecha_pedido` (desde el 1 de abril inclusive, "
    "hasta antes del 1 de mayo). Puedes comparar directo contra strings "
    "`'2026-04-01'` — pandas los entiende.",
    "abril = ...   # TU CÓDIGO AQUÍ\n\nprint(len(abril), 'pedidos en abril')",
    "abril = pedidos[(pedidos['fecha_pedido'] >= '2026-04-01') &\n"
    "                (pedidos['fecha_pedido'] < '2026-05-01')]\n"
    "# contra una columna datetime, el string ISO 'AAAA-MM-DD' se convierte solo\n\n"
    "print(len(abril), 'pedidos en abril')",
    "assert (abril['fecha_pedido'].dt.month == 4).all()\n"
    "assert len(abril) == (pedidos['fecha_pedido'].dt.month == 4).sum()",
    pista="El extremo derecho va EXCLUYENTE (`< '2026-05-01'`): así no dependes "
          "de si el mes tiene 30 o 31 días.",
    nivel=2)

nb.ejercicio(
    "2.4 Ventas mensuales con resample",
    "Construye `mensual`: el monto TOTAL vendido por mes, usando "
    "`set_index('fecha_pedido')` + `resample('ME')`. Fíjate en las etiquetas "
    "del índice resultante: ¿qué día de cada mes aparece?",
    "mensual = ...   # TU CÓDIGO AQUÍ\n\nprint(mensual)",
    "mensual = pedidos.set_index('fecha_pedido').resample('ME')['monto'].sum()\n"
    "# 'ME' etiqueta cada periodo con el FIN de mes (2026-03-31, no 2026-03-01);\n"
    "# en pandas antiguos se escribía 'M'\n\nprint(mensual)",
    "assert len(mensual) == 3, 'marzo, abril y mayo'\n"
    "assert mensual.sum() == pedidos['monto'].sum(), 'no puede perderse plata en la agrupación'\n"
    "assert mensual.index[0].day == 31, 'ME etiqueta con el fin de mes'",
    pista=f"La animación de resample del visualizador muestra el paso a paso "
          f"exacto: {VIZ}#fechas (tarjeta «groupby en el tiempo»).",
    nivel=2)

nb.md("## 3 · Desafío integrador 🏁\n\n"
      "Todo lo del semestre en una pregunta de gerencia.")

nb.ejercicio(
    "3.1 ¿Qué comuna crece más?",
    "Construye `panel`: una `pivot_table` con el monto total por **comuna "
    "(filas) × mes (columnas)**, sin NaN (`fill_value=0`). Luego calcula "
    "`crecimiento`: la diferencia entre el último mes (5) y el primero (3) "
    "para cada comuna, y guarda en `comuna_estrella` la comuna que más creció.",
    "panel = ...   # TU CÓDIGO AQUÍ\ncrecimiento = ...\ncomuna_estrella = ...\n\n"
    "print(panel)\nprint(crecimiento.sort_values(ascending=False))\n"
    "print('comuna estrella:', comuna_estrella)",
    "panel = pd.pivot_table(pedidos, values='monto', index='comuna',\n"
    "                       columns='mes', aggfunc='sum', fill_value=0)\n"
    "crecimiento = panel[5] - panel[3]\n"
    "comuna_estrella = crecimiento.idxmax()\n\n"
    "print(panel)\nprint(crecimiento.sort_values(ascending=False))\n"
    "print('comuna estrella:', comuna_estrella)",
    "assert panel.shape == (3, 3), '3 comunas × 3 meses'\n"
    "assert panel.to_numpy().sum() == pedidos['monto'].sum()\n"
    "assert comuna_estrella in panel.index\n"
    "assert crecimiento[comuna_estrella] == crecimiento.max()",
    pista="Es el mismo pivote del notebook 08, con el mes que fabricaste en el "
          "2.1 como columna. El pipeline completo: texto → datetime → .dt → pivot.",
    nivel=3)

nb.md("## 🏁 Cierre de la batería\n\n"
      "Si llegaste hasta acá resolviendo (no mirando las soluciones 😄), ya "
      "recorriste el semestre completo: arrays, máscaras, Series, DataFrames, "
      "gráficos, nulos, outliers, groupby, joins y fechas. El siguiente nivel es "
      "el **Boss final** del visualizador — un DataFrame corrupto te espera.")

nb.cierre("Fechas")
nb.save()
print("nb10 OK")
