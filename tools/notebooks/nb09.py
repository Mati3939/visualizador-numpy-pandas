# Notebook 09 — Joins y concat (contexto clase 20: ciclovías de Concepción)
from nbkit import Notebook, VIZ

nb = Notebook(
    9, "joins", "Joins y concat: bicicletas públicas de Concepción", "🔗",
    "combinar tablas con `merge` (inner/left, llaves con otro nombre, doble join "
    "con sufijos) y apilar periodos con `concat` sin romper el índice.",
    [("merge", "Joins y concat")],
    "## Contexto: el sistema de ciclovías penquista\n\n"
    "La municipalidad opera estaciones de bicicletas públicas en el Gran "
    "Concepción. Los viajes se registran con el **id** de la estación, pero los "
    "reportes necesitan **nombres** — el escenario exacto de la clase 20 del "
    "curso. Datos chicos y a mano, para que puedas verificar cada join a ojo.")

nb.md("## 0 · Preparación")
nb.code(
    "import pandas as pd\n\n"
    "estaciones = pd.DataFrame({\n"
    "    'id_estacion': [1, 2, 3, 4, 5, 6],\n"
    "    'nombre': ['Plaza Perú', 'Parque Ecuador', 'Estación Central',\n"
    "               'Laguna Redonda', 'Costanera', 'Universidad'],\n"
    "    'comuna': ['Concepción', 'Concepción', 'Concepción',\n"
    "               'Concepción', 'Hualpén', 'Concepción'],\n"
    "})\n"
    "viajes = pd.DataFrame({\n"
    "    'id_viaje': range(1, 13),\n"
    "    'salida': [1, 2, 1, 3, 5, 2, 1, 4, 2, 9, 3, 1],   # ojo con el 9…\n"
    "    'llegada': [2, 1, 3, 5, 1, 4, 2, 1, 3, 2, 1, 5],\n"
    "    'duracion_min': [12, 15, 8, 22, 31, 9, 14, 18, 11, 25, 16, 7],\n"
    "})\n"
    "print(estaciones)\nprint(viajes)")

nb.md("## 1 · Calentamiento\n\n"
      f"Ten abierto [{VIZ}#merge]({VIZ}#merge): las líneas entre llaves que vas a "
      "imaginar aquí, allá están dibujadas.")

nb.ejercicio(
    "1.1 El primer merge (y una fila que desaparece)",
    "Une `viajes` con `estaciones` por la estación de **salida** usando "
    "`pd.merge(..., left_on='salida', right_on='id_estacion', how='inner')` "
    "en `con_nombre`. Compara `len(viajes)` con `len(con_nombre)`: ¿cuántos "
    "viajes se perdieron y por qué?",
    "con_nombre = ...   # TU CÓDIGO AQUÍ\n\n"
    "print(len(viajes), '->', len(con_nombre))\ncon_nombre.head()",
    "con_nombre = pd.merge(viajes, estaciones,\n"
    "                      left_on='salida', right_on='id_estacion', how='inner')\n"
    "# el viaje 10 sale de la estación 9, que NO existe en el catálogo:\n"
    "# con inner, esa fila se pierde EN SILENCIO\n\n"
    "print(len(viajes), '->', len(con_nombre))\ncon_nombre.head()",
    "assert len(con_nombre) == len(viajes) - 1, 'inner debe botar exactamente el viaje huérfano'\n"
    "assert 'nombre' in con_nombre.columns\n"
    "assert 9 not in con_nombre['salida'].values",
    pista="Las llaves se llaman distinto en cada tabla (`salida` vs `id_estacion`): "
          "para eso existen `left_on` y `right_on`.")

