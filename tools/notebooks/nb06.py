# Notebook 06 — Valores faltantes (contexto Control 3: telemedicina)
from nbkit import Notebook, VIZ

nb = Notebook(
    6, "valores_faltantes", "Valores faltantes: diagnosticar antes de operar", "🕳️",
    "diagnosticar nulos con `isnull()`, destapar nulos disfrazados, entender "
    "`dropna(thresh=...)` y decidir entre media, mediana y moda para imputar.",
    [("nulos", "Valores perdidos")],
    "## Contexto: plataforma de telemedicina\n\n"
    "Trabajas con el registro de consultas de una plataforma de telemedicina "
    "regional — el mismo escenario del **Control 3** del curso. Los formularios "
    "los llenan médicos apurados entre una videollamada y otra, así que el dataset "
    "llega con huecos… y no todos los huecos se ven como huecos.")

nb.md("## 0 · Preparación\n\nCorre esta celda primero (define los datos de todo el notebook).")
nb.code(
    "import numpy as np\nimport pandas as pd\n\n"
    "rng = np.random.default_rng(314)\n"
    "n = 50\n\n"
    "especialidades = ['Medicina general', 'Pediatría', 'Dermatología', 'Nutrición', 'Psicología']\n"
    "comunas = ['Concepción', 'Talcahuano', 'San Pedro', 'Hualpén', 'Chiguayante']\n\n"
    "consultas = pd.DataFrame({\n"
    "    'id_consulta': np.arange(1, n + 1),\n"
    "    'especialidad': rng.choice(especialidades, n),\n"
    "    'comuna': rng.choice(comunas, n),\n"
    "    'duracion_min': rng.normal(20, 4, n).round(1).clip(8, None),\n"
    "    'edad_paciente': rng.integers(18, 90, n).astype(float),\n"
    "    'satisfaccion': rng.integers(1, 6, n),\n"
    "})\n\n"
    "# 3 consultas con duraciones absurdamente largas (videollamadas que quedaron pegadas)\n"
    "outliers_idx = [5, 22, 40]\n"
    "consultas.loc[outliers_idx, 'duracion_min'] = [95.0, 120.0, 88.0]\n\n"
    "# nulos DE VERDAD (np.nan), con una proporción distinta por columna\n"
    "mask_comuna = rng.random(n) < 0.08\n"
    "mask_duracion = rng.random(n) < 0.14\n"
    "mask_duracion[outliers_idx] = False   # no tapamos los outliers, los necesitamos enteros\n"
    "mask_edad = rng.random(n) < 0.22\n\n"
    "consultas.loc[mask_comuna, 'comuna'] = np.nan\n"
    "consultas.loc[mask_duracion, 'duracion_min'] = np.nan\n"
    "consultas.loc[mask_edad, 'edad_paciente'] = np.nan\n\n"
    "# nulos DISFRAZADOS en 'satisfaccion': algunos médicos anotan 'sin dato' o -999\n"
    "# en vez de dejar el campo vacío — para pandas eso NO es un nulo\n"
    "consultas['satisfaccion'] = consultas['satisfaccion'].astype(object)\n"
    "idx_sin_dato = rng.choice(n, size=4, replace=False)\n"
    "resto = [i for i in range(n) if i not in idx_sin_dato]\n"
    "idx_menos999 = rng.choice(resto, size=3, replace=False)\n"
    "consultas.loc[idx_sin_dato, 'satisfaccion'] = 'sin dato'\n"
    "consultas.loc[idx_menos999, 'satisfaccion'] = -999\n\n"
    "consultas.head(10)")

nb.md("## 1 · Calentamiento\n\n"
      f"Antes de tocar nada, revisa la animación de nulos en [{VIZ}#nulos]({VIZ}#nulos).")

nb.ejercicio(
    "1.1 Radiografía de nulos",
    "Calcula `nulos_por_col`, el número de nulos de **cada columna** con "
    "`isnull().sum()`, y `pct_nulos`, el mismo dato pero en **porcentaje** "
    "(redondeado a 1 decimal).",
    "nulos_por_col = ...   # TU CÓDIGO AQUÍ\npct_nulos = ...\n\n"
    "print(nulos_por_col)\nprint(pct_nulos)",
    "nulos_por_col = consultas.isnull().sum()\n"
    "pct_nulos = (nulos_por_col / len(consultas) * 100).round(1)\n\n"
    "print(nulos_por_col)\nprint(pct_nulos)",
    "assert list(nulos_por_col.index) == list(consultas.columns)\n"
    "assert nulos_por_col.sum() == consultas.isnull().sum().sum()\n"
    "assert abs(pct_nulos['edad_paciente'] - nulos_por_col['edad_paciente'] / len(consultas) * 100) < 1e-9",
    pista="`isnull()` marca `True` donde hay `NaN` — `.sum()` sobre eso cuenta los `True` "
          "de cada columna.")

