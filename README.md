# Visualizador TOPD — NumPy y Pandas

Visualizador interactivo para enseñar NumPy y Pandas en las ayudantías del
**Taller de Obtención y Preparación de Datos** (TOPD). Cada operación se muestra
como una animación sobre celdas y tablas: los estudiantes ven *qué celda va a
dónde*, no solo el resultado final.

## Uso

- **Sin instalar nada**: abre `index.html` en cualquier navegador.
- **Un solo archivo para compartir**: `python tools/build.py` genera
  `dist/visualizador-topd.html` con todo inlineado (CSS + JS), ideal para
  mandarlo por WhatsApp/Canvas o usarlo sin internet.
- **Modo presentación**: botón «🖥️ Presentar» agranda celdas y tipografía para
  el proyector. Tema claro/oscuro con «🌗».
- **Teclado**: `←`/`→` avanzan los pasos de las animaciones, `1`–`8` cambian de módulo.
- **Portada**: el menú es un DataFrame — columnas = temas, filas = contenidos;
  cada celda navega a su tarjeta (y las celdas `NaN` también enseñan algo).

## Módulos (en el orden del curso)

| # | Módulo | Qué se visualiza |
|---|--------|------------------|
| 1 | Arrays NumPy | `reshape` animado, `axis=0/1` paso a paso, máscaras booleanas, broadcasting, `np.where`, `argsort`/`argmin`/`argmax` |
| 2 | DataFrames | anatomía (índice/columnas/Series), `loc` vs `iloc` |
| 3 | Leer archivos | el archivo crudo (csv, excel, json, parquet, html) consumiéndose para armar el df; `sep`, `header`, `index_col`, `skiprows` |
| 4 | Fechas | `to_datetime`, accesor `.dt`, `Timedelta`, `resample`, `date_range` |
| 5 | Visualización | qué gráfico usar según la pregunta, anatomía de la figura, `plt` vs `ax` |
| 6 | Valores perdidos | matriz de nulos estilo missingno, `dropna`, `fillna` |
| 7 | Outliers | boxplot interactivo, umbral IQR/z-score, media vs mediana |
| 8 | Data wrangling | duplicados, `replace`/`map`, `pd.cut`, `sort_values` |
| 9 | Joins y concat | `merge` con llaves conectadas, Venn por `how`, `concat` |
| 0 | GroupBy y pivoteo | split-apply-combine animado, `pivot_table` como heatmap |

El número es la tecla que abre cada módulo; la portada se abre con la tecla `Inicio` o con un clic. Además hay una
sección **🎯 Ejercicios** con predice-la-salida, detective de bugs, simulacro
cronometrado, boss final, traductor de errores, Python real y modo en vivo.

Cada tarjeta muestra el **código pandas/numpy equivalente**, que se actualiza al
cambiar los parámetros (el parámetro que cambió queda destacado).

## Estructura

```
index.html        entrada (multi-archivo, para desarrollo y GitHub Pages)
css/app.css       paleta (claro/oscuro), celdas, tablas, controles
js/core.js        shell, navegación, CellGrid, DfTable, Stepper, FLIP
js/mod-*.js       un archivo por módulo (se registran con registerModule)
tools/build.py    genera dist/visualizador-topd.html (archivo único)
```

Los datasets son pequeños e inventados para el visualizador (estudiantes y
carreras, ventas de cafetería, sueldos de analistas, bicicletas de Concepción).
