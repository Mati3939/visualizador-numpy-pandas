# Notebook 07 — Outliers y limpieza (contexto Control 4: VeloCity)
from nbkit import Notebook, VIZ

nb = Notebook(
    7, "outliers_wrangling", "Outliers y limpieza: el taller de VeloCity", "🚲",
    "detectar duplicados, normalizar texto sucio, cazar outliers con IQR, "
    "discretizar con `pd.cut` y codificar con `map` — el kit completo de limpieza.",
    [("outliers", "Outliers"), ("wrangling", "Data wrangling")],
    "## Contexto: VeloCity, arriendo de bicicletas\n\n"
    "El sistema de arriendo VeloCity exporta sus viajes desde tres apps distintas "
    "y el resultado es un desastre: viajes duplicados, duraciones imposibles y la "
    "columna de tipo de usuario escrita de cuatro maneras — el mismo caos del "
    "**Control 4** del curso. Te toca dejarlo utilizable.")

nb.md("## 0 · Preparación")
nb.code(
    "import numpy as np\nimport pandas as pd\n\n"
    "rng = np.random.default_rng(404)\n"
    "n = 60\n"
    "viajes = pd.DataFrame({\n"
    "    'id_viaje': np.arange(1, n + 1),\n"
    "    'duracion_min': rng.normal(25, 8, n).round(1).clip(4, None),\n"
    "    'tipo_usuario': rng.choice(['MENSUAL', 'mensual ', 'Mensual', 'diario', 'DIARIO'], n),\n"
    "    'comuna': rng.choice(['Concepción', 'Talcahuano', 'San Pedro'], n),\n"
    "})\n"
    "# 3 viajes con duraciones absurdas: bicicletas mal ancladas que siguieron 'en viaje'\n"
    "viajes.loc[[7, 31, 52], 'duracion_min'] = [720.0, 545.0, 610.0]\n"
    "# la exportación duplicó algunas filas completas\n"
    "viajes = pd.concat([viajes, viajes.iloc[[3, 15, 28]]], ignore_index=False)\n"
    "viajes = viajes.sample(frac=1, random_state=1).reset_index(drop=True)\n"
    "print(len(viajes), 'filas')\nviajes.head()")

nb.md("## 1 · Calentamiento\n\n"
      f"Las cuatro operaciones de hoy están animadas en [{VIZ}#wrangling]({VIZ}#wrangling) "
      f"y [{VIZ}#outliers]({VIZ}#outliers).")

nb.ejercicio(
    "1.1 ¿Cuántas filas son clones?",
    "Cuenta en `n_dup` cuántas filas están **duplicadas exactas** (con "
    "`duplicated()`), y construye `viajes_unicos` sin los clones. Verifica el "
    "largo resultante.",
    "n_dup = ...           # TU CÓDIGO AQUÍ\nviajes_unicos = ...\n\n"
    "print(n_dup, 'duplicados ·', len(viajes_unicos), 'filas únicas')",
    "n_dup = viajes.duplicated().sum()          # keep='first': la primera copia no se marca\n"
    "viajes_unicos = viajes.drop_duplicates()\n\n"
    "print(n_dup, 'duplicados ·', len(viajes_unicos), 'filas únicas')",
    "assert n_dup == viajes.duplicated().sum()\n"
    "assert len(viajes_unicos) == len(viajes) - n_dup\n"
    "assert viajes_unicos.duplicated().sum() == 0, 'no debe quedar ningún duplicado'",
    pista="`duplicated()` marca como duplicado desde la SEGUNDA aparición en "
          "adelante — la original no cuenta.")

nb.ejercicio(
    "1.2 Un solo formato de usuario",
    "Mira `viajes_unicos['tipo_usuario'].unique()`: el mismo concepto está escrito "
    "de varias formas (mayúsculas, espacios colgando). Normaliza la columna en "
    "`tipo_limpio` con `.str.strip().str.lower()` — deben quedar solo "
    "`'mensual'` y `'diario'`.",
    "print(viajes_unicos['tipo_usuario'].unique())\n\n"
    "tipo_limpio = ...   # TU CÓDIGO AQUÍ\n\nprint(tipo_limpio.unique())",
    "print(viajes_unicos['tipo_usuario'].unique())\n\n"
    "tipo_limpio = viajes_unicos['tipo_usuario'].str.strip().str.lower()\n"
    "# strip saca los espacios de los bordes; lower unifica mayúsculas\n\n"
    "print(tipo_limpio.unique())",
    "assert set(tipo_limpio.unique()) == {'mensual', 'diario'}\n"
    "assert len(tipo_limpio) == len(viajes_unicos)",
    pista="Los métodos de texto van tras el accesor `.str` — y se pueden encadenar: "
          "`.str.strip().str.lower()`.")

