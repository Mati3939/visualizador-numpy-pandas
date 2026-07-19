# Notebook 02 — Máscaras booleanas y np.where (continúa el contexto del Control 1)
from nbkit import Notebook, VIZ

nb = Notebook(
    2, "numpy_mascaras", "Máscaras booleanas y np.where", "🎭",
    "filtrar arrays con condiciones, combinar condiciones con `&`/`|` y clasificar "
    "valores con `np.where` — sin escribir un solo `for`.",
    [("numpy", "Arrays NumPy")],
    "## Contexto: sigue la vigilancia epidemiológica en el Biobío\n\n"
    "Misma pega de la SEREMI de Salud que en el notebook 01, un mes después. Ya "
    "sabes sumar y hacer `reshape`; ahora necesitan que **detectes brotes**: días "
    "y comunas donde los casos se disparan, cruzados con la temperatura ambiente.")

nb.md("## 0 · Preparación")
nb.code(
    "import numpy as np\n\n"
    "np.random.seed(2026)  # mismos datos para todo el mundo\n"
    "COMUNAS = ['Concepción', 'Talcahuano', 'San Pedro', 'Hualpén']\n"
    "# casos notificados por día: 4 comunas (filas) × 28 días (columnas)\n"
    "casos = np.random.randint(5, 60, size=(4, 28))\n"
    "casos_conce = casos[0]  # la fila de Concepción, para calentar\n"
    "# temperatura mínima diaria en la región (°C) — un solo valor por día\n"
    "temperaturas = np.random.randint(2, 18, size=28)\n"
    "print(casos.shape, temperaturas.shape)")

nb.md("## 1 · Calentamiento")

nb.ejercicio(
    "1.1 Tu primera máscara",
    "Construye `mask_alto`, un array booleano (mismo tamaño que `casos_conce`) que "
    "marque con `True` los días con **más de 40 casos**. Luego cuenta cuántos días "
    "fueron así, sin loops, y guárdalo en `dias_criticos`.",
    "mask_alto = ...       # TU CÓDIGO AQUÍ\ndias_criticos = ...\n\n"
    "print(mask_alto)\nprint('días críticos:', dias_criticos)",
    "mask_alto = casos_conce > 40\ndias_criticos = mask_alto.sum()  # True vale 1, False vale 0\n\n"
    "print(mask_alto)\nprint('días críticos:', dias_criticos)",
    "assert mask_alto.dtype == bool, 'mask_alto debe ser booleano'\n"
    "assert mask_alto.shape == casos_conce.shape\n"
    "assert dias_criticos == (casos_conce > 40).sum()",
    pista="Comparar un array contra un número (`casos_conce > 40`) te devuelve OTRO "
          "array, del mismo tamaño, lleno de `True`/`False`.")

nb.ejercicio(
    "1.2 De la máscara al dato",
    "Con `mask_alto` ya calculada, arma:\n"
    "- `valores_criticos`: los CASOS (los números) de los días que superaron el umbral\n"
    "- `dias_criticos_arr`: en qué NÚMERO DE DÍA (1 a 28) ocurrió cada uno "
    "(usa `dias = np.arange(1, 29)`)",
    "dias = np.arange(1, 29)\nvalores_criticos = ...     # TU CÓDIGO AQUÍ\n"
    "dias_criticos_arr = ...\n\n"
    "print(valores_criticos)\nprint(dias_criticos_arr)",
    "dias = np.arange(1, 29)\nvalores_criticos = casos_conce[mask_alto]  # indexar con la máscara filtra\n"
    "dias_criticos_arr = dias[mask_alto]        # la MISMA máscara sirve para cualquier array del mismo largo\n\n"
    "print(valores_criticos)\nprint(dias_criticos_arr)",
    "assert len(valores_criticos) == mask_alto.sum()\n"
    "assert (valores_criticos > 40).all(), 'todos los valores extraídos deben superar 40'\n"
    "assert len(dias_criticos_arr) == len(valores_criticos)\n"
    "assert set(dias_criticos_arr).issubset(set(range(1, 29)))",
    pista="`a[mask]` funciona con CUALQUIER array del mismo tamaño que `mask` — "
          "no solo con el array que usaste para crearla.")