nb.ejercicio(
    "1.2 La consulta más incompleta",
    "Calcula `nulos_por_fila`, el número de campos vacíos **por fila** "
    "(`axis=1`), y guarda en `id_mas_incompleta` el `id_consulta` de la fila "
    "con más nulos.",
    "nulos_por_fila = ...   # TU CÓDIGO AQUÍ\nid_mas_incompleta = ...\n\n"
    "print(nulos_por_fila.max())\nprint('id:', id_mas_incompleta)",
    "nulos_por_fila = consultas.isnull().sum(axis=1)\n"
    "id_mas_incompleta = consultas.loc[nulos_por_fila.idxmax(), 'id_consulta']\n\n"
    "print(nulos_por_fila.max())\nprint('id:', id_mas_incompleta)",
    "assert nulos_por_fila.shape[0] == len(consultas)\n"
    "assert nulos_por_fila.max() == consultas.isnull().sum(axis=1).max()\n"
    "assert id_mas_incompleta in consultas['id_consulta'].values",
    pista="`idxmax()` sobre `nulos_por_fila` te da la ETIQUETA (el índice) de la fila "
          "peor, no el conteo.", nivel=1)

nb.md("## 2 · Núcleo\n\n"
      "Fíjate en algo raro: en el diagnóstico de arriba, `satisfaccion` salió con "
      "**0 nulos**. ¿En serio no le falta nada a esa columna? Ábrela con `.unique()` "
      "antes de creerte esa cifra.")

nb.ejercicio(
    "2.1 Nulos que se disfrazan",
    "Mira `consultas['satisfaccion'].unique()` y detecta los valores que en "
    "realidad representan datos ausentes. Construye `satisfaccion_limpia` "
    "reemplazando esos centinelas por `np.nan` con un solo `.replace({...})`, "
    "y conviértela a `float`.",
    "print(consultas['satisfaccion'].unique())\n\n"
    "satisfaccion_limpia = ...   # TU CÓDIGO AQUÍ\n\n"
    "print(satisfaccion_limpia.isnull().sum())",
    "print(consultas['satisfaccion'].unique())  # -999 y 'sin dato' cumplen el rol de NaN\n\n"
    "satisfaccion_limpia = (consultas['satisfaccion']\n"
    "                       .replace({'sin dato': np.nan, -999: np.nan})\n"
    "                       .astype(float))\n\n"
    "print(satisfaccion_limpia.isnull().sum())",
    "assert satisfaccion_limpia.dtype.kind == 'f'\n"
    "assert satisfaccion_limpia.isnull().sum() == consultas['satisfaccion'].isin(['sin dato', -999]).sum()\n"
    "assert not (satisfaccion_limpia == -999).any()",
    pista="`isnull()` no detecta `'sin dato'` ni `-999` — para pandas son valores tan "
          "válidos como cualquier otro, hasta que tú les digas lo contrario con `replace`.",
    nivel=2)

nb.ejercicio(
    "2.2 dropna con exigencia (thresh)",
    "`thresh` en `dropna` NO es un máximo de nulos permitido: es el número "
    "**mínimo de valores NO nulos** que exige por fila. Usa "
    "`thresh = consultas.shape[1] - 1` (como máximo un campo vacío por fila) "
    "para construir `consultas_filtradas`.",
    "thresh_min = consultas.shape[1] - 1\n\n"
    "consultas_filtradas = ...   # TU CÓDIGO AQUÍ\n\n"
    "print(len(consultas), '->', len(consultas_filtradas))",
    "thresh_min = consultas.shape[1] - 1\n\n"
    "consultas_filtradas = consultas.dropna(thresh=thresh_min)\n"
    "# sobrevive una fila si tiene AL MENOS thresh_min valores no-nulos\n\n"
    "print(len(consultas), '->', len(consultas_filtradas))",
    "assert len(consultas_filtradas) <= len(consultas)\n"
    "assert (consultas_filtradas.notnull().sum(axis=1) >= thresh_min).all()\n"
    "assert len(consultas_filtradas) == (consultas.notnull().sum(axis=1) >= thresh_min).sum()",
    pista="Con 6 columnas, `thresh=5` bota solo las filas con 2 o más campos vacíos — "
          "no confundas 'mínimo exigido' con 'máximo tolerado'.",
    nivel=2)

nb.ejercicio(
    "2.3 Mediana vs promedio, ¿a quién le creemos?",
    "Calcula `media_duracion` y `mediana_duracion` de `duracion_min` (ignoran "
    "los `NaN` solas). Luego construye `duracion_imputada` rellenando los nulos "
    "con la que consideres más robusta frente a los 3 outliers de la preparación.",
    "media_duracion = ...      # TU CÓDIGO AQUÍ\nmediana_duracion = ...\n\n"
    "duracion_imputada = ...   # TU CÓDIGO AQUÍ\n\n"
    "print(round(media_duracion, 1), round(mediana_duracion, 1))\n"
    "print(duracion_imputada.isnull().sum())",
    "media_duracion = consultas['duracion_min'].mean()\n"
    "mediana_duracion = consultas['duracion_min'].median()\n"
    "# la media se deja arrastrar por los 3 outliers (~90-120 min);\n"
    "# la mediana casi ni se entera. Para imputar, usamos la mediana.\n\n"
    "duracion_imputada = consultas['duracion_min'].fillna(mediana_duracion)\n\n"
    "print(round(media_duracion, 1), round(mediana_duracion, 1))\n"
    "print(duracion_imputada.isnull().sum())",
    "assert duracion_imputada.isnull().sum() == 0\n"
    "assert media_duracion > mediana_duracion, "
    "'con estos outliers la media debería quedar por encima de la mediana'\n"
    "_hueco = consultas['duracion_min'].isnull()\n"
    "assert (duracion_imputada[_hueco] == mediana_duracion).all()",
    pista="Los outliers estiran la media hacia ellos; la mediana los ignora casi por "
          "completo — por eso se prefiere para rellenar nulos en columnas con outliers.",
    nivel=2)

