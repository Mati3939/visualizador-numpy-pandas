# Animador TOPD — bucles paso a paso, pulido en vivo y demo del Certamen 1

Fecha: 2026-08-04
Repo afectado: `vscode-animador-topd` (no el Visualizador; acá vive sólo el spec)

## Motivación

La extensión ya está empaquetada como `.vsix` e instalada. Matías se la va a
mostrar **en vivo** a la profesora del curso: la maneja él, no se la instala
ella. Eso decide las prioridades: todo lo que se ve mientras se recorre un
paso a paso importa; nada de guías de instalación.

Del recorrido por el código salieron tres frentes.

**Datos anchos.** `_snap` trunca filas (`_HEAD_ROWS = 8`) pero no columnas.
Verificado contra `casen2022_muestra.csv` (15.000 × 79): el snapshot manda las
79 columnas. `.dfwrap` tiene `overflow-x:auto`, así que no se rompe nada — pero
queda una tabla de 79 columnas con scroll horizontal en un panel lateral. El
proyecto semestral del curso *es* CASEN, así que la pregunta "¿sirve para el
proyecto?" es esperable, y hoy la respuesta se ve mal.

**Bucles.** Un `for` es hoy un solo paso. Es el último agujero pedagógico
grande: la mecánica de un bucle es justo lo que a los alumnos no les entra.

**Asperezas en vivo.** Sin feedback de progreso ni guarda contra doble clic;
botones ◀/▶ que no se deshabilitan; sin teclado; y un comando `TOPD: Spike`
de andamiaje todavía publicado en la paleta.

## Alcance

Dentro:

1. Truncar columnas en el runner y rotularlo.
2. Entrar a `for` / `while` / `if` / `with` / `try` con `sys.settrace`.
3. Progreso, guarda contra doble clic, notebook resuelto por la celda, ocultar
   el comando Spike.
4. Teclado ←/→ y Home/End, botones deshabilitados en los extremos, rótulos de
   columnas truncadas y de número de vuelta.
5. Demo nueva sobre el dataset del Certamen 1 2026-1.

Fuera:

