# Notebook 04 — DataFrames: seleccionar, filtrar, explorar (mismo laboratorio, tabla completa)
from nbkit import Notebook, VIZ

nb = Notebook(
    4, "dataframes", "DataFrames: seleccionar, filtrar, explorar", "📋",
    "explorar un DataFrame de punta a punta: `head`/`shape`/`dtypes`, seleccionar "
    "columnas, la diferencia real entre `.loc` y `.iloc`, y filtrar con máscaras.",
    [("df", "DataFrames")],
    "## Contexto: el mismo laboratorio, ahora con la tabla completa\n\n"
    "Ya viste la glucosa como una Serie suelta. Hoy te pasan la FICHA completa: "
    "una tabla con todos los pacientes del mes y varios exámenes juntos.")

nb.md("## 0 · Preparación")
nb.code(
    "import numpy as np\nimport pandas as pd\n\n"
    "rng = np.random.default_rng(11)\n"
    "n = 40\n"
    "NOMBRES = ['Ana', 'Beatriz', 'Carla', 'Diego', 'Elena', 'Felipe',\n"
    "           'Gonzalo', 'Hilda', 'Ignacio', 'Javiera']\n"
    "APELLIDOS = ['Soto', 'Muñoz', 'Reyes', 'Contreras', 'Fuentes']\n"
    "COMUNAS = ['Concepción', 'Talcahuano', 'San Pedro', 'Hualpén']\n\n"
    "pacientes = pd.DataFrame({\n"
    "    'nombre': [f'{a} {b}' for a, b in zip(rng.choice(NOMBRES, n), rng.choice(APELLIDOS, n))],\n"
    "    'edad': rng.integers(18, 90, n),\n"
    "    'glucosa': rng.integers(70, 220, n),       # mg/dL\n"
    "    'presion': rng.integers(90, 180, n),        # sistólica, mmHg\n"
    "    'comuna': rng.choice(COMUNAS, n, p=[.4, .25, .2, .15]),\n"
    "})\n"
    "pacientes.head()")

nb.md("## 1 · Calentamiento")

nb.ejercicio(
    "1.1 Reconociendo la tabla",
    "Sin abrir el archivo original, responde solo mirando `pacientes`: guarda "
    "`n_filas` y `n_columnas` (con `.shape`), `columnas` (lista de nombres de "
    "columna) y `resumen` (el resultado de `.describe()`).",
    "n_filas, n_columnas = ...   # TU CÓDIGO AQUÍ\ncolumnas = ...\nresumen = ...\n\n"
    "print(n_filas, n_columnas)\nprint(columnas)\nprint(resumen)",
    "n_filas, n_columnas = pacientes.shape\ncolumnas = list(pacientes.columns)\n"
    "resumen = pacientes.describe()  # solo describe las columnas numéricas\n\n"
    "print(n_filas, n_columnas)\nprint(columnas)\nprint(resumen)",
    "assert (n_filas, n_columnas) == pacientes.shape\n"
    "assert columnas == list(pacientes.columns)\n"
    "assert 'edad' in resumen.columns and 'glucosa' in resumen.columns\n"
    "assert resumen.loc['count', 'edad'] == n_filas",
    pista="`.shape` es una TUPLA (filas, columnas) — se puede desempacar directo "
          "en dos variables.")

nb.ejercicio(
    "1.2 Una columna vs varias columnas",
    "Guarda `serie_glucosa`, la columna `'glucosa'` sola (debe quedar como Serie). "
    "Luego guarda `subset`, las columnas `['nombre', 'glucosa']` JUNTAS (debe "
    "quedar como DataFrame, no Serie).",
    "serie_glucosa = ...   # TU CÓDIGO AQUÍ\nsubset = ...\n\n"
    "print(type(serie_glucosa))\nprint(type(subset))",
    "serie_glucosa = pacientes['glucosa']     # una sola columna -> Serie\n"
    "subset = pacientes[['nombre', 'glucosa']]  # una LISTA de columnas -> DataFrame\n\n"
    "print(type(serie_glucosa))\nprint(type(subset))",
    "assert isinstance(serie_glucosa, pd.Series)\n"
    "assert isinstance(subset, pd.DataFrame)\n"
    "assert list(subset.columns) == ['nombre', 'glucosa']\n"
    "assert len(subset) == len(pacientes)",
    pista="`df['col']` (string suelto) da una Serie; `df[['col']]` (lista, aunque "
          "sea de una sola columna) da un DataFrame.")

nb.md("## 2 · Núcleo")

nb.ejercicio(
    "2.1 La trampa de .loc con slices",
    "Compara `pacientes.loc[0:4]` con `pacientes.iloc[0:4]`. Guarda ambos en "
    "`por_loc` y `por_iloc` y sus tamaños en `n_loc` y `n_iloc`. ¿Cuántas filas "
    "trae cada uno?",
    "por_loc = ...   # TU CÓDIGO AQUÍ\npor_iloc = ...\nn_loc = ...\nn_iloc = ...\n\n"
    "print(n_loc, n_iloc)",
    "por_loc = pacientes.loc[0:4]     # .loc con slice INCLUYE el extremo final: filas 0,1,2,3,4 -> 5\n"
    "por_iloc = pacientes.iloc[0:4]   # .iloc con slice NO lo incluye, como Python normal: 0,1,2,3 -> 4\n"
    "n_loc = len(por_loc)\nn_iloc = len(por_iloc)\n\n"
    "print(n_loc, n_iloc)",
    "assert n_loc == 5, '.loc[0:4] incluye el 4: son 5 filas'\n"
    "assert n_iloc == 4, '.iloc[0:4] excluye el 4, como cualquier slice de Python'\n"
    "assert n_loc == n_iloc + 1",
    pista="Es LA trampa clásica: `.iloc` se comporta como los slices de Python "
          "(excluye el final), pero `.loc` con números de fila INCLUYE el final. "
          "Distinto criterio, mismo aspecto.",
    nivel=2)

