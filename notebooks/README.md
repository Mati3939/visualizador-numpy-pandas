# 📓 Batería de práctica — NumPy y Pandas paso a paso

Notebooks con problemas en contexto para aprender haciendo, pensados para
resolverse **con el [Visualizador TOPD](https://mati3939.github.io/visualizador-numpy-pandas/)
abierto al lado**: cada concepto que usas aquí está animado allá.

Cada ejercicio trae huecos `TU CÓDIGO AQUÍ` y una celda de **autochequeo**
(`assert`): si corre sin reclamar, vas bien. Las soluciones completas están
en [`soluciones/`](soluciones/).

| # | Notebook | Contexto | Temas |
|---|----------|----------|-------|
| 01 | [NumPy básico](01_numpy_basico.ipynb) | Vigilancia epidemiológica | arrays, shape, reshape, axis |
| 02 | [Máscaras y np.where](02_numpy_mascaras.ipynb) | Epidemiología II | filtrado lógico, condiciones |
| 03 | [Series](03_series.ipynb) | Laboratorio clínico | Series, alineación por índice |
| 04 | [DataFrames](04_dataframes.ipynb) | Laboratorio II | loc/iloc, filtros, exploración |
| 05 | [Matplotlib](05_visualizacion.ipynb) | Turismo aventura | hist, línea, barras, scatter |
| 06 | [Valores faltantes](06_valores_faltantes.ipynb) | Telemedicina | isnull, dropna, imputación |
| 07 | [Outliers y limpieza](07_outliers_wrangling.ipynb) | VeloCity (bicicletas) | IQR, duplicados, cut, map |
| 08 | [GroupBy y pivoteo](08_groupby_pivoteo.ipynb) | Cafetería de Concepción | groupby, agg, pivot_table |
| 09 | [Joins y concat](09_joins.ipynb) | Ciclovías de Concepción | merge, how, suffixes, concat |
| 10 | [Fechas + integrador](10_fechas_integrador.ipynb) | App de delivery | to_datetime, .dt, resample |

**Cómo usarlos**: ábrelos en [Google Colab](https://colab.research.google.com/github/Mati3939/visualizador-numpy-pandas/)
(cada notebook trae su botón), o localmente con Jupyter. Se recomienda seguirlos
en orden — el 10 amarra todo lo anterior.

**Para regenerarlos** (mantención): los notebooks se generan desde
`tools/notebooks/nbNN.py` con `python tools/notebooks/build_all.py`, que además
ejecuta cada solución completa como validación.