nb.md("## 2 · Núcleo: combinar condiciones y clasificar")

nb.ejercicio(
    "2.1 La trampa de los paréntesis",
    "Construye `mask_moderado`: los días con casos **entre 20 y 40** (sin incluir "
    "los límites) en `casos_conce`, combinando dos condiciones con `&`.",
    "mask_moderado = ...   # TU CÓDIGO AQUÍ\n\nprint(mask_moderado)\nprint(mask_moderado.sum())",
    "# cada condición va entre paréntesis: & tiene MÁS precedencia que >, y sin\n"
    "# paréntesis Python intentaría resolver primero el '&' y truena\n"
    "mask_moderado = (casos_conce > 20) & (casos_conce < 40)\n\n"
    "print(mask_moderado)\nprint(mask_moderado.sum())",
    "assert mask_moderado.dtype == bool\n"
    "assert (casos_conce[mask_moderado] > 20).all() and (casos_conce[mask_moderado] < 40).all()\n"
    "assert mask_moderado.sum() == ((casos_conce > 20) & (casos_conce < 40)).sum()",
    pista="En Python, `&` se evalúa ANTES que `>`. Escribir `casos_conce > 20 & "
          "casos_conce < 40` sin paréntesis casi seguro lanza un error o da cualquier "
          "cosa — encierra cada comparación: `(casos_conce > 20) & (casos_conce < 40)`.",
    nivel=2)

nb.ejercicio(
    "2.2 np.where: clasificar en un solo paso",
    "Crea `etiquetas`, un array de texto que diga `'brote'` en los días con más de "
    "40 casos y `'normal'` en el resto, usando `np.where` (nada de loops ni if).",
    "etiquetas = ...   # TU CÓDIGO AQUÍ\n\nprint(etiquetas)",
    "etiquetas = np.where(casos_conce > 40, 'brote', 'normal')\n\nprint(etiquetas)",
    "assert etiquetas.shape == casos_conce.shape\n"
    "assert (etiquetas[casos_conce > 40] == 'brote').all()\n"
    "assert (etiquetas[casos_conce <= 40] == 'normal').all()",
    pista="`np.where(condición, valor_si_true, valor_si_false)` — como un `if/else` "
          "que corre sobre el array entero de una vez.",
    nivel=2)

nb.ejercicio(
    "2.3 np.where anidado: tres categorías",
    "Ahora clasifica cada día en tres niveles según `casos_conce`: `'bajo'` "
    "(≤ 20), `'medio'` (21 a 40) o `'alto'` (> 40). Guarda el resultado en "
    "`nivel_riesgo`, anidando un `np.where` dentro de otro.",
    "nivel_riesgo = ...   # TU CÓDIGO AQUÍ\n\nprint(nivel_riesgo)",
    "# el np.where de adentro resuelve 'bajo' vs 'medio'; el de afuera separa 'alto'\n"
    "nivel_riesgo = np.where(casos_conce > 40, 'alto',\n"
    "                        np.where(casos_conce > 20, 'medio', 'bajo'))\n\n"
    "print(nivel_riesgo)",
    "assert nivel_riesgo.shape == casos_conce.shape\n"
    "assert set(nivel_riesgo).issubset({'bajo', 'medio', 'alto'})\n"
    "assert (nivel_riesgo[casos_conce > 40] == 'alto').all()\n"
    "assert (nivel_riesgo[casos_conce <= 20] == 'bajo').all()\n"
    "assert ((casos_conce > 20) & (casos_conce <= 40)).sum() == (nivel_riesgo == 'medio').sum()",
    pista="El segundo `np.where` reemplaza el 'en caso contrario' del primero: "
          "solo se evalúa para los días que NO son 'alto'.",
    nivel=2)