nb.ejercicio(
    "1.2 left: nadie se pierde (pero aparece NaN)",
    "Repite el merge con `how='left'` en `con_nombre_left` y calcula "
    "`huerfanos`: cuántos viajes quedaron **sin nombre** de estación "
    "(`isnull().sum()` sobre la columna `nombre`).",
    "con_nombre_left = ...   # TU CÓDIGO AQUÍ\nhuerfanos = ...\n\n"
    "print(len(con_nombre_left), 'viajes ·', huerfanos, 'sin estación conocida')",
    "con_nombre_left = pd.merge(viajes, estaciones,\n"
    "                           left_on='salida', right_on='id_estacion', how='left')\n"
    "huerfanos = con_nombre_left['nombre'].isnull().sum()\n"
    "# left conserva TODOS los viajes; el que no encuentra pareja queda con NaN\n\n"
    "print(len(con_nombre_left), 'viajes ·', huerfanos, 'sin estación conocida')",
    "assert len(con_nombre_left) == len(viajes), 'left no debe perder ningún viaje'\n"
    "assert huerfanos == 1\n"
    "assert con_nombre_left.loc[con_nombre_left['salida'] == 9, 'nombre'].isnull().all()",
    pista="inner responde «¿qué calza?»; left responde «¿qué le falta a mi tabla?» — "
          "los NaN que deja son un DIAGNÓSTICO, no un error.")

nb.md("## 2 · Núcleo")

nb.ejercicio(
    "2.1 Doble join: salida Y llegada ⭐ (ejercicio estrella)",
    "El reporte necesita el nombre de AMBAS estaciones. Haz dos merges "
    "encadenados sobre `viajes` usando `suffixes=('_salida', '_llegada')` en el "
    "segundo para distinguir las columnas repetidas. Guarda en `tabla` y deja "
    "solo `['id_viaje', 'nombre_salida', 'nombre_llegada', 'duracion_min']`.",
    "paso1 = pd.merge(viajes, estaciones, left_on='salida',\n"
    "                 right_on='id_estacion', how='left')\n"
    "tabla = ...   # TU CÓDIGO AQUÍ: el segundo merge, por 'llegada', con suffixes\n\n"
    "tabla",
    "paso1 = pd.merge(viajes, estaciones, left_on='salida',\n"
    "                 right_on='id_estacion', how='left')\n"
    "tabla = pd.merge(paso1, estaciones, left_on='llegada',\n"
    "                 right_on='id_estacion', how='left',\n"
    "                 suffixes=('_salida', '_llegada'))\n"
    "# el segundo merge repite 'nombre' y 'comuna': los suffixes los renombran\n"
    "tabla = tabla[['id_viaje', 'nombre_salida', 'nombre_llegada', 'duracion_min']]\n\n"
    "tabla",
    "assert list(tabla.columns) == ['id_viaje', 'nombre_salida', 'nombre_llegada', 'duracion_min']\n"
    "assert len(tabla) == len(viajes)\n"
    "_v3 = tabla[tabla['id_viaje'] == 3].iloc[0]\n"
    "assert _v3['nombre_salida'] == 'Plaza Perú' and _v3['nombre_llegada'] == 'Estación Central'",
    pista="Sin `suffixes`, pandas inventa `_x` y `_y` — funciona, pero nadie "
          "entiende el reporte después. Nómbralos tú.",
    nivel=2)

