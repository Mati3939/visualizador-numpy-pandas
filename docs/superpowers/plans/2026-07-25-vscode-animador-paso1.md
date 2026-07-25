# Animador de celdas TOPD — Fase 1 (runner Python + spike de kernel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir, de forma probada de manera independiente, las dos piezas que no dependen de resolver primero cómo VS Code habla con el kernel Jupyter: el runner Python que ejecuta una celda sentencia por sentencia (`_pasos`), y el spike que confirma (o descarta) el mecanismo real de ejecución contra el kernel desde una extensión de terceros.

**Architecture:** Proyecto nuevo `vscode-animador-topd/` (repo git propio, hermano de `visualizador-numpy-pandas/`), porque es un artefacto distinto (extensión de VS Code en TypeScript/npm) aunque más adelante reutilice `js/core.js` del visualizador. `python/topd_step_runner.py` es una función pura (`_pasos(src, ns=None)`), testeable con pytest sin ningún kernel real de por medio — es la pieza de más riesgo lógico y la que más vale dejar sólida ahora. El spike (`src/extension.ts`) es la pieza de más riesgo de integración (API no pública de `ms-toolsai.jupyter`); no se puede automatizar su verificación porque requiere abrir VS Code, así que su último paso queda explícitamente para que Matías lo corra y reporte el resultado.

**Tech Stack:** Python 3.14 + pandas 3.0 + numpy 2.4 + pytest (runner); Node 24 + TypeScript + VS Code Extension API + `ms-toolsai.jupyter` (spike).

## Global Constraints

- v1 solo anima DataFrame/Series; NumPy queda para v2 (spec: "Fuera de alcance (v1)").
- "Animar celda" reemplazará la corrida normal de la celda, no se ejecutará además de ella (spec: "Enfoque general") — no aplica a este plan todavía, pero condiciona el diseño de `_pasos`.
- Bloques `for`/`if`/`with` se tratan como una sola sentencia top-level, sin bajar a sub-bloques (spec: "Errores y casos borde").
- Commits cortos, en español, a nombre de "Matías Pino" <matiaspino508@gmail.com>, sin co-author de Claude, sin `git push` sin su OK explícito (CLAUDE.md del proyecto).

## Alcance de este plan

Este plan cubre **solo** la Fase 1: el runner Python (testeable de punta a punta, sin VS Code) y el spike de acceso al kernel (requiere verificación manual de Matías, porque depende de una API que no controlamos). La Fase 2 —extensión completa: botón/CodeLens, comando `topd.animateCell`, panel Webview reusando `DfTable`/`dfDiff`/`Stepper`— se planifica en un documento aparte **después** de que el spike de la Tarea 5 confirme cómo ejecutar código en el kernel real, porque su diseño concreto depende de esa confirmación (ver spec, sección "Riesgos").

Las Tareas 1-4 (runner Python) son completamente automatizables por un agente. La Tarea 5 (spike) tiene un paso final que solo Matías puede ejecutar, porque implica abrir la ventana de VS Code, correr una celda y leer un output channel — ningún agente (subagent o inline) tiene ojos sobre esa UI.

---

### Task 1: Proyecto Python del runner + caso feliz de `_pasos`

**Files:**
- Create: `vscode-animador-topd/.gitignore`
- Create: `vscode-animador-topd/python/topd_step_runner.py`
- Create: `vscode-animador-topd/python/tests/test_step_runner.py`
- Create: `vscode-animador-topd/python/pyproject.toml`
- Create: `vscode-animador-topd/python/requirements-dev.txt`

**Interfaces:**
- Produces: `_pasos(src: str, ns: dict | None = None) -> dict` en `topd_step_runner.py`, con forma `{'pre': {nombre: snapshot}, 'pasos': [{'linea': int, 'src': str, 'out': str, 'err': str | None, 'vars': {nombre: snapshot}}]}`. `snapshot` tiene forma `{'kind': 'df'|'series', 'trunc': int, 'columns': [str], 'index': [str], 'rows': [[valor|None]]}`. Esta firma la consume la futura extensión de VS Code (Fase 2, plan aparte) y el propio panel Webview del sitio si algún día se porta.

- [ ] **Step 1: Crear el repo y el `.gitignore`**

```bash
mkdir -p "c:/Claude/Visualizador TOPD/vscode-animador-topd/python/tests"
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git init
git config user.name "Matías Pino"
git config user.email "matiaspino508@gmail.com"
```

