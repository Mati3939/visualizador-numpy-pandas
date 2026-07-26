 Extensión de VS Code: animar celdas de notebook paso a paso

Fecha: 2026-07-25

## Contexto

El Visualizador TOPD ya tiene, dentro del sandbox de Python real (`js/ex-python.js`,
idea 15 de `ideas.txt`), un modo "🎬 Paso a paso": el usuario pega código pandas,
se ejecuta sentencia por sentencia sobre Pyodide (Python en el navegador), y cada
DataFrame/Series que cambia se anima con `dfDiff`/`DfTable` (motor de `js/core.js`).

La idea de esta spec es llevar esa misma experiencia a VS Code, pero operando
sobre el código real del notebook/`.py` que Matías o sus alumnos ya están
editando (por ejemplo `notebooks/04_dataframes.ipynb`), en vez de tener que
copiar el código a un sandbox aparte. Investigación previa: no existe una
extensión de VS Code equivalente; lo más cercano en el ecosistema es
PandasTutor (web, no VS Code, solo visualiza la última expresión) y Python
Tutor (visualiza memoria/variables genéricas, no transformaciones de
DataFrames).

## Objetivo (v1)

Agregar un botón "🎬 Animar celda" a las celdas de código Python de:
- notebooks `.ipynb` (toolbar de celda), y
- scripts `.py` con celdas `# %%` (CodeLens, Interactive Window).

Al apretarlo, se ejecuta el código de esa celda sentencia por sentencia contra
el kernel Jupyter real que ya está corriendo ese notebook/Interactive Window
(no un kernel aparte), y se abre un panel lateral (Webview) que anima cada
DataFrame/Series que cambió, reusando el motor visual existente del
Visualizador TOPD (`DfTable`, `dfDiff`, `Stepper` de `js/core.js`).

Alcance v1: solo DataFrame/Series (igual que el sandbox del navegador hoy).
Arrays de NumPy quedan para v2 — ver "Fuera de alcance".

## Enfoque general

"Animar celda" reemplaza a la corrida normal de esa celda (no se suma a ella):
ejecuta el mismo código, sentencia por sentencia, sobre el namespace real del
kernel, así que los efectos (prints, `plt.show()`, variables creadas) quedan
consistentes con una corrida normal — solo que además queda un registro de
qué cambió en cada paso.

El riesgo técnico central es conseguir, desde una extensión de VS Code que no
es la extensión Jupyter (`ms-toolsai.jupyter`), acceso al kernel que ya está
corriendo ese notebook, para ejecutar código en él y leer su salida. Jupyter
expone una API exportada para esto (pensada para extensiones de terceros como
Data Wrangler), pero no es una API pública estable de VS Code — es el único
punto de todo el diseño que no controlamos nosotros. Por eso el plan de
implementación debe arrancar con un spike que confirme esto antes de construir
el resto (ver "Riesgos").

## Componentes

1. **`topd_step_runner.py`** (recurso empaquetado con la extensión, nuevo
   archivo — no vive en el repo del visualizador). Adaptación de
   `PYHELPER`/`_pasos()` de `js/ex-python.js`:
   - En vez de `ns = {}` (namespace vacío, como en el sandbox del navegador),
     usa `ns = globals()` del kernel real, para que la celda vea las
     variables creadas por celdas anteriores.
   - Antes de ejecutar la primera sentencia de la celda, saca un snapshot
     (`_snap`) de todas las variables DataFrame/Series ya presentes en
     `globals()`, para que el diff del primer paso sea correcto (en el
     sandbox del navegador esto no hacía falta porque siempre arrancaba de
     cero).
   - Se inyecta una sola vez por sesión de kernel, de forma idempotente
     (`if '_pasos' not in globals(): exec(...)`), igual que en el sandbox.
   - Devuelve el mismo formato JSON que ya produce `_pasos()` hoy: lista de
     pasos con `{linea, src, out, err, vars}`, `vars` con snapshots
     `{kind, trunc, columns, index, rows}`.

2. **Extension host (TypeScript)** — nuevo paquete de extensión:
   - `extension.ts`: activación, registro de:
     - botón en la toolbar de celda (`contributes.menus."notebook/cell/title"`,
       con `when` de lenguaje Python) para `.ipynb`.
     - `CodeLensProvider` que agrega un lens "🎬 Animar celda" sobre cada
       marcador `# %%` en archivos `.py`.
   - Comando `topd.animateCell(cellUri, code)`:
     1. Resuelve el kernel activo del notebook/Interactive Window vía la API
        exportada de `ms-toolsai.jupyter`.
     2. Si `_pasos` no está definido en ese kernel, inyecta
        `topd_step_runner.py`.
     3. Ejecuta `_pasos(<código de la celda>)` y captura el JSON de stdout.
     4. Si el kernel no está disponible o la API no responde, deshabilita el
        botón con un tooltip explicativo en vez de fallar en silencio.
   - Abre (o reusa, si ya está abierto) un panel Webview lateral y le manda
     los pasos por `postMessage`.

