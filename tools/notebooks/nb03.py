# Notebook 03 — Series: la columna con nombre propio (contexto Control 2)
from nbkit import Notebook, VIZ

nb = Notebook(
    3, "series", "Series: la columna con nombre propio", "🧪",
    "crear Series, elegir entre `.loc`/`.iloc`, operar vectorizado y entender por "
    "qué pandas ALINEA por índice antes de sumar dos Series.",
    [("df", "DataFrames")],
    "## Contexto: laboratorio clínico\n\n"
    "Trabajas en un laboratorio que procesa exámenes de sangre. Cada resultado "
    "llega con el NOMBRE del paciente pegado — ni una tabla completa todavía, "
    "solo una columna con memoria. El mismo escenario del **Control 2** del curso.")

nb.md("## 0 · Preparación")
nb.code(
    "import numpy as np\nimport pandas as pd\n\n"
    "rng = np.random.default_rng(7)\n"
    "pacientes = ['Ana', 'Beatriz', 'Carla', 'Diego', 'Elena',\n"
    "             'Felipe', 'Gonzalo', 'Hilda', 'Ignacio', 'Javiera']\n"
    "glucosa_valores = rng.integers(70, 180, size=len(pacientes))  # mg/dL en ayunas\n"
    "glucosa_dict = dict(zip(pacientes, glucosa_valores))\n"
    "print(glucosa_dict)")

nb.md("## 1 · Calentamiento")

nb.ejercicio(
    "1.1 Tu primera Serie",
    "Crea `glucosa`, una `pd.Series` a partir de `glucosa_dict` (el índice queda "
    "solo, con los nombres). Ponle nombre a la serie: `name='glucosa_mg_dl'`.",
    "glucosa = ...   # TU CÓDIGO AQUÍ\n\nprint(glucosa)",
    "glucosa = pd.Series(glucosa_dict, name='glucosa_mg_dl')  # el dict entrega el índice gratis\n\nprint(glucosa)",
    "assert isinstance(glucosa, pd.Series)\n"
    "assert list(glucosa.index) == pacientes\n"
    "assert (glucosa.values == glucosa_valores).all()\n"
    "assert glucosa.name == 'glucosa_mg_dl'",
    pista="`pd.Series(un_dict)` usa las LLAVES del dict como índice y los valores "
          "como datos, en el mismo orden en que se insertaron.")

nb.ejercicio(
    "1.2 Por etiqueta o por posición",
    "Obtén el valor de glucosa de `'Ana'` usando `.loc` (por NOMBRE) y guárdalo en "
    "`glucosa_ana`. Luego obtén el valor del TERCER paciente de la lista usando "
    "`.iloc` (por POSICIÓN) y guárdalo en `tercer_valor`.",
    "glucosa_ana = ...    # TU CÓDIGO AQUÍ\ntercer_valor = ...\n\n"
    "print(glucosa_ana, tercer_valor)",
    "glucosa_ana = glucosa.loc['Ana']    # .loc busca por ETIQUETA del índice\n"
    "tercer_valor = glucosa.iloc[2]      # .iloc busca por POSICIÓN, parte de 0\n\n"
    "print(glucosa_ana, tercer_valor)",
    "assert glucosa_ana == glucosa_dict['Ana']\n"
    "assert tercer_valor == glucosa_valores[2]",
    pista="`.loc['Ana']` no sabe de posiciones; `.iloc[2]` no sabe de nombres — "
          "elige uno según lo que tengas a mano.")

nb.md("## 2 · Núcleo")

nb.ejercicio(
    "2.1 Cambiar de unidades sin loops",
    "Convierte `glucosa` (mg/dL) a mmol/L en `glucosa_mmol`, dividiendo por "
    "`18.0182` (el factor de conversión clínico estándar).",
    "glucosa_mmol = ...   # TU CÓDIGO AQUÍ\n\nprint(glucosa_mmol.round(2))",
    "glucosa_mmol = glucosa / 18.0182   # la operación se aplica a CADA valor, el índice se conserva\n\n"
    "print(glucosa_mmol.round(2))",
    "assert glucosa_mmol.shape == glucosa.shape\n"
    "assert list(glucosa_mmol.index) == list(glucosa.index)\n"
    "assert abs(glucosa_mmol.loc['Ana'] - glucosa.loc['Ana'] / 18.0182) < 1e-9",
    nivel=2)

nb.ejercicio(
    "2.2 Un resumen estadístico",
    "Calcula `promedio` (la media de `glucosa`) y `resumen` (el resultado de "
    "`.describe()` sobre `glucosa`).",
    "promedio = ...    # TU CÓDIGO AQUÍ\nresumen = ...\n\n"
    "print(promedio)\nprint(resumen)",
    "promedio = glucosa.mean()\nresumen = glucosa.describe()\n\n"
    "print(promedio)\nprint(resumen)",
    "assert abs(promedio - sum(glucosa_valores) / len(glucosa_valores)) < 1e-9\n"
    "assert 'mean' in resumen.index and 'std' in resumen.index\n"
    "assert resumen.loc['count'] == len(glucosa)",
    pista="`.describe()` te devuelve OTRA Serie: count, mean, std, min, cuartiles y max.",
    nivel=2)