Contenido de `vscode-animador-topd/.gitignore`:

```
node_modules/
out/
*.vsix
__pycache__/
.pytest_cache/
*.pyc
```

- [ ] **Step 2: Escribir el test que falla**

`vscode-animador-topd/python/tests/test_step_runner.py`:

```python
import json

import pandas as pd

from topd_step_runner import _pasos


def test_new_dataframe_in_fresh_namespace():
    src = "df = pd.DataFrame({'a': [1, 2]})"
    resultado = _pasos(src, ns={'pd': pd})
    assert resultado['pre'] == {}
    pasos = resultado['pasos']
    assert len(pasos) == 1
    assert pasos[0]['linea'] == 1
    assert pasos[0]['err'] is None
    assert pasos[0]['vars']['df']['kind'] == 'df'
    assert pasos[0]['vars']['df']['columns'] == ['a']
    assert pasos[0]['vars']['df']['rows'] == [[1], [2]]


def test_result_is_json_serializable():
    resultado = _pasos("df = pd.DataFrame({'a': [1]})", ns={'pd': pd})
    json.dumps(resultado)  # no debe lanzar
```

`vscode-animador-topd/python/pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

`vscode-animador-topd/python/requirements-dev.txt`:

```
pandas
numpy
pytest
```

- [ ] **Step 2b: Instalar dependencias y confirmar que el test falla**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd/python"
python -m pip install -r requirements-dev.txt
python -m pytest -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'topd_step_runner'` (el archivo todavía no existe).

- [ ] **Step 3: Implementar `topd_step_runner.py`**

```python
"""Ejecuta un bloque de código Python sentencia por sentencia y captura,
para cada paso, la salida estándar, el error (si lo hubo) y un snapshot
JSON-serializable de cada DataFrame/Series presente en el namespace.

Pensado para ser inyectado (via exec) en un kernel Jupyter real: se le
pasa como `ns` el propio `globals()` del kernel, así que ve las variables
que ya existían de celdas anteriores. Por eso, antes de correr la primera
sentencia, también devuelve un snapshot de lo que YA había en `ns`
(clave 'pre'), para que quien pinte el diff no trate como "nueva" una
variable que en realidad ya existía antes de esta celda.

Puerto de js/ex-python.js (PYHELPER/_pasos) del Visualizador TOPD, que
hace lo mismo pero siempre arranca de un namespace vacío (Pyodide en el
navegador nunca tiene celdas "anteriores").
"""
import ast
import io
import sys

import numpy as _np
import pandas as _pd

_SKIP_NAMES = {'np', 'pd'}
_HEAD_ROWS = 8


def _clean(v):
    try:
        if _pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, (bool, _np.bool_)):
        return bool(v)
    if isinstance(v, (int, float, str)):
        return v
    if isinstance(v, (_np.integer, _np.floating)):
        return v.item()
    return str(v)


def _snap(val):
    try:
        if isinstance(val, _pd.DataFrame):
            trunc = max(0, len(val) - _HEAD_ROWS)
            head = val.head(_HEAD_ROWS)
            return {
                'kind': 'df', 'trunc': trunc,
                'columns': [str(c) for c in head.columns],
                'index': [str(i) for i in head.index],
                'rows': [[_clean(v) for v in row] for row in head.itertuples(index=False)],
            }
        if isinstance(val, _pd.Series):
            trunc = max(0, len(val) - _HEAD_ROWS)
            head = val.head(_HEAD_ROWS)
            nombre = str(val.name) if val.name is not None else 'valor'
            return {
                'kind': 'series', 'trunc': trunc, 'columns': [nombre],
                'index': [str(i) for i in head.index],
                'rows': [[_clean(v)] for v in head.values],
            }
    except Exception:
        return None
    return None


def _snapshot_vars(ns):
    out = {}
    for k, v in list(ns.items()):
        if k.startswith('_') or k in _SKIP_NAMES:
            continue
        s = _snap(v)
        if s:
            out[k] = s
    return out


def _pasos(src, ns=None):
    """Ejecuta `src` sentencia por sentencia sobre `ns` (por defecto, uno
    nuevo y vacío). Devuelve {'pre': {...}, 'pasos': [...]}."""
    if ns is None:
        ns = {}
    pre = _snapshot_vars(ns)
    tree = ast.parse(src)
    pasos = []
    for node in tree.body:
        seg = ast.get_source_segment(src, node) or '...'
        buf = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = buf
        err = None
        try:
            code = compile(ast.Module(body=[node], type_ignores=[]), '<paso>', 'exec')
            exec(code, ns)
        except Exception as e:
            err = type(e).__name__ + ': ' + str(e)
        finally:
            sys.stdout = old_stdout
        pasos.append({
            'linea': node.lineno, 'src': seg, 'out': buf.getvalue(),
            'err': err, 'vars': _snapshot_vars(ns),
        })
        if err:
            break
    return {'pre': pre, 'pasos': pasos}
```