3. **Webview harness** (HTML + JS empaquetado con la extensión) — página
   mínima que carga `js/core.js` tal cual (sin fork) y una función nueva,
   `mountSteps(container, pasos)`, extraída del cuerpo de `pasoAPaso()`/`ir()`
   en `ex-python.js` (resaltado de línea, `dfDiff` para variables que
   cambiaron, `DfTable` para variables nuevas, mensaje de error con el mismo
   estilo `bugmiss`), sin las partes específicas del sandbox del navegador
   (textarea, ejemplos, carga de Pyodide). Recibe los pasos por
   `window.addEventListener('message', ...)`.
   `DfTable`/`dfDiff` dependen enteramente de las clases y variables CSS de
   `css/app.css` (no solo del JS) — sin vendorear ese archivo también, el
   panel se vería sin estilo. `app.css` no tiene `@import`/`url()` externos,
   así que se puede copiar tal cual sin violar el CSP del Webview. Se apoya
   en `prefers-color-scheme` para claro/oscuro automático; no hace falta
   portar el botón de tema (v1).

## Flujo de datos

```
clic "Animar celda"
  -> extensión lee código de la celda
  -> resuelve kernel activo (API de ms-toolsai.jupyter)
  -> inyecta topd_step_runner.py si hace falta
  -> kernel.executeCode('_pasos(<código>)')
  -> JSON de pasos (uno por sentencia)
  -> postMessage al panel Webview
  -> mountSteps() arma el Stepper: línea resaltada, dfDiff/DfTable por
     variable, mensaje de error si corresponde
```

## Errores y casos borde

- Celda vacía o con error de sintaxis: `_pasos` devuelve el error de esa
  sentencia (`err`) sin abortar el resto; el panel lo muestra con el mismo
  estilo `bugmiss` que ya existe.
- API de Jupyter no disponible (extensión no instalada, notebook sin kernel
  corriendo): botón deshabilitado con tooltip, no un fallo silencioso.
- Efectos secundarios (prints, escritura de archivos, `plt.show()`): corren
  de verdad porque se ejecuta sobre el namespace real — por diseño, "Animar"
  reemplaza a la corrida normal, no se ejecuta además de ella.
- Celdas con control de flujo (`for`, `if`, `with`) se tratan como una sola
  sentencia top-level (igual que hoy en `ex-python.js`, que itera
  `tree.body` sin bajar a sub-bloques) — no se anima paso a paso el interior
  de un loop en v1.

## Fuera de alcance (v1)

- Arrays de NumPy (`_snap`/`_clean` solo reconocen DataFrame/Series hoy;
  extenderlos y usar `CellGrid` en el harness queda para v2, igual que en el
  sandbox del navegador).
- Animar el interior de bloques `for`/`if`/`with` sentencia por sentencia.
- Cualquier trigger automático (correr y animar en cada ejecución normal de
  celda): v1 es siempre manual, vía el botón/CodeLens.

## Testing

- `topd_step_runner.py`: probado sin VS Code, contra un kernel Jupyter local
  (o `jupyter_client`) usando código real de notebooks de
  `Archivos oficiales/` como fixtures.
- Webview harness: probado standalone abriendo el HTML en un navegador con
  un JSON de pasos fijo (fixture), sin extensión ni kernel de por medio.
- Extensión completa: manual, en el Extension Development Host, contra
  `notebooks/04_dataframes.ipynb`.

## Riesgos

- **Principal — RESUELTO por el spike (2026-07-25)**: se confirmó, contra
  una instalación real de `ms-toolsai.jupyter` (v2026.x) y un kernel vivo
  de `notebooks/04_dataframes.ipynb`, que el mecanismo funciona. Forma real
  de la API (distinta en dos puntos a la aproximación original del `.d.ts`):
  - `api.kernels.getKernel(uri)` es **async** y devuelve el **kernel
    directamente** (`language, status, onDidChangeStatus,
    onDidReceiveDisplayUpdate, executeCode, shutdown`), no envuelto en
    `{kernel, metadata}` como sugería la wiki.
  - `kernel.executeCode(code, token)` es un `AsyncGenerator` que entrega
    **una `Output` a la vez** (cada una con `.items: [{mime, data}]`), no
    un array de outputs por iteración.
  - Los `print()` del código ejecutado salen con mime
    `application/vnd.code.notebook.stdout`.
  - Verificado solo contra `.ipynb`; el caso Interactive Window (`.py` con
    `# %%`) usa el mismo `vscode.window.activeNotebookEditor` en teoría
    (el Interactive Window es un notebook especial por debajo), pero no se
    verificó manualmente — la Fase 2 debe incluir un chequeo puntual
    equivalente al del spike antes de dar por buena esa ruta.
