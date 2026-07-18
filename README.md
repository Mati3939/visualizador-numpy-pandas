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
- **Teclado**: `←`/`→` avanzan los pasos de las animaciones, `1`–`7` cambian de módulo.

## Módulos (siguen el orden del curso)

| # | Módulo | Semana | Qué se visualiza |
|---|--------|--------|------------------|
| 1 | Arrays NumPy | 1–2 | `reshape` animado, `axis=0/1` paso a paso, máscaras booleanas, broadcasting |
| 2 | DataFrames | 3 | anatomía (índice/columnas/Series), `loc` vs `iloc` |
| 3 | Valores perdidos | 4 | matriz de nulos estilo missingno, `dropna`, `fillna` |
| 4 | Outliers | 8–9 | boxplot interactivo, umbral IQR/z-score, media vs mediana |
| 5 | Data wrangling | 9–10 | duplicados, `replace`/`map`, `pd.cut`, `sort_values` |
| 6 | GroupBy y pivoteo | 11 | split-apply-combine animado, `pivot_table` como heatmap |
| 7 | Joins y concat | 12 | `merge` con llaves conectadas, Venn por `how`, `concat` |

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

Los datasets son pequeños y están inspirados en los del curso (estudiantes y
carreras, ventas de cafetería, sueldos de analistas, bicicletas de Concepción).