nb.md("## 2 · Núcleo")

nb.ejercicio(
    "2.1 Cazar outliers con IQR",
    "Sobre `viajes_unicos['duracion_min']` calcula `Q1`, `Q3`, `IQR` y los "
    "límites `lim_inf` / `lim_sup` con el factor clásico 1.5. Filtra en "
    "`outliers` las filas fuera de los límites. ¿Aparecen las bicicletas mal "
    "ancladas?",
    "Q1, Q3 = ...   # TU CÓDIGO AQUÍ (quantile)\nIQR = ...\n"
    "lim_inf = ...\nlim_sup = ...\noutliers = ...\n\n"
    "print(f'límites [{lim_inf:.1f}, {lim_sup:.1f}]')\nprint(outliers[['id_viaje', 'duracion_min']])",
    "Q1, Q3 = viajes_unicos['duracion_min'].quantile([0.25, 0.75])\n"
    "IQR = Q3 - Q1\n"
    "lim_inf = Q1 - 1.5 * IQR\nlim_sup = Q3 + 1.5 * IQR\n"
    "outliers = viajes_unicos[(viajes_unicos['duracion_min'] < lim_inf) |\n"
    "                         (viajes_unicos['duracion_min'] > lim_sup)]\n\n"
    "print(f'límites [{lim_inf:.1f}, {lim_sup:.1f}]')\nprint(outliers[['id_viaje', 'duracion_min']])",
    "assert IQR == Q3 - Q1\n"
    "assert ((outliers['duracion_min'] < lim_inf) | (outliers['duracion_min'] > lim_sup)).all()\n"
    "assert set([720.0, 545.0, 610.0]).issubset(set(outliers['duracion_min'])), "
    "'las 3 bicicletas mal ancladas deben caer como outliers'",
    pista=f"Es la misma cuenta del boxplot interactivo: {VIZ}#outliers — "
          "ahí puedes mover el umbral y ver qué puntos caen.",
    nivel=2)

nb.ejercicio(
    "2.2 ¿Cuánto mienten los outliers?",
    "Calcula media y mediana de `duracion_min` **con** outliers "
    "(`media_con`, `mediana_con`) y **sin** ellos (`media_sin`, `mediana_sin`, "
    "usando los límites del ejercicio anterior). En el comentario responde: "
    "¿cuál de las dos métricas se movió más y por qué?",
    "media_con = ...      # TU CÓDIGO AQUÍ\nmediana_con = ...\n"
    "sin_out = ...\nmedia_sin = ...\nmediana_sin = ...\n\n"
    "# se movió más la <media/mediana> porque: <tu explicación>\n"
    "print(f'media {media_con:.1f} -> {media_sin:.1f}')\n"
    "print(f'mediana {mediana_con:.1f} -> {mediana_sin:.1f}')",
    "media_con = viajes_unicos['duracion_min'].mean()\n"
    "mediana_con = viajes_unicos['duracion_min'].median()\n"
    "sin_out = viajes_unicos[(viajes_unicos['duracion_min'] >= lim_inf) &\n"
    "                        (viajes_unicos['duracion_min'] <= lim_sup)]\n"
    "media_sin = sin_out['duracion_min'].mean()\n"
    "mediana_sin = sin_out['duracion_min'].median()\n\n"
    "# se movió más la MEDIA: los outliers la arrastran hacia arriba porque suma\n"
    "# todos los valores; la mediana solo mira el del medio y apenas se inmuta\n"
    "print(f'media {media_con:.1f} -> {media_sin:.1f}')\n"
    "print(f'mediana {mediana_con:.1f} -> {mediana_sin:.1f}')",
    "assert len(sin_out) == len(viajes_unicos) - len(outliers)\n"
    "assert media_con > media_sin, 'los outliers gigantes deben inflar la media'\n"
    "assert abs(media_con - media_sin) > abs(mediana_con - mediana_sin), "
    "'la media debe moverse más que la mediana'",
    nivel=2)

nb.ejercicio(
    "2.3 Tramos con pd.cut (y su NaN silencioso)",
    "Discretiza la duración de `sin_out` en `tramo`: bins `[0, 15, 30, np.inf]` "
    "con etiquetas `['corto', 'medio', 'largo']`. ¿Por qué el último bin es "
    "`np.inf` y no un número «suficientemente grande»? Escríbelo en el comentario.",
    "tramo = ...   # TU CÓDIGO AQUÍ\n\n"
    "# el último bin es np.inf porque: <tu explicación>\n"
    "print(tramo.value_counts())",
    "tramo = pd.cut(sin_out['duracion_min'], bins=[0, 15, 30, np.inf],\n"
    "               labels=['corto', 'medio', 'largo'])\n\n"
    "# el último bin es np.inf porque si un valor queda FUERA de los bins,\n"
    "# pd.cut lo convierte en NaN sin avisar — np.inf garantiza que nada se escape\n"
    "print(tramo.value_counts())",
    "assert tramo.isnull().sum() == 0, 'ningún viaje debe quedar fuera de los tramos'\n"
    "assert set(tramo.unique()).issubset({'corto', 'medio', 'largo'})\n"
    "assert tramo.value_counts().sum() == len(sin_out)",
    pista="Prueba mentalmente un viaje de 31 minutos con bins [0, 15, 30]: no cae "
          "en ninguno → NaN silencioso. El detective de bugs del visualizador tiene "
          "este caso exacto.",
    nivel=2)