nb.ejercicio(
    "2.4 La moda salva la categórica",
    "`comuna` es categórica: ni media ni mediana tienen sentido ahí. Calcula "
    "`comuna_moda` con `.mode()[0]` y usa esa moda para construir "
    "`comuna_imputada` sin nulos.",
    "comuna_moda = ...   # TU CÓDIGO AQUÍ\n\n"
    "comuna_imputada = ...   # TU CÓDIGO AQUÍ\n\n"
    "print(comuna_moda)\nprint(comuna_imputada.isnull().sum())",
    "comuna_moda = consultas['comuna'].mode()[0]  # mode() da una Serie: puede haber empates\n"
    "comuna_imputada = consultas['comuna'].fillna(comuna_moda)\n\n"
    "print(comuna_moda)\nprint(comuna_imputada.isnull().sum())",
    "assert comuna_imputada.isnull().sum() == 0\n"
    "assert comuna_moda in consultas['comuna'].dropna().unique()\n"
    "assert comuna_moda == consultas['comuna'].mode()[0]",
    pista="`mode()` puede devolver más de un valor si hay empate — por eso siempre se "
          "pide `[0]`.",
    nivel=2)

nb.md("## 3 · Desafío")

nb.ejercicio(
    "3.1 El reporte antes/después 🏁",
    "Arma `consultas_limpia`: aplica a **todas** las columnas con problemas el "
    "arreglo que corresponda (el mismo truco de `satisfaccion` para los "
    "centinelas, mediana para `duracion_min` y `edad_paciente`, moda para "
    "`comuna`). Construye `reporte`, un DataFrame con el % de nulos de cada "
    "columna **antes** y **después**, y confirma que no queda ningún nulo.",
    "pct_antes = (consultas.isnull().sum() / len(consultas) * 100).round(1)\n\n"
    "consultas_limpia = consultas.copy()\n"
    "consultas_limpia['satisfaccion'] = ...   # TU CÓDIGO AQUÍ\n"
    "consultas_limpia['duracion_min'] = ...\n"
    "consultas_limpia['edad_paciente'] = ...\n"
    "consultas_limpia['comuna'] = ...\n\n"
    "pct_despues = ...   # TU CÓDIGO AQUÍ\n\n"
    "reporte = pd.DataFrame({'antes_%': pct_antes, 'despues_%': pct_despues})\n"
    "print(reporte)",
    "pct_antes = (consultas.isnull().sum() / len(consultas) * 100).round(1)\n\n"
    "consultas_limpia = consultas.copy()\n"
    "consultas_limpia['satisfaccion'] = (consultas_limpia['satisfaccion']\n"
    "                                    .replace({'sin dato': np.nan, -999: np.nan})\n"
    "                                    .astype(float))\n"
    "consultas_limpia['satisfaccion'] = consultas_limpia['satisfaccion'].fillna(\n"
    "    consultas_limpia['satisfaccion'].median())\n"
    "consultas_limpia['duracion_min'] = consultas_limpia['duracion_min'].fillna(\n"
    "    consultas_limpia['duracion_min'].median())\n"
    "consultas_limpia['edad_paciente'] = consultas_limpia['edad_paciente'].fillna(\n"
    "    consultas_limpia['edad_paciente'].median())\n"
    "consultas_limpia['comuna'] = consultas_limpia['comuna'].fillna(\n"
    "    consultas_limpia['comuna'].mode()[0])\n\n"
    "pct_despues = (consultas_limpia.isnull().sum() / len(consultas_limpia) * 100).round(1)\n\n"
    "reporte = pd.DataFrame({'antes_%': pct_antes, 'despues_%': pct_despues})\n"
    "print(reporte)",
    "assert consultas_limpia.isnull().sum().sum() == 0, 'no deben quedar nulos'\n"
    "assert (reporte['despues_%'] == 0).all()\n"
    "assert reporte.loc['edad_paciente', 'antes_%'] == pct_antes['edad_paciente']\n"
    "assert len(consultas_limpia) == len(consultas), 'imputar no debe borrar filas'",
    pista="Ojo: `satisfaccion` primero necesita el `replace` del ejercicio 2.1 — recién "
          "después de eso tiene sentido calcularle una mediana.",
    nivel=3)

nb.cierre("Nulos")
nb.save()
print("nb06 OK")