- [ ] **Step 4: Confirmar que el test pasa**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd/python"
python -m pytest -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add .gitignore python/topd_step_runner.py python/tests/test_step_runner.py python/pyproject.toml python/requirements-dev.txt
git commit -m "Runner: _pasos ejecuta una celda sentencia por sentencia (caso feliz)"
```

---

### Task 2: Sembrar `pre` desde variables ya existentes en el namespace

**Files:**
- Modify: `vscode-animador-topd/python/tests/test_step_runner.py`
- Modify: `vscode-animador-topd/python/topd_step_runner.py` (ya soporta esto desde la Tarea 1 — este task es para blindarlo con tests explícitos del caso que motivó el diseño)

**Interfaces:**
- Consumes: `_pasos(src, ns=None) -> dict` de la Tarea 1.
- Produces: mismos tipos, sin cambios de firma — este task es de cobertura, no de código nuevo (si algún test falla, revela un bug real en la Tarea 1).

- [ ] **Step 1: Agregar los tests que cubren el caso "la variable ya existía antes de esta celda"**

Agregar al final de `vscode-animador-topd/python/tests/test_step_runner.py`:

```python
def test_seeds_pre_from_existing_namespace():
    df_previo = pd.DataFrame({'a': [1, None, 3]})
    ns = {'pd': pd, 'df': df_previo}
    src = "df = df.dropna()"
    resultado = _pasos(src, ns=ns)
    assert resultado['pre']['df']['rows'] == [[1], [None], [3]]
    assert resultado['pasos'][0]['vars']['df']['rows'] == [[1], [3]]


def test_multi_statement_cell_produces_one_step_per_statement():
    src = "df = pd.DataFrame({'a': [1, 2]})\ndf = df.assign(b=[3, 4])"
    pasos = _pasos(src, ns={'pd': pd})['pasos']
    assert len(pasos) == 2
    assert pasos[0]['vars']['df']['columns'] == ['a']
    assert pasos[1]['vars']['df']['columns'] == ['a', 'b']
```

- [ ] **Step 2: Correr los tests y confirmar que pasan (si no, hay un bug real que arreglar antes de seguir)**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd/python"
python -m pytest -v
```

Expected: PASS (4 tests). Si `test_seeds_pre_from_existing_namespace` falla, revisar que `_pasos` calcule `pre = _snapshot_vars(ns)` **antes** del loop de `ast.parse` (orden correcto en la implementación de la Tarea 1).

- [ ] **Step 3: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add python/tests/test_step_runner.py
git commit -m "Runner: cubrir con tests el sembrado de pre desde el namespace existente"
```

---

### Task 3: Casos borde — stdout, errores, filtrado de variables, truncado, Series sin nombre, NaN

**Files:**
- Modify: `vscode-animador-topd/python/tests/test_step_runner.py`

**Interfaces:**
- Consumes: `_pasos(src, ns=None) -> dict` de la Tarea 1. Sin cambios de código esperados — si algún test falla, es un bug en la Tarea 1 a corregir aquí mismo.

- [ ] **Step 1: Agregar los tests de casos borde**

Agregar al final de `vscode-animador-topd/python/tests/test_step_runner.py`:

```python
def test_captures_stdout_per_statement():
    src = "print('hola')\nprint('chao')"
    pasos = _pasos(src, ns={})['pasos']
    assert pasos[0]['out'] == 'hola\n'
    assert pasos[1]['out'] == 'chao\n'


def test_error_stops_execution_and_is_reported():
    src = "x = 1/0\ny = 2"
    pasos = _pasos(src, ns={})['pasos']
    assert len(pasos) == 1
    assert pasos[0]['err'] == 'ZeroDivisionError: division by zero'