nb.ejercicio(
    "2.2 Concat: llega el mes siguiente",
    "Llegaron los viajes de abril. Apílalos bajo los de marzo con "
    "`pd.concat([...], ignore_index=True)` en `anual`. Antes de eso, mira qué "
    "pasa SIN `ignore_index`: guarda en `repetidos` cuántas veces aparece la "
    "etiqueta 0 en el índice del concat ingenuo.",
    "abril = pd.DataFrame({\n"
    "    'id_viaje': range(13, 19),\n"
    "    'salida': [2, 3, 1, 5, 4, 2],\n"
    "    'llegada': [1, 1, 4, 2, 3, 5],\n"
    "    'duracion_min': [10, 19, 21, 28, 13, 9],\n"
    "})\n"
    "ingenuo = ...     # TU CÓDIGO AQUÍ: concat SIN ignore_index\n"
    "repetidos = ...   # cuántas filas responden a .loc[0]\n"
    "anual = ...       # ahora con ignore_index=True\n\n"
    "print('filas bajo la etiqueta 0:', repetidos)\nprint(len(anual), 'viajes en total')",
    "abril = pd.DataFrame({\n"
    "    'id_viaje': range(13, 19),\n"
    "    'salida': [2, 3, 1, 5, 4, 2],\n"
    "    'llegada': [1, 1, 4, 2, 3, 5],\n"
    "    'duracion_min': [10, 19, 21, 28, 13, 9],\n"
    "})\n"
    "ingenuo = pd.concat([viajes, abril])\n"
    "repetidos = len(ingenuo.loc[[0]])   # ¡dos filas con la misma etiqueta!\n"
    "anual = pd.concat([viajes, abril], ignore_index=True)\n\n"
    "print('filas bajo la etiqueta 0:', repetidos)\nprint(len(anual), 'viajes en total')",
    "assert repetidos == 2, 'sin ignore_index, la etiqueta 0 existe en marzo Y en abril'\n"
    "assert len(anual) == len(viajes) + len(abril)\n"
    "assert list(anual.index) == list(range(len(anual))), 'anual debe quedar renumerado 0..n-1'",
    pista="concat apila conservando los índices originales: 0..11 y luego 0..5. "
          "`ignore_index=True` renumera de corrido.",
    nivel=2)

nb.ejercicio(
    "2.3 Validar el join como profesional",
    "Después de todo merge conviene auditar. Sobre `con_nombre_left` construye "
    "`auditoria`, un pequeño dict con: `'total'` (filas), `'con_nombre'` (filas "
    "con estación conocida) y `'sin_nombre'` (los NaN). Los tres números deben "
    "cuadrar.",
    "auditoria = {\n"
    "    'total': ...,        # TU CÓDIGO AQUÍ\n"
    "    'con_nombre': ...,\n"
    "    'sin_nombre': ...,\n"
    "}\n\nprint(auditoria)",
    "auditoria = {\n"
    "    'total': len(con_nombre_left),\n"
    "    'con_nombre': con_nombre_left['nombre'].notnull().sum(),\n"
    "    'sin_nombre': con_nombre_left['nombre'].isnull().sum(),\n"
    "}\n# la P2.3 del Ejercicio Integrador 2 pide exactamente esta auditoría\n\nprint(auditoria)",
    "assert auditoria['total'] == auditoria['con_nombre'] + auditoria['sin_nombre']\n"
    "assert auditoria['total'] == len(viajes)\n"
    "assert auditoria['sin_nombre'] == 1",
    nivel=2)

nb.md("## 3 · Desafío")

nb.ejercicio(
    "3.1 La estación fantasma 🏁",
    "Dos preguntas de auditoría, dos técnicas:\n"
    "- `sin_uso`: el NOMBRE de la estación del catálogo que **nunca** aparece "
    "como salida (usa `~estaciones['id_estacion'].isin(...)`)\n"
    "- `fuera_catalogo`: los id de salida que aparecen en viajes pero **no** "
    "existen en el catálogo (misma idea, invertida)",
    "sin_uso = ...          # TU CÓDIGO AQUÍ\nfuera_catalogo = ...\n\n"
    "print('nunca usada como salida:', list(sin_uso))\n"
    "print('salidas fuera de catálogo:', list(fuera_catalogo))",
    "sin_uso = estaciones.loc[~estaciones['id_estacion'].isin(viajes['salida']), 'nombre']\n"
    "fuera_catalogo = viajes.loc[~viajes['salida'].isin(estaciones['id_estacion']), 'salida'].unique()\n"
    "# la Universidad (id 6) nunca despacha; la salida 9 no existe en el catálogo\n\n"
    "print('nunca usada como salida:', list(sin_uso))\n"
    "print('salidas fuera de catálogo:', list(fuera_catalogo))",
    "assert list(sin_uso) == ['Universidad']\n"
    "assert list(fuera_catalogo) == [9]",
    pista="`~mascara` invierte la máscara: «los que NO están en la lista». También "
          "sirve un merge outer con `indicator=True` — mira las categorías "
          "left_only/right_only que entrega.",
    nivel=3)

nb.cierre("Joins")
nb.save()
print("nb09 OK")