nb.ejercicio(
    "2.3 Filtrar pacientes con glucosa alta",
    "Guarda en `pacientes_altos` la Serie filtrada solo con los pacientes cuya "
    "glucosa supera 126 mg/dL (umbral clínico de diabetes en ayunas).",
    "pacientes_altos = ...   # TU CÓDIGO AQUÍ\n\nprint(pacientes_altos)",
    "pacientes_altos = glucosa[glucosa > 126]\n\nprint(pacientes_altos)",
    "assert (pacientes_altos > 126).all()\n"
    "assert set(pacientes_altos.index).issubset(set(glucosa.index))\n"
    "assert len(pacientes_altos) == (glucosa > 126).sum()",
    nivel=2)

nb.ejercicio(
    "2.4 Categorías con value_counts",
    "Crea `categoria`, una Serie de texto con el mismo índice que `glucosa`, que "
    "diga `'alto'` si supera 126, `'normal-alto'` si está entre 100 y 126, o "
    "`'normal'` si es menor. Luego cuenta cuántos pacientes hay en cada categoría "
    "con `.value_counts()` en `conteo`.",
    "categoria = pd.Series(\n"
    "    np.where(glucosa > 126, 'alto',\n"
    "             np.where(glucosa > 100, 'normal-alto', 'normal')),\n"
    "    index=glucosa.index)\nconteo = ...   # TU CÓDIGO AQUÍ\n\nprint(conteo)",
    "categoria = pd.Series(\n"
    "    np.where(glucosa > 126, 'alto',\n"
    "             np.where(glucosa > 100, 'normal-alto', 'normal')),\n"
    "    index=glucosa.index)\nconteo = categoria.value_counts()  # cuenta cuántas veces aparece cada valor\n\n"
    "print(conteo)",
    "assert conteo.sum() == len(glucosa), 'la suma de las categorías debe dar el total de pacientes'\n"
    "assert set(conteo.index).issubset({'alto', 'normal-alto', 'normal'})\n"
    "assert conteo.get('alto', 0) == (glucosa > 126).sum()",
    pista="`.value_counts()` cuenta cuántas veces se repite cada valor ÚNICO — "
          "perfecto para una columna de categorías.",
    nivel=2)

nb.md("## 3 · Desafío: dos exámenes, dos índices distintos 🏁")
nb.code(
    "# un segundo examen, pero NO a los mismos pacientes: perdemos a los 2 primeros\n"
    "# y se suman 2 pacientes nuevos que no salieron en glucosa\n"
    "pacientes_trig = pacientes[2:] + ['Karla', 'Luis']\n"
    "trigliceridos = pd.Series(rng.integers(80, 250, size=len(pacientes_trig)),\n"
    "                          index=pacientes_trig, name='trigliceridos_mg_dl')\n"
    "print(trigliceridos)")

nb.ejercicio(
    "3.1 La alineación por índice ⭐ (ejercicio estrella)",
    "Suma `glucosa + trigliceridos` en `suma`. Vas a ver `NaN` en algunos "
    "pacientes: en el comentario, explica POR QUÉ aparecen. Guarda además "
    "`n_nan`, cuántos `NaN` salieron.",
    "suma = ...   # TU CÓDIGO AQUÍ\nn_nan = ...\n\n"
    "# aparecen NaN porque: <escribe aquí tu explicación>\n"
    "print(suma)\nprint('NaN:', n_nan)",
    "suma = glucosa + trigliceridos\n"
    "n_nan = suma.isnull().sum()\n\n"
    "# aparecen NaN porque pandas ALINEA por índice antes de sumar: solo los\n"
    "# pacientes que están en AMBAS Series obtienen una suma real. Los que están\n"
    "# en una sola serie (Ana, Beatriz, Karla, Luis) no tienen con qué sumarse,\n"
    "# y pandas rellena con NaN en vez de adivinar o botar la fila.\n"
    "print(suma)\nprint('NaN:', n_nan)",
    "_esperado_nan = len(set(glucosa.index).symmetric_difference(set(trigliceridos.index)))\n"
    "assert n_nan == _esperado_nan, 'cuenta los pacientes que NO están en ambas Series'\n"
    "assert len(suma) == len(set(glucosa.index) | set(trigliceridos.index))\n"
    "assert not suma.dropna().empty",
    pista="pandas suma POR ETIQUETA, no por posición: si un nombre no está en las "
          "dos Series, no tiene con qué sumarse y el resultado es `NaN`.",
    nivel=3)

nb.ejercicio(
    "3.2 ¿Quién quedó fuera? 🏁",
    "Sin mirar el resultado de la suma, calcula directamente `solo_glucosa`: los "
    "pacientes que están en `glucosa` pero NO en `trigliceridos`, usando "
    "`.index.difference(...)`.",
    "solo_glucosa = ...   # TU CÓDIGO AQUÍ\n\nprint(solo_glucosa)",
    "solo_glucosa = glucosa.index.difference(trigliceridos.index)\n\nprint(solo_glucosa)",
    "assert set(solo_glucosa) == set(glucosa.index) - set(trigliceridos.index)\n"
    "assert all(p not in trigliceridos.index for p in solo_glucosa)",
    pista="`serieA.index.difference(serieB.index)` devuelve las etiquetas que "
          "están en A pero no en B — el mismo resultado que mirar los `NaN` del "
          "ejercicio anterior, pero calculado directo.",
    nivel=3)

nb.cierre("DataFrames")
nb.save()
print("nb03 OK")