def test_internal_and_module_vars_are_never_snapshotted():
    ns = {'pd': pd, '_oculta': pd.DataFrame({'a': [1]})}
    src = "otra = pd.DataFrame({'b': [1]})"
    resultado = _pasos(src, ns=ns)
    assert 'pd' not in resultado['pasos'][0]['vars']
    assert '_oculta' not in resultado['pasos'][0]['vars']
    assert 'otra' in resultado['pasos'][0]['vars']


def test_dataframe_head_truncation_after_8_rows():
    df = pd.DataFrame({'a': range(10)})
    resultado = _pasos("otro = df.copy()", ns={'pd': pd, 'df': df})
    snap = resultado['pasos'][0]['vars']['otro']
    assert snap['trunc'] == 2
    assert len(snap['rows']) == 8


def test_series_snapshot_uses_column_name_or_valor():
    s_con_nombre = pd.Series([1, 2], name='puntaje')
    s_sin_nombre = pd.Series([1, 2])
    resultado = _pasos(
        "a = s_con_nombre\nb = s_sin_nombre",
        ns={'pd': pd, 's_con_nombre': s_con_nombre, 's_sin_nombre': s_sin_nombre},
    )
    pasos = resultado['pasos']
    assert pasos[0]['vars']['a']['columns'] == ['puntaje']
    assert pasos[1]['vars']['b']['columns'] == ['valor']


def test_nan_is_cleaned_to_none():
    df = pd.DataFrame({'a': [1.0, float('nan')]})
    resultado = _pasos("otro = df.copy()", ns={'pd': pd, 'df': df})
    assert resultado['pasos'][0]['vars']['otro']['rows'] == [[1.0], [None]]
```

- [ ] **Step 2: Correr los tests**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd/python"
python -m pytest -v
```

Expected: PASS (10 tests). Si algo falla, es un bug real en `topd_step_runner.py` (por ejemplo, un `except Exception` demasiado amplio en `_snap` que se está tragando el error de verdad) — corregirlo ahí, no ajustar el test para que pase.

- [ ] **Step 3: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add python/tests/test_step_runner.py
git commit -m "Runner: cubrir stdout, errores, filtrado de variables, truncado y NaN"
```

---

### Task 4: README del proyecto y cierre de la Fase 1

**Files:**
- Create: `vscode-animador-topd/README.md`

**Interfaces:**
- No introduce interfaces nuevas — documenta las de las Tareas 1-3 para quien retome el proyecto (incluida la Fase 2, en un plan aparte).

- [ ] **Step 1: Escribir el README**

`vscode-animador-topd/README.md`:

```markdown
# Animador de celdas TOPD (VS Code)

Extensión de VS Code que anima, paso a paso, cómo cambian los DataFrames/Series
de una celda de notebook al ejecutarla — reusando el motor visual (`DfTable`,
`dfDiff`, `Stepper`) del [Visualizador TOPD](../visualizador-numpy-pandas).

Spec: `../visualizador-numpy-pandas/docs/superpowers/specs/2026-07-25-vscode-animar-celda-design.md`

## Estado

- [x] `python/topd_step_runner.py` — ejecuta una celda sentencia por sentencia
      y devuelve un snapshot JSON de cada DataFrame/Series que cambió.
      Probado con pytest, sin depender de un kernel real (ver `python/tests/`).
- [ ] Spike de acceso al kernel real desde una extensión de terceros
      (`src/extension.ts`) — en curso, ver sección "Spike" más abajo.
- [ ] Extensión completa (botón/CodeLens, comando `topd.animateCell`, panel
      Webview) — pendiente de planificar, depende del resultado del spike.

## Runner Python

```bash
cd python
python -m pip install -r requirements-dev.txt
python -m pytest -v
```

`_pasos(src, ns=None)` ejecuta `src` sentencia por sentencia sobre `ns` (el
namespace real del kernel, o uno vacío para pruebas). Ver los tests en
`python/tests/test_step_runner.py` para la forma exacta del JSON devuelto.

## Spike