- Autoplay del paso a paso. Si lo narra Matías, avanzar a mano es mejor.
- Guía de instalación para terceros.
- Entrar a funciones que el alumno definió en otra celda (ver "Límite del
  trazado").

## Contrato JSON

Es la interfaz entre `python/topd_step_runner.py` y `media/mount-steps.js`.
Los campos marcados NUEVO son los que agrega este trabajo; el resto ya existe
y **no cambia de forma**.

```
_pasos(src, ns) -> {'pre': {nombre: snap}, 'pasos': [paso, ...]}

snap df      {kind:'df', trunc:int, truncc:int, columns:[str], index:[str], rows:[[val]]}
                                    ^^^^^^^^^^ NUEVO: columnas ocultas (0 si no se truncó)
snap series  {kind:'series', trunc:int, columns:[str], index:[str], rows:[[val]], bool?:true}
snap array   {kind:'array', shape:[int], dtype:str, trunc:bool, data:[[val]]}
snap valor   {kind:'valor', repr:str, num?:number}

paso {
  linea:     int,
  src:       str,
  out:       str,
  err:       str | None,
  resultado: snap | None,
  png:       str | None,
  vars:      {nombre: snap},
  vuelta:    int | None,        NUEVO: nº de iteración 1-based, sólo dentro de for/while
  resumen:   {vueltas:int, omitidos:int} | None,   NUEVO: sólo en el paso colapsado
}
```

`truncc` va sólo en los snapshots `kind:'df'`; el webview lee `snap.truncc || 0`
para que un payload viejo no rompa nada. Las Series tienen una sola columna y
no lo llevan.

## 1. Truncar columnas

`_HEAD_COLS = 10`, al lado de `_HEAD_ROWS`. En la rama `DataFrame` de `_snap`,
recortar `head` a las primeras 10 columnas y devolver `truncc` con cuántas
quedaron fuera (`max(0, len(val.columns) - _HEAD_COLS)`).

El rótulo, en `VarView.caption()`:

```
casen — primeras 8 filas de 15.000 · 10 de 79 columnas
```

La parte de columnas sólo aparece si `truncc > 0`, igual que hoy la de filas.
`mountResultado` lleva el mismo agregado.

La máscara booleana se pinta sobre el snapshot ya recortado, así que
`createMascara` no necesita cambios: recibe las mismas 10 columnas.

## 2. Entrar a los bloques compuestos

### Principio

No se reimplementa la semántica de Python. El nodo compuesto se compila y se
ejecuta **entero**, igual que hoy; lo único que cambia es que se ejecuta bajo
`sys.settrace`, que va reportando cada línea. Los `break`, `continue`, `else`
de bucle, y las excepciones los sigue resolviendo el intérprete.

Las sentencias simples (todo lo que no es compuesto) siguen exactamente por el
camino actual, `exec`/`eval`. Esto es deliberado: cero riesgo de regresión en
todo lo que ya funciona y está cubierto por los 40 tests existentes.

### Nodos que se trazan

`ast.For`, `ast.While`, `ast.If`, `ast.With`, `ast.Try`. No `AsyncFor` ni
`AsyncWith` (no aparecen en el curso). Un `FunctionDef` o `ClassDef` NO se
traza: definir una función es un solo paso, entrar a ejecutarla es otra cosa.

### Límite del trazado

El tracer global acepta sólo frames cuyo `co_filename` sea `<paso>`:

```python
def _tracer_global(frame, event, arg):
    if frame.f_code.co_filename != '<paso>':
        return None
    return _tracer_local
```

Esto es también la decisión de diseño correcta, no sólo una optimización: si el
bucle llama a una función que el alumno definió en una celda anterior, no
entramos ahí. El paso a paso es **de esta celda**.

### Semántica de un paso

`sys.settrace` dispara el evento `'line'` **antes** de ejecutar la línea. El
modelo actual de un paso es el contrario: "la línea que acaba de correr, y el
estado que dejó". La traducción es diferir un evento:

- En el evento de la línea L: se **cierra** el paso pendiente (el de la línea
  anterior) tomando ahora el snapshot del namespace y el stdout acumulado, y
  se abre un paso pendiente nuevo para L.
- Al terminar el `exec`, se cierra el último paso pendiente.

Así cada paso sigue significando lo mismo que hoy: línea resaltada = la que
corrió, `vars` = cómo quedó todo después.

### Número de vuelta

Se cuenta un impacto sobre la línea del encabezado del bucle (`node.lineno`)
como el inicio de una iteración: en CPython el `for` dispara un evento de línea
por vuelta. El orden dentro del handler importa:

1. cerrar el paso pendiente con la vuelta **vigente**,
2. si `linea == node.lineno`, incrementar la vuelta,
3. abrir el paso nuevo con la vuelta ya incrementada.

Así el paso del encabezado queda rotulado con la vuelta que empieza. `vuelta`
se emite sólo para `For` y `While`; en `If`/`With`/`Try` va `None`.

### Tope

`_MAX_PASOS_BUCLE = 60` pasos registrados por sentencia compuesta. Al llegar al
tope se deja de **registrar** (y de sacar snapshots, que es lo caro) pero se
sigue **contando** las vueltas. Al final se agrega un paso colapsado:

```python
{'linea': node.lineno, 'src': <fuente del encabezado>, 'out': '', 'err': None,
 'resultado': None, 'png': None, 'vars': _snapshot_vars(ns), 'vuelta': None,
 'resumen': {'vueltas': <vueltas totales>, 'omitidos': <pasos no registrados>}}
```

El webview lo muestra como "…y 97 vueltas más" con el estado final real.

### Errores

Una excepción dentro del bloque se propaga fuera del `exec` y se captura donde
hoy: el `err` se pega en el paso pendiente al momento de fallar, se cierra ese
paso, y el bucle exterior de `_pasos` corta como siempre.

### Higiene

`sys.gettrace()` se guarda antes y se restaura en un `finally`, por si hay un
debugger enganchado al kernel. La redirección de stdout que ya existe se
mantiene, con un offset para repartir lo impreso entre los pasos: en cada
evento se le asigna al paso que se cierra lo que se escribió desde el evento
anterior.

### `src` de una línea trazada

Se toma de la línea correspondiente del fuente original (`src.split('\n')[L-1]`,
sin espacios a la derecha). Una sentencia multilínea dentro de un bucle reporta
sólo su primera línea; es aceptable y el resaltado del webview ya funciona con
eso.

## 3. Extensión

- `withProgress` en `ProgressLocation.Notification`, título "Animando la
  celda…", envolviendo la llamada a `runStepRunner`. Notificación y no barra de
  estado a propósito: en la demo conviene que se vea que el kernel piensa.
- Un flag de módulo mientras corre; las invocaciones nuevas se ignoran (sin
  mensaje de error: un doble clic no es un error del usuario).
- `runStepRunner` recibe un `notebookUri` opcional. `topd.animateCell` ya tiene
  la `cell`, así que le pasa `cell.notebook.uri`; el CodeLens de `.py` no lo
  pasa y conserva el fallback actual por `activeNotebookEditor`.
- El comando Spike se saca de la paleta con
  `"menus": {"commandPalette": [{"command": "topd.spikeTestKernelAccess", "when": "false"}]}`.
  El código se conserva: sirve para diagnosticar.

## 4. Webview

- Teclado: ← / → un paso, Home / End a los extremos. `mountSteps` corre en cada
  `postMessage`, así que el listener se registra **una sola vez** a nivel de
  módulo y apunta al `ir` vigente (guardado en una variable de módulo). Si se
  registra dentro de `mountSteps` se acumula un listener por animación y a la
  tercera corrida las flechas saltan de a tres pasos.
- ◀/▶ con `disabled` en los extremos. La atenuación se hace por JS
  (`opacity`), **no** editando `app.css`: ese archivo está vendorizado del
  Visualizador y no quiero que las dos copias se separen.
- Contador: `paso 5/12` y, si `p.vuelta`, `paso 5/12 · vuelta 2`.
- Paso colapsado (`p.resumen`): una nota "…y N vueltas más (se omitieron M
  pasos)".