nb.ejercicio(
    "2.2 Filtro simple",
    "Guarda en `mayores` los pacientes con `edad` mayor a 65 años.",
    "mayores = ...   # TU CÓDIGO AQUÍ\n\nprint(len(mayores))\nmayores.head()",
    "mayores = pacientes[pacientes['edad'] > 65]\n\nprint(len(mayores))\nmayores.head()",
    "assert isinstance(mayores, pd.DataFrame)\n"
    "assert (mayores['edad'] > 65).all()\n"
    "assert len(mayores) == (pacientes['edad'] > 65).sum()",
    nivel=2)

nb.ejercicio(
    "2.3 Filtro combinado",
    "Guarda en `riesgo` los pacientes con `glucosa` > 126 Y `presion` > 140 a la "
    "vez. No olvides los paréntesis en cada condición.",
    "riesgo = ...   # TU CÓDIGO AQUÍ\n\nprint(len(riesgo))\nriesgo.head()",
    "riesgo = pacientes[(pacientes['glucosa'] > 126) & (pacientes['presion'] > 140)]\n\n"
    "print(len(riesgo))\nriesgo.head()",
    "assert (riesgo['glucosa'] > 126).all() and (riesgo['presion'] > 140).all()\n"
    "assert len(riesgo) <= len(pacientes[pacientes['glucosa'] > 126])\n"
    "assert len(riesgo) == len(pacientes[(pacientes['glucosa'] > 126) & (pacientes['presion'] > 140)])",
    pista="Igual que con arrays de NumPy: `&` exige paréntesis en cada condición "
          "porque tiene más precedencia que `>`.",
    nivel=2)

nb.ejercicio(
    "2.4 Una columna que no vino en los datos",
    "Agrega la columna `pacientes['riesgo_cv']` con `'alto'` si `presion` > 140, "
    "o `'normal'` en caso contrario, usando `np.where`.",
    "pacientes['riesgo_cv'] = ...   # TU CÓDIGO AQUÍ\n\npacientes[['presion', 'riesgo_cv']].head()",
    "pacientes['riesgo_cv'] = np.where(pacientes['presion'] > 140, 'alto', 'normal')\n\n"
    "pacientes[['presion', 'riesgo_cv']].head()",
    "assert 'riesgo_cv' in pacientes.columns\n"
    "assert set(pacientes['riesgo_cv'].unique()).issubset({'alto', 'normal'})\n"
    "assert (pacientes.loc[pacientes['presion'] > 140, 'riesgo_cv'] == 'alto').all()",
    nivel=2)

nb.ejercicio(
    "2.5 El top 5 más urgente",
    "Ordena `pacientes` por `glucosa` de MAYOR a menor y guarda las primeras 5 "
    "filas en `top5`.",
    "top5 = ...   # TU CÓDIGO AQUÍ\n\ntop5[['nombre', 'glucosa']]",
    "top5 = pacientes.sort_values('glucosa', ascending=False).head(5)\n\n"
    "top5[['nombre', 'glucosa']]",
    "assert len(top5) == 5\n"
    "assert list(top5['glucosa']) == sorted(top5['glucosa'], reverse=True)\n"
    "assert top5['glucosa'].min() >= pacientes['glucosa'].sort_values(ascending=False).iloc[4]",
    pista="`sort_values('columna', ascending=False)` ordena de mayor a menor; "
          "`.head(n)` se queda con las primeras `n` filas del resultado YA ordenado.",
    nivel=2)

nb.md("## 3 · Desafío 🏁")

nb.ejercicio(
    "3.1 Dos comunas, un conteo",
    "De entre `['Concepción', 'Talcahuano']`, filtra `pacientes` con `.isin(...)` "
    "en `subset_comunas` y calcula `conteo`, cuántos pacientes hay de cada una "
    "(con `.value_counts()` sobre la columna `comuna` de ese subset).",
    "comunas_interes = ['Concepción', 'Talcahuano']\n"
    "subset_comunas = ...   # TU CÓDIGO AQUÍ\nconteo = ...\n\n"
    "print(len(subset_comunas))\nprint(conteo)",
    "comunas_interes = ['Concepción', 'Talcahuano']\n"
    "subset_comunas = pacientes[pacientes['comuna'].isin(comunas_interes)]\n"
    "conteo = subset_comunas['comuna'].value_counts()\n\n"
    "print(len(subset_comunas))\nprint(conteo)",
    "assert set(subset_comunas['comuna'].unique()).issubset(set(comunas_interes))\n"
    "assert len(subset_comunas) == len(pacientes[pacientes['comuna'].isin(comunas_interes)])\n"
    "assert conteo.sum() == len(subset_comunas)\n"
    "assert set(conteo.index).issubset(set(comunas_interes))",
    pista="`.isin(lista)` es la forma corta de escribir "
          "`(col == 'a') | (col == 'b') | ...` para varias opciones a la vez.",
    nivel=3)

nb.cierre("DataFrames")
nb.save()
print("nb04 OK")