Ver `src/extension.ts` y las notas de la Tarea 5 del plan de implementación
(`../visualizador-numpy-pandas/docs/superpowers/plans/2026-07-25-vscode-animador-paso1.md`).
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add README.md
git commit -m "Documentar estado del proyecto y cómo correr los tests del runner"
```

---

### Task 5: Spike — acceso al kernel Jupyter real desde una extensión de terceros

**Files:**
- Create: `vscode-animador-topd/package.json`
- Create: `vscode-animador-topd/tsconfig.json`
- Create: `vscode-animador-topd/src/jupyterApi.d.ts`
- Create: `vscode-animador-topd/src/extension.ts`

**Interfaces:**
- Produces: nada que consuma otro task de este plan (es intencionalmente independiente de las Tareas 1-4). Su resultado (qué forma tiene realmente la API de `ms-toolsai.jupyter` instalada) es el insumo del plan de la Fase 2.

**Importante — esta tarea no termina con un `pytest` en verde.** El Step final requiere que Matías abra VS Code, corra una celda y lea un output channel; ningún agente puede hacer eso por su cuenta. Los primeros steps sí son 100% automatizables (scaffold, compilar); el último queda marcado explícitamente como manual.

- [ ] **Step 1: Scaffold del proyecto de extensión**

`vscode-animador-topd/package.json`:

```json
{
  "name": "topd-animador",
  "displayName": "TOPD Animador",
  "description": "Spike: acceso al kernel Jupyter activo desde una extensión de terceros",
  "version": "0.0.1",
  "private": true,
  "engines": { "vscode": "^1.90.0" },
  "extensionDependencies": ["ms-toolsai.jupyter"],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "topd.spikeTestKernelAccess",
        "title": "TOPD: Spike — probar acceso al kernel"
      }
    ]
  },
  "scripts": {
    "compile": "tsc -p .",
    "watch": "tsc -w -p ."
  },
  "devDependencies": {
    "@types/vscode": "^1.90.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0"
  }
}
```

`vscode-animador-topd/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "rootDir": "src",
    "strict": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Declarar el tipo ambiente de la API exportada de Jupyter**