- Rótulos de columnas truncadas (ver sección 1).

## 5. Demo

`demo/build_demo.py` se reescribe sobre el dataset del **Certamen 1 2026-1**.
El bloque de generación se copia tal cual del certamen, con su
`np.random.seed(829)`, así los 80 pacientes son idénticos a los que vieron los
alumnos. Es autocontenido: ningún CSV externo, el notebook corre en cualquier
máquina.

Secciones, en orden narrativo:

1. Preparación — `df_pacientes` (80 × 10) y la matriz de radiografía en NumPy.
2. Exploración — `.head(8)`, `.describe()` como expresiones sueltas.
3. Valores que no son tablas — los promedios y máximos del P1.2 real.
4. Máscara simple — hipoxemia, `saturacion_o2 < 92`.
5. Máscara compuesta — `(fumador) & (edad > 55)`, del P1.4 real.
6. Limpieza paso a paso — `dropna` / `drop_duplicates` / `sort_values`.
7. `np.where` anidado — la columna `grupo_etario` del P1.5 real.
8. `groupby` por diagnóstico.
9. NumPy — la matriz de radiografía: `reshape`, `.T`, slicing.
10. **Bucle** — un `for` acumulando, vuelta por vuelta. La sección nueva.
11. Gráfico — barras por diagnóstico, armándose línea por línea.
12. Error — columna mal escrita, la celda se corta ahí.
13. Tabla ancha — un DataFrame de 40 columnas generado al vuelo, para mostrar
    la truncación de columnas sin depender de ningún CSV.

`demo/check_demo.py` tiene que seguir pasando: recorre cada celda por el runner
y verifica que ninguna quede muda.

## Verificación

- `cd python && python -m pytest -v` — los 40 tests actuales siguen verdes, más
  los nuevos: truncación de columnas, un `for` simple, un `for` con `break`,
  un `for` que pasa el tope, un `if`, y un error dentro de un bucle.
- `npm test` — tests JS de descripciones/máscaras/arrays.
- `node --check media/*.js`.
- Fixture nueva `media/test-fixture-bucle.html`, abrible en el navegador.
- `python demo/check_demo.py`.
- Manual, en el kernel real: recorrer la demo entera con la extensión
  instalada. Incluye la verificación que quedó pendiente desde el `ideas.txt`:
  **los gráficos nunca se probaron contra un kernel real**, sólo con Agg.

## Riesgos

- `sys.settrace` es lo más invasivo del trabajo. Mitigado por el camino rápido
  intacto para sentencias simples, por el filtro de `co_filename`, y por
  guardar/restaurar el tracer previo.
- El costo del snapshot por línea dentro de un bucle lo acota `_MAX_PASOS_BUCLE`.
- La demo se genera, no se edita a mano: cualquier arreglo va en `build_demo.py`.