nb.ejercicio(
    "2.4 map y su trampa",
    "Codifica `tipo_limpio` a números en `tipo_cod`: `'mensual' → 1`, "
    "`'diario' → 0`, usando `.map({...})`. Después responde con un assert propio: "
    "¿qué habría pasado si el diccionario solo trajera `'mensual'`?",
    "tipo_cod = ...   # TU CÓDIGO AQUÍ\n\n"
    "# experimento: map con el diccionario incompleto\n"
    "experimento = tipo_limpio.map({'mensual': 1})\n"
    "print(tipo_cod.value_counts())\nprint('NaN en el experimento:', experimento.isnull().sum())",
    "tipo_cod = tipo_limpio.map({'mensual': 1, 'diario': 0})\n\n"
    "# experimento: map con el diccionario incompleto\n"
    "experimento = tipo_limpio.map({'mensual': 1})\n"
    "# todo lo que no está en el diccionario se vuelve NaN: los 'diario' se pierden\n"
    "print(tipo_cod.value_counts())\nprint('NaN en el experimento:', experimento.isnull().sum())",
    "assert set(tipo_cod.unique()) == {0, 1}\n"
    "assert tipo_cod.isnull().sum() == 0\n"
    "assert experimento.isnull().sum() == (tipo_limpio == 'diario').sum(), "
    "'con el dict incompleto, cada diario debió volverse NaN'",
    pista="`map` no perdona: clave ausente = NaN. Si solo quieres reemplazar "
          "ALGUNOS valores y dejar el resto intacto, eso es `replace`.",
    nivel=2)

nb.md("## 3 · Desafío")

nb.ejercicio(
    "3.1 El pipeline completo 🏁",
    "Reconstruye todo el proceso en una sola pasada sobre `viajes` (el original "
    "sucio) y guarda el resultado en `limpio`: ① sin duplicados exactos, "
    "② `tipo_usuario` normalizado, ③ sin outliers de duración (IQR 1.5 calculado "
    "sobre los datos ya deduplicados), ④ con la columna nueva `tramo`. "
    "Reporta `resumen`: viajes por tramo y tipo de usuario (groupby doble o "
    "pivot, como prefieras).",
    "limpio = ...   # TU CÓDIGO AQUÍ (encadena o usa pasos intermedios)\n"
    "resumen = ...\n\n"
    "print(len(viajes), '->', len(limpio))\nprint(resumen)",
    "limpio = viajes.drop_duplicates().copy()\n"
    "limpio['tipo_usuario'] = limpio['tipo_usuario'].str.strip().str.lower()\n"
    "_q1, _q3 = limpio['duracion_min'].quantile([0.25, 0.75])\n"
    "_iqr = _q3 - _q1\n"
    "limpio = limpio[(limpio['duracion_min'] >= _q1 - 1.5 * _iqr) &\n"
    "                (limpio['duracion_min'] <= _q3 + 1.5 * _iqr)]\n"
    "limpio['tramo'] = pd.cut(limpio['duracion_min'], bins=[0, 15, 30, np.inf],\n"
    "                         labels=['corto', 'medio', 'largo'])\n"
    "resumen = limpio.groupby(['tramo', 'tipo_usuario'], observed=True).size()\n\n"
    "print(len(viajes), '->', len(limpio))\nprint(resumen)",
    "assert limpio.duplicated().sum() == 0\n"
    "assert set(limpio['tipo_usuario'].unique()) == {'mensual', 'diario'}\n"
    "assert limpio['duracion_min'].max() < 500, 'las bicicletas mal ancladas deben quedar fuera'\n"
    "assert 'tramo' in limpio.columns and limpio['tramo'].isnull().sum() == 0\n"
    "assert resumen.sum() == len(limpio)",
    pista="El orden importa: deduplicar ANTES de calcular los cuartiles (los clones "
          "distorsionan los percentiles) y discretizar al final, sobre los datos ya sanos.",
    nivel=3)

nb.cierre("Wrangling")
nb.save()
print("nb07 OK")