nb.ejercicio(
    "2.4 ¿Qué porcentaje del mes fue crítico?",
    "Calcula `pct_criticos`: el PORCENTAJE de días de `casos_conce` con más de 40 "
    "casos. Pista: el promedio de una máscara booleana ya es una proporción.",
    "pct_criticos = ...   # TU CÓDIGO AQUÍ\n\nprint(round(pct_criticos, 1))",
    "pct_criticos = (casos_conce > 40).mean() * 100  # mean() de bools = proporción de True\n\n"
    "print(round(pct_criticos, 1))",
    "assert 0 <= pct_criticos <= 100\n"
    "assert abs(pct_criticos - (casos_conce > 40).sum() / len(casos_conce) * 100) < 1e-9",
    pista="`mask.mean()` promedia 1s y 0s, así que ya te da la FRACCIÓN de `True` — "
          "solo falta multiplicar por 100.",
    nivel=2)

nb.md("## 3 · Desafío: casos altos + frío, comuna por comuna 🏁\n\n"
      f"Mira el barrido de máscaras 2D en [{VIZ}#numpy]({VIZ}#numpy) antes de seguir: "
      "`casos` tiene forma (4, 28) pero `temperaturas` tiene forma (28,) — numpy "
      "los combina igual, alineando por día (**broadcasting**).")

nb.ejercicio(
    "3.1 Frío y brote a la vez",
    "Para CADA comuna, cuenta cuántos días coincidieron 'casos > 40' Y "
    "'temperatura < 6°C'. Construye:\n"
    "- `mask_casos_altos`: booleana, forma igual a `casos` (4, 28)\n"
    "- `mask_frio`: booleana, forma igual a `temperaturas` (28,)\n"
    "- `combinado`: la combinación de ambas (numpy alinea automáticamente por día)\n"
    "- `dias_criticos_comuna`: un valor por comuna (4,) con el conteo\n"
    "- `comuna_peor`: el NOMBRE de la comuna con más días así",
    "mask_casos_altos = ...    # TU CÓDIGO AQUÍ, forma (4, 28)\n"
    "mask_frio = ...           # forma (28,)\n"
    "combinado = ...           # forma (4, 28): numpy repite mask_frio en cada fila\n"
    "dias_criticos_comuna = ...   # forma (4,)\n"
    "comuna_peor = ...\n\n"
    "print(dict(zip(COMUNAS, dias_criticos_comuna)))\nprint('peor:', comuna_peor)",
    "mask_casos_altos = casos > 40                 # (4, 28)\n"
    "mask_frio = temperaturas < 6                  # (28,)\n"
    "combinado = mask_casos_altos & mask_frio       # broadcasting: (4,28) & (28,) -> (4,28)\n"
    "dias_criticos_comuna = combinado.sum(axis=1)   # recorre columnas -> un valor por comuna\n"
    "comuna_peor = COMUNAS[dias_criticos_comuna.argmax()]\n\n"
    "print(dict(zip(COMUNAS, dias_criticos_comuna)))\nprint('peor:', comuna_peor)",
    "assert mask_casos_altos.shape == casos.shape\n"
    "assert mask_frio.shape == temperaturas.shape\n"
    "assert combinado.shape == casos.shape\n"
    "assert dias_criticos_comuna.shape == (4,)\n"
    "for _i in range(4):\n"
    "    assert dias_criticos_comuna[_i] == (mask_casos_altos[_i] & mask_frio).sum(), f'revisa fila {_i}'\n"
    "assert comuna_peor in COMUNAS\n"
    "assert dias_criticos_comuna[COMUNAS.index(comuna_peor)] == dias_criticos_comuna.max()",
    pista="No necesitas repetir `mask_frio` a mano: numpy la 'estira' para que calce "
          "con las 4 filas de `mask_casos_altos` — eso es broadcasting.",
    nivel=3)

nb.cierre("NumPy")
nb.save()
print("nb02 OK")