`ms-toolsai.jupyter` no publica un paquete `@types` oficial; documenta su API
de kernels para extensiones de terceros en su wiki
(github.com/microsoft/vscode-jupyter — "Accessing Jupyter's Kernels from
3rd party Extensions"). Esta declaración es la mejor aproximación a esa
forma documentada; **confirmarla o corregirla contra la instalación real es
el objetivo de este spike**, no un hecho ya probado.

`vscode-animador-topd/src/jupyterApi.d.ts`:

```typescript
import type { CancellationToken, Uri, Event } from 'vscode';

export interface JupyterKernelOutputItem {
  mime: string;
  data: Uint8Array;
}

export interface JupyterKernelOutput {
  items: JupyterKernelOutputItem[];
}

export interface JupyterKernel {
  executeCode(
    code: string,
    token: CancellationToken
  ): AsyncGenerator<JupyterKernelOutput[], void, unknown>;
}

export interface JupyterKernelService {
  getKernel(uri: Uri): { kernel: JupyterKernel; metadata: unknown } | undefined;
  onDidChangeKernels: Event<{ uri?: Uri }>;
}

export interface JupyterExtensionExports {
  kernels: JupyterKernelService;
}
```

- [ ] **Step 3: Extensión con comando de spike, con descubrimiento defensivo de la forma real**

`vscode-animador-topd/src/extension.ts`:

```typescript
import * as vscode from 'vscode';
import type { JupyterExtensionExports } from './jupyterApi';

const out = vscode.window.createOutputChannel('TOPD Animador');

export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    'topd.spikeTestKernelAccess',
    spikeTestKernelAccess
  );
  context.subscriptions.push(cmd, out);
  out.appendLine('TOPD Animador activado.');
}

async function spikeTestKernelAccess(): Promise<void> {
  out.show(true);
  out.appendLine('--- spike: acceso al kernel ---');

  const jupyterExt = vscode.extensions.getExtension<JupyterExtensionExports>(
    'ms-toolsai.jupyter'
  );
  if (!jupyterExt) {
    out.appendLine('✘ La extensión ms-toolsai.jupyter no está instalada.');
    return;
  }
  const api = await jupyterExt.activate();
  out.appendLine('Claves exportadas por la extensión Jupyter: ' + Object.keys(api as object).join(', '));

  if (!api.kernels) {
    out.appendLine('✘ api.kernels no existe — la forma real de la API es distinta a la documentada. Inspeccionar `api` a mano.');
    return;
  }
  out.appendLine('Métodos de api.kernels: ' + Object.keys(api.kernels as object).join(', '));

  const editor = vscode.window.activeNotebookEditor;
  if (!editor) {
    out.appendLine('✘ No hay un notebook activo. Abrí un .ipynb, corré una celda para que el kernel arranque, y volvé a intentar.');
    return;
  }

  const found = api.kernels.getKernel(editor.notebook.uri);
  if (!found) {
    out.appendLine('✘ getKernel() no devolvió nada para este notebook. ¿Corriste alguna celda para que el kernel esté vivo?');
    return;
  }
  out.appendLine('✅ Kernel encontrado. Metadata: ' + JSON.stringify(found.metadata));

  const tokenSource = new vscode.CancellationTokenSource();
  try {
    for await (const outputs of found.kernel.executeCode(
      "print('spike-ok')",
      tokenSource.token
    )) {
      for (const output of outputs) {
        for (const item of output.items) {
          out.appendLine(`salida (${item.mime}): ` + Buffer.from(item.data).toString('utf8'));
        }
      }
    }
    out.appendLine('✅ executeCode terminó sin lanzar. Si arriba aparece "spike-ok", el mecanismo funciona.');
  } catch (e) {
    out.appendLine('✘ executeCode lanzó: ' + String(e));
  } finally {
    tokenSource.dispose();
  }
}

export function deactivate() {}
```

- [ ] **Step 4: Instalar dependencias y compilar**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
npm install
npm run compile
```

Expected: compila sin errores de TypeScript. Si `tsc` se queja de que `api.kernels` no tiene un tipo compatible (porque `jupyterExt.activate()` devuelve `unknown` o `any` real), ajustar el cast en `extension.ts` (por ejemplo, `const api = (await jupyterExt.activate()) as JupyterExtensionExports;`) — es una discrepancia de tipos esperable dado que `jupyterApi.d.ts` es una aproximación.

- [ ] **Step 5: Commit del scaffold**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add package.json tsconfig.json src/jupyterApi.d.ts src/extension.ts
git commit -m "Spike: comando que prueba el acceso al kernel Jupyter activo"
```

- [ ] **Step 6 (MANUAL — Matías): correr el spike y reportar el resultado**

1. Abrir la carpeta `vscode-animador-topd` en una ventana de VS Code.
2. Presionar `F5` (o "Run Extension" desde el panel de Run and Debug) para
   abrir un Extension Development Host.
3. En esa ventana nueva, abrir
   `visualizador-numpy-pandas/notebooks/04_dataframes.ipynb`.
4. Correr al menos una celda para que el kernel arranque de verdad.
5. Abrir la paleta de comandos (`Ctrl+Shift+P`) y correr
   **"TOPD: Spike — probar acceso al kernel"**.
6. Copiar el contenido completo del output channel **"TOPD Animador"** (se
   abre solo) y pegarlo de vuelta en la conversación.
7. Repetir los pasos 3-6 pero con un archivo `.py` con una celda `# %%`,
   corrida en el Interactive Window en vez de un notebook — para confirmar
   que `vscode.window.activeNotebookEditor` (o el mecanismo que corresponda)
   también resuelve ese caso, o si hace falta una API distinta para el
   Interactive Window.

Con ese resultado se decide cómo sigue la Fase 2: si `executeCode` funciona
tal cual, el plan siguiente construye directamente sobre esta API; si la
forma real difiere (nombres de métodos distintos, o no hay forma de
ejecutar código silenciosamente), esa sección "Riesgos" de la spec dice
que hay que rediseñar el mecanismo de ejecución usando solo APIs públicas
de Notebook.

---

## Self-Review

**Cobertura de la spec (secciones de la Fase 1):** "Componentes → 1.
`topd_step_runner.py`" → Tareas 1-3. "Testing → `topd_step_runner.py`" →
Tareas 1-3 (pytest en vez de `jupyter_client` contra un kernel real, porque
`ns` explícito hace innecesario un kernel de verdad para probar la lógica).
"Riesgos → spike" → Tarea 5. Las secciones de la spec sobre el Webview
harness, el comando `topd.animateCell` y la UI de botón/CodeLens quedan
fuera de este plan a propósito (ver "Alcance de este plan").

**Placeholders:** ninguno — cada step tiene código completo y ejecutable
(incluido el spike, que es exploratorio por naturaleza pero corre código
real, no pseudocódigo).

**Consistencia de tipos:** `_pasos(src, ns=None) -> dict` se usa igual en
las Tareas 1-3; el spike (Tarea 5) no depende de esa firma. `JupyterKernel`,
`JupyterKernelService` y `JupyterExtensionExports` se usan consistentemente
entre `jupyterApi.d.ts` y `extension.ts`.
