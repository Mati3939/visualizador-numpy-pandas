# Animador de celdas TOPD — Fase 2 (Webview + comando + botones reales) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la extensión real: un botón "Animar celda" en notebooks `.ipynb` y un CodeLens en archivos `.py` con `# %%` que ejecutan el código de la celda en el kernel real (vía el mecanismo confirmado por el spike de la Fase 1) y muestran el resultado paso a paso en un panel Webview que reusa `DfTable`/`dfDiff` de `js/core.js`.

**Architecture:** El spike de la Fase 1 (`src/extension.ts`, commits `d95cf5e`..`f9869db`) confirmó la forma real de la API de `ms-toolsai.jupyter`: `api.kernels.getKernel(uri)` es async y devuelve el kernel directamente (no envuelto), y `kernel.executeCode(code, token)` entrega una `Output` a la vez (no un array). Esta fase reusa ese mecanismo ya probado — no hace falta re-spikearlo — y le agrega tres piezas nuevas: (1) un Webview que vendorea `js/core.js` + `css/app.css` tal cual del visualizador y les suma una función `mountSteps()` portada de `ex-python.js`, (2) un módulo `kernel.ts` que envuelve el mecanismo del spike para ejecutar `_pasos()` (el runner Python de la Fase 1, ya en `python/topd_step_runner.py`) contra el kernel real, y (3) los disparadores de UI (botón de celda + CodeLens) que conectan todo. El caso Interactive Window (`.py` con `# %%`) usa el mismo mecanismo que `.ipynb` pero **no fue verificado manualmente** en la Fase 1 — esta fase incluye ese chequeo puntual como parte de la Tarea 4.

**Tech Stack:** TypeScript + VS Code Extension API (Webview, CodeLens, notebook cell menus) + el runner Python ya construido en la Fase 1.

## Global Constraints

- v1 solo anima DataFrame/Series; NumPy queda para v2.
- "Animar celda" reemplaza la corrida normal de la celda — no hay ningún trigger automático en cada ejecución normal.
- Bloques `for`/`if`/`with` se tratan como una sola sentencia top-level (heredado del runner de la Fase 1, sin cambios en esta fase).
- API real confirmada por el spike: `await api.kernels.getKernel(uri)` devuelve el kernel directamente; `kernel.executeCode(code, token)` es un `AsyncGenerator` que entrega una `Output` a la vez, cada una con `.items: [{mime, data}]`.
- `js/core.js` y `css/app.css` se vendorean **tal cual** (sin fork) — cualquier ajuste necesario para que funcionen en un Webview (ver Tarea 1) se hace en HTML/JS nuevo alrededor, nunca editando esos dos archivos.
- Commits cortos, en español, a nombre de "Matías Pino" <matiaspino508@gmail.com>, sin co-author de Claude, sin `git push` sin su OK explícito.

## Alcance de este plan

Cubre el Webview harness, el comando `topd.animateCell`/`topd.animatePyCell`, y los disparadores de UI (botón de celda + CodeLens). Fuera de alcance: soporte de arrays NumPy (v2), empaquetado/publicación real como `.vsix` para distribuir fuera del Extension Development Host (eso es un paso aparte, posterior, cuando el flujo ya esté validado en uso real).

Las Tareas 1 y 2 son completamente automatizables (no necesitan VS Code real). Las Tareas 3 y 4 terminan con un paso manual — solo Matías puede abrir el Extension Development Host, hacer clic en el botón real, y confirmar que la animación aparece.

---

### Task 1: Vendorizar `core.js`/`app.css`, portar `mountSteps()` y validarlos sin VS Code

**Files:**
- Create: `vscode-animador-topd/media/core.js` (copia exacta de `visualizador-numpy-pandas/js/core.js`)
- Create: `vscode-animador-topd/media/app.css` (copia exacta de `visualizador-numpy-pandas/css/app.css`)
- Create: `vscode-animador-topd/media/mount-steps.js`
- Create: `vscode-animador-topd/media/test-fixture.html`

**Interfaces:**
- Produces: `mountSteps(container: HTMLElement, payload: {code: string, pre: object, pasos: Array}) -> void`, función global (script plano, no módulo ES) que depende de `el`, `DfTable`, `dfDiff`, `RELAYOUT` — todas definidas por `core.js`, cargado antes que `mount-steps.js` en la misma página. Esta firma la consume la Tarea 3 (el panel Webview le hace `postMessage` con exactamente ese objeto).

- [ ] **Step 1: Copiar `core.js` y `app.css` tal cual**

```bash
mkdir -p "c:/Claude/Visualizador TOPD/vscode-animador-topd/media"
cp "c:/Claude/Visualizador TOPD/visualizador-numpy-pandas/js/core.js" "c:/Claude/Visualizador TOPD/vscode-animador-topd/media/core.js"
cp "c:/Claude/Visualizador TOPD/visualizador-numpy-pandas/css/app.css" "c:/Claude/Visualizador TOPD/vscode-animador-topd/media/app.css"
```

Verificar que son copias exactas (no debe imprimir nada):

```bash
diff "c:/Claude/Visualizador TOPD/visualizador-numpy-pandas/js/core.js" "c:/Claude/Visualizador TOPD/vscode-animador-topd/media/core.js"
diff "c:/Claude/Visualizador TOPD/visualizador-numpy-pandas/css/app.css" "c:/Claude/Visualizador TOPD/vscode-animador-topd/media/app.css"
```

**Nota importante para el siguiente paso:** `core.js` tiene, al final, un listener `DOMContentLoaded` que hace `$('#btnTheme').onclick=...` y `$('#btnPres').onclick=...` sin chequear que existan (líneas ~321-343). En una página que no es el sitio completo, esos elementos no existen y esa línea tira `TypeError` (no rompe `DfTable`/`dfDiff`/`el`/`RELAYOUT`, que ya están definidos como `class`/`function` de nivel superior antes de ese bloque — pero sí ensucia la consola cada carga). Como no se puede tocar `core.js`, la forma correcta de evitarlo es incluir en el HTML dos botones ocultos con esos IDs, **antes** de los `<script>` — ver Step 3.

- [ ] **Step 2: Escribir `media/mount-steps.js`**

Puerto de `pasoAPaso()`/`ir()` de `visualizador-numpy-pandas/js/ex-python.js`, adaptado para recibir el payload completo (con `pre`, que Fase 1 agregó y que reemplaza el `{}` que usaba el sandbox del navegador en el primer paso) en vez de leer un textarea y llamar a Pyodide, y sin el botón "✖ Cerrar" (folgico solo en el sandbox, donde compartía pantalla con el editor de código; acá el panel completo ES la animación):

```javascript
'use strict';
function mountSteps(container, payload) {
  const { code, pre, pasos } = payload;
  container.textContent = '';
  if (!pasos || !pasos.length) {
    container.append(el('p', { class: 'note' }, '(celda vacía)'));
    return;
  }
  const lineas = code.split('\n');
  const pane = el('pre', { class: 'code buglines' });
  const lineEls = lineas.map((ln, i) => {
    const d = el('div', { class: 'bugline', style: 'cursor:default' },
      String(i + 1).padStart(2, ' ') + '  ' + (ln || ' '));
    pane.append(d);
    return d;
  });
  const visor = el('div');
  const cnt = el('span', { class: 'cnt' }, '');
  const bPrev = el('button', { class: 'btn', onclick: () => ir(i - 1) }, '◀ Anterior');
  const bNext = el('button', { class: 'btn primary', onclick: () => ir(i + 1) }, '▶ Siguiente');
  container.append(el('div', { class: 'card' },
    el('h3', {}, '🎬 Paso a paso'),
    pane, el('div', { class: 'stepper' }, bPrev, bNext, cnt), visor));
  let i = -1;
  function ir(k) {
    if (k < 0 || k >= pasos.length) return;
    i = k;
    const p = pasos[i];
    cnt.textContent = `paso ${i + 1}/${pasos.length}`;
    lineEls.forEach(d => d.classList.remove('bughit', 'bugmiss'));
    const nLin = p.src.split('\n').length;
    for (let L = p.linea - 1; L < p.linea - 1 + nLin && L < lineEls.length; L++)
      lineEls[L].classList.add(p.err ? 'bugmiss' : 'bughit');
    visor.textContent = '';
    if (p.out) visor.append(el('pre', { class: 'code', style: 'white-space:pre-wrap' }, p.out.trim()));
    if (p.err) visor.append(el('div', { class: 'msg err' }, '💥 ' + p.err));
    const prev = (i > 0) ? pasos[i - 1].vars : pre;
    let algo = false;
    for (const [nombre, snap] of Object.entries(p.vars)) {
      const antes = prev[nombre];
      const cap = nombre + (snap.trunc > 0 ? `  (primeras 8 filas de ${snap.trunc + 8})` : '');
      if (!antes) {
        new DfTable(visor, { caption: cap + ' — nueva', columns: snap.columns, index: snap.index, rows: snap.rows });
        algo = true;
      } else if (JSON.stringify(antes) !== JSON.stringify(snap)) {
        dfDiff(visor, antes, snap, cap + ' — cambió en este paso');
        algo = true;
      }
    }
    if (!algo && !p.out && !p.err)
      visor.append(el('p', { class: 'note' }, 'Este paso no cambió ningún DataFrame ni imprimió nada.'));
    RELAYOUT.forEach(f => f());
  }
  ir(0);
}
```

- [ ] **Step 3: Escribir `media/test-fixture.html` con un caso real (generado con el runner de la Fase 1)**

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>mountSteps — fixture</title>
<link rel="stylesheet" href="app.css">
</head>
<body style="padding:1rem">
<button id="btnTheme" hidden></button>
<button id="btnPres" hidden></button>
<div id="root"></div>
<script src="core.js"></script>
<script src="mount-steps.js"></script>
<script>
const FIXTURE = {
  code: "df = pd.DataFrame({\"sucursal\": [\"Centro\", \"San Pedro\", \"Centro\"], \"total\": [4000, None, 2000]})\ndf = df.dropna()\nresumen = df.groupby(\"sucursal\")[\"total\"].sum()",
  pre: {},
  pasos: [
    {
      "linea": 1,
      "src": "df = pd.DataFrame({\"sucursal\": [\"Centro\", \"San Pedro\", \"Centro\"], \"total\": [4000, None, 2000]})",
      "out": "", "err": null,
      "vars": { "df": { "kind": "df", "trunc": 0, "columns": ["sucursal", "total"], "index": ["0", "1", "2"],
        "rows": [["Centro", 4000.0], ["San Pedro", null], ["Centro", 2000.0]] } }
    },
    {
      "linea": 2, "src": "df = df.dropna()", "out": "", "err": null,
      "vars": { "df": { "kind": "df", "trunc": 0, "columns": ["sucursal", "total"], "index": ["0", "2"],
        "rows": [["Centro", 4000.0], ["Centro", 2000.0]] } }
    },
    {
      "linea": 3, "src": "resumen = df.groupby(\"sucursal\")[\"total\"].sum()", "out": "", "err": null,
      "vars": {
        "df": { "kind": "df", "trunc": 0, "columns": ["sucursal", "total"], "index": ["0", "2"],
          "rows": [["Centro", 4000.0], ["Centro", 2000.0]] },
        "resumen": { "kind": "series", "trunc": 0, "columns": ["total"], "index": ["Centro"], "rows": [[6000.0]] }
      }
    }
  ]
};
mountSteps(document.getElementById('root'), FIXTURE);
</script>
</body>
</html>
```

(Ese JSON es la salida real de `_pasos()` — se generó corriendo el runner de la Fase 1 contra ese mismo código de ejemplo, no está inventado a mano.)

- [ ] **Step 4: Verificar visualmente con una captura headless**

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
  --window-size=900,1000 --virtual-time-budget=2500 \
  --screenshot="c:/Claude/Visualizador TOPD/vscode-animador-topd/media/test-fixture.png" \
  "file:///c:/Claude/Visualizador TOPD/vscode-animador-topd/media/test-fixture.html"
```

Leé el PNG resultante (`media/test-fixture.png`) con la herramienta de lectura de imágenes. Se espera ver una tarjeta "🎬 Paso a paso" con el código de las 3 líneas, un contador "paso 1/3", y una tabla estilo DataFrame con las columnas `sucursal`/`total` y una celda `NaN` resaltada — eso confirma que `DfTable` se ve bien con `app.css` vendoreado. Si la imagen sale sin estilos (texto plano, sin grilla), `app.css` no se está aplicando — revisar la ruta del `<link>`.

Borrar el PNG después de verificarlo (es un artefacto de verificación, no se commitea):

```bash
rm "c:/Claude/Visualizador TOPD/vscode-animador-topd/media/test-fixture.png"
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add media/core.js media/app.css media/mount-steps.js media/test-fixture.html
git commit -m "Webview: vendorizar core.js/app.css y portar mountSteps de ex-python.js"
```

---

### Task 2: `python/topd_step_runner.py` como recurso leíble + `kernel.ts` (ejecutar el runner en el kernel real)

**Files:**
- Create: `vscode-animador-topd/src/pySource.ts`
- Create: `vscode-animador-topd/src/kernel.ts`

**Interfaces:**
- Consumes: `python/topd_step_runner.py` (ya existe, de la Fase 1) como texto plano en disco. `JupyterExtensionExports`/`JupyterKernel` de `src/jupyterApi.d.ts` (ya existe, de la Fase 1, con los tipos corregidos según lo que confirmó el spike).
- Produces: `getStepRunnerSource(extensionUri: vscode.Uri): string` en `pySource.ts`. `runStepRunner(code: string, extensionUri: vscode.Uri): Promise<{pre: Record<string, unknown>, pasos: unknown[]}>` en `kernel.ts` — la consume la Tarea 3.

- [ ] **Step 1: `src/pySource.ts`**

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';

let cached: string | undefined;

export function getStepRunnerSource(extensionUri: vscode.Uri): string {
  if (cached === undefined) {
    const path = vscode.Uri.joinPath(extensionUri, 'python', 'topd_step_runner.py').fsPath;
    cached = fs.readFileSync(path, 'utf8');
  }
  return cached;
}
```

- [ ] **Step 2: `src/kernel.ts`**

Reusa el mecanismo confirmado por el spike de la Fase 1 (`src/extension.ts`, función `spikeTestKernelAccess`) — misma forma de resolver el kernel (`api.kernels.getKernel` es async y devuelve el kernel directo; `executeCode` entrega una `Output` a la vez) — pero encapsulada en una función reusable en vez de loguear a un output channel. El runner Python se re-inyecta en cada llamada (redefinir `_pasos`/`_snap`/etc. es barato e idempotente por naturaleza — más simple que llevar un flag de "ya inyectado" y no hay ningún riesgo real de estado inconsistente):

```typescript
import * as vscode from 'vscode';
import type { JupyterExtensionExports } from './jupyterApi';
import { getStepRunnerSource } from './pySource';

export interface PasoRunResult {
  pre: Record<string, unknown>;
  pasos: unknown[];
}

export async function runStepRunner(code: string, extensionUri: vscode.Uri): Promise<PasoRunResult> {
  const jupyterExt = vscode.extensions.getExtension<JupyterExtensionExports>('ms-toolsai.jupyter');
  if (!jupyterExt) {
    throw new Error('La extensión ms-toolsai.jupyter no está instalada.');
  }
  const api = await jupyterExt.activate();
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) {
    throw new Error('No hay un notebook activo con un kernel corriendo. Corré alguna celda primero.');
  }
  const found: any = await (api.kernels as any).getKernel(editor.notebook.uri);
  if (!found) {
    throw new Error('No se encontró un kernel para este notebook. Corré alguna celda primero.');
  }
  const kernel = found.kernel ?? found;

  const runnerSrc = getStepRunnerSource(extensionUri);
  const probe = `${runnerSrc}\nimport json as _topd_json\nprint(_topd_json.dumps(_pasos(${JSON.stringify(code)})))`;

  const tokenSource = new vscode.CancellationTokenSource();
  let stdout = '';
  try {
    for await (const output of kernel.executeCode(probe, tokenSource.token)) {
      for (const item of output.items) {
        stdout += Buffer.from(item.data).toString('utf8');
      }
    }
  } finally {
    tokenSource.dispose();
  }

  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error('El kernel no devolvió nada. Salida vacía — revisá si el código tiene un error no capturado.');
  }
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    throw new Error('No se pudo interpretar la salida del kernel como JSON: ' + trimmed.slice(0, 300));
  }
}
```

- [ ] **Step 3: Compilar**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
npm run compile
```

Expected: compila sin errores. Este paso no tiene un test automatizado ejecutable sin un kernel real — la verificación real ocurre en la Tarea 3 (manual, F5). Si `tsc` se queja de tipos en `found.kernel`/`api.kernels`, es porque `src/jupyterApi.d.ts` no calza exactamente — usar `as any` en los puntos de fricción, igual que ya hace el spike de la Fase 1 en `src/extension.ts`.

- [ ] **Step 4: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add src/pySource.ts src/kernel.ts
git commit -m "Extension: kernel.ts ejecuta topd_step_runner.py en el kernel real"
```

---

### Task 3: Panel Webview + comando `topd.animateCell` + botón en notebooks `.ipynb`

**Files:**
- Create: `vscode-animador-topd/src/panel.ts`
- Modify: `vscode-animador-topd/src/extension.ts`
- Modify: `vscode-animador-topd/package.json`

**Interfaces:**
- Consumes: `mountSteps` (Tarea 1, cargado por el HTML del panel, no por TypeScript), `runStepRunner` (Tarea 2).
- Produces: comando `topd.animateCell`, clase `AnimatorPanel` con método estático `AnimatorPanel.showSteps(extensionUri: vscode.Uri, payload: {code, pre, pasos}): void` — la reusa la Tarea 4 para el caso `.py`.

- [ ] **Step 1: `src/panel.ts`**

```typescript
import * as vscode from 'vscode';

export class AnimatorPanel {
  private static current: AnimatorPanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.panel.webview.html = getHtml(this.panel.webview, extensionUri);
    this.panel.onDidDispose(() => {
      AnimatorPanel.current = undefined;
    });
  }

  static showSteps(extensionUri: vscode.Uri, payload: unknown): void {
    if (!AnimatorPanel.current) {
      const panel = vscode.window.createWebviewPanel(
        'topdAnimador',
        'TOPD — Animar celda',
        vscode.ViewColumn.Beside,
        { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')] }
      );
      AnimatorPanel.current = new AnimatorPanel(panel, extensionUri);
    } else {
      AnimatorPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
    }
    AnimatorPanel.current.panel.webview.postMessage(payload);
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const coreJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'core.js'));
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'app.css'));
  const mountJsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'mount-steps.js'));
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${cssUri}">
</head>
<body>
<button id="btnTheme" hidden></button>
<button id="btnPres" hidden></button>
<div id="root"><p class="note">Corré "Animar celda" en una celda para ver la animación acá.</p></div>
<script nonce="${nonce}" src="${coreJsUri}"></script>
<script nonce="${nonce}" src="${mountJsUri}"></script>
<script nonce="${nonce}">
  const root = document.getElementById('root');
  window.addEventListener('message', (event) => {
    root.textContent = '';
    mountSteps(root, event.data);
  });
</script>
</body>
</html>`;
}
```

- [ ] **Step 2: Registrar el comando en `src/extension.ts`**

Agregar (sin tocar `spikeTestKernelAccess`, que queda intacta) al final de `activate()`, y los imports correspondientes arriba del archivo:

```typescript
import { runStepRunner } from './kernel';
import { AnimatorPanel } from './panel';
```

```typescript
  const animateCmd = vscode.commands.registerCommand(
    'topd.animateCell',
    async (cell: vscode.NotebookCell) => {
      if (!cell) {
        vscode.window.showErrorMessage('TOPD Animador: este comando se invoca desde el botón de la celda.');
        return;
      }
      await animateCode(cell.document.getText(), context.extensionUri);
    }
  );
  context.subscriptions.push(animateCmd);
```

Y la función compartida (usada también por la Tarea 4):

```typescript
async function animateCode(code: string, extensionUri: vscode.Uri): Promise<void> {
  try {
    const resultado = await runStepRunner(code, extensionUri);
    AnimatorPanel.showSteps(extensionUri, { code, pre: resultado.pre, pasos: resultado.pasos });
  } catch (e) {
    vscode.window.showErrorMessage('TOPD Animador: ' + String((e as Error).message ?? e));
  }
}
```

- [ ] **Step 3: Contribuir el comando y el botón de celda en `package.json`**

Agregar a `contributes.commands` (junto al que ya existe del spike):

```json
{
  "command": "topd.animateCell",
  "title": "TOPD: Animar celda"
}
```

Agregar una sección nueva `contributes.menus`:

```json
"menus": {
  "notebook/cell/title": [
    {
      "command": "topd.animateCell",
      "when": "notebookType == jupyter-notebook && notebookCellType == code",
      "group": "inline"
    }
  ]
}
```

- [ ] **Step 4: Compilar**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
npm run compile
```

Expected: compila sin errores.

- [ ] **Step 5: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add src/panel.ts src/extension.ts package.json
git commit -m "Extension: panel Webview y botón 'Animar celda' en notebooks"
```

- [ ] **Step 6 (MANUAL — Matías): probar el botón real en el notebook**

1. En la ventana de `vscode-animador-topd`, `Ctrl+Shift+F5` (o F5 si no había una sesión de debug corriendo) para relanzar el Extension Development Host con el código nuevo.
2. En esa ventana, abrí `notebooks/04_dataframes.ipynb`, corré una celda para que el kernel esté vivo.
3. En **una celda que cree o modifique un DataFrame** (por ejemplo una con `pd.DataFrame(...)`), buscá el botón nuevo en la barra de herramientas de la celda (a la derecha, junto al botón ▶ de correr) — debería decir "TOPD: Animar celda" al pasar el mouse.
4. Hacé clic. Se debería abrir un panel al costado con la animación paso a paso.
5. Contame qué pasó: si el botón no aparece (puede que el `when` clause de package.json no sea exactamente `notebookType == jupyter-notebook` en tu versión de la extensión Jupyter — probá también invocando el comando "TOPD: Animar celda" desde `Ctrl+Shift+P` con el cursor en una celda, a ver si al menos el comando existe), o si aparece pero el panel sale vacío/con error, o si todo funciona — con eso ajustamos lo que haga falta.

---

### Task 4: CodeLens en archivos `.py` con `# %%` (y verificación del caso Interactive Window)

**Files:**
- Create: `vscode-animador-topd/src/pyCells.ts`
- Modify: `vscode-animador-topd/src/extension.ts`
- Modify: `vscode-animador-topd/package.json`

**Interfaces:**
- Consumes: `animateCode` (función interna de `extension.ts`, Tarea 3).
- Produces: comando `topd.animatePyCell`, `PyCellCodeLensProvider`, `getPyCellRange(document, startLine): string` — utilidades específicas de este task, no consumidas por nada más en este plan.

- [ ] **Step 1: `src/pyCells.ts`**

```typescript
import * as vscode from 'vscode';

const MARKER = /^#\s*%%/;

export class PyCellCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      if (MARKER.test(document.lineAt(i).text)) {
        const range = new vscode.Range(i, 0, i, 0);
        lenses.push(new vscode.CodeLens(range, {
          title: '🎬 Animar celda',
          command: 'topd.animatePyCell',
          arguments: [document.uri, i],
        }));
      }
    }
    return lenses;
  }
}

export function getPyCellRange(document: vscode.TextDocument, startLine: number): string {
  let endLine = document.lineCount;
  for (let i = startLine + 1; i < document.lineCount; i++) {
    if (MARKER.test(document.lineAt(i).text)) {
      endLine = i;
      break;
    }
  }
  const start = new vscode.Position(startLine + 1, 0);
  const end = new vscode.Position(endLine, 0);
  return document.getText(new vscode.Range(start, end));
}
```

- [ ] **Step 2: Registrar comando + proveedor en `src/extension.ts`**

Agregar el import arriba del archivo:

```typescript
import { PyCellCodeLensProvider, getPyCellRange } from './pyCells';
```

Agregar dentro de `activate()`, junto a los otros `context.subscriptions.push(...)`:

```typescript
  const animatePyCmd = vscode.commands.registerCommand(
    'topd.animatePyCell',
    async (uri: vscode.Uri, startLine: number) => {
      if (!uri || startLine === undefined) {
        vscode.window.showErrorMessage('TOPD Animador: este comando se invoca desde el CodeLens de la celda.');
        return;
      }
      const doc = await vscode.workspace.openTextDocument(uri);
      const code = getPyCellRange(doc, startLine);
      await animateCode(code, context.extensionUri);
    }
  );
  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    { language: 'python', scheme: 'file' },
    new PyCellCodeLensProvider()
  );
  context.subscriptions.push(animatePyCmd, codeLensProvider);
```

- [ ] **Step 3: Contribuir el comando en `package.json`**

Agregar a `contributes.commands`:

```json
{
  "command": "topd.animatePyCell",
  "title": "TOPD: Animar celda (Interactive Window)"
}
```

- [ ] **Step 4: Compilar**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
npm run compile
```

- [ ] **Step 5: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add src/pyCells.ts src/extension.ts package.json
git commit -m "Extension: CodeLens 'Animar celda' para archivos .py con # %%"
```

- [ ] **Step 6 (MANUAL — Matías): probar el caso .py + Interactive Window**

Esto verifica lo único que el spike de la Fase 1 dejó sin confirmar (ver spec, sección Riesgos).

1. `Ctrl+Shift+F5` en la ventana de `vscode-animador-topd` para relanzar el Extension Development Host con el código nuevo.
2. En esa ventana, creá o abrí un archivo `.py` cualquiera con al menos una celda marcada `# %%`, por ejemplo:
   ```python
   # %%
   import pandas as pd
   df = pd.DataFrame({"a": [1, 2, None]})
   df = df.dropna()
   ```
3. Debería aparecer un link "🎬 Animar celda" arriba de la línea `# %%` (un CodeLens, como el "Run Cell" que ya pone la extensión de Python).
4. Hacé clic en "Run Cell" primero (el de Python/Jupyter, no el nuestro) para que arranque el Interactive Window y el kernel esté vivo.
5. Hacé clic en nuestro "🎬 Animar celda".
6. Contame qué pasó — en particular, si sale el error "No hay un notebook activo con un kernel corriendo" (eso significaría que `vscode.window.activeNotebookEditor` no apunta al Interactive Window cuando el foco está en el archivo `.py`, y hay que resolver el kernel de otra forma para este caso — lo vemos juntos si pasa).

---

### Task 5: README y estado del proyecto

**Files:**
- Modify: `vscode-animador-topd/README.md`

**Interfaces:** ninguna — solo documentación.

- [ ] **Step 1: Actualizar el README**

Reemplazar la sección "## Estado" completa por:

```markdown
## Estado

- [x] `python/topd_step_runner.py` — ejecuta una celda sentencia por sentencia
      y devuelve un snapshot JSON de cada DataFrame/Series presente en el
      namespace en ese paso (comparar pasos consecutivos para ver qué
      cambió queda del lado de quien consuma este JSON). Probado con
      pytest (12 tests), sin depender de un kernel real.
- [x] Spike de acceso al kernel real desde una extensión de terceros
      (`src/extension.ts`, comando `topd.spikeTestKernelAccess`) —
      confirmado contra una instalación real: `api.kernels.getKernel(uri)`
      es async y devuelve el kernel directo; `kernel.executeCode()` entrega
      una `Output` a la vez.
- [x] Panel Webview (`media/`) que reusa `DfTable`/`dfDiff` de
      `js/core.js` del Visualizador TOPD tal cual, con una función nueva
      `mountSteps()` portada de `ex-python.js`.
- [x] Comando `topd.animateCell` + botón en la barra de herramientas de
      celda de notebooks `.ipynb`.
- [x] CodeLens "🎬 Animar celda" para archivos `.py` con `# %%`
      (Interactive Window).
- [ ] Empaquetado como `.vsix` para instalar fuera del Extension
      Development Host — pendiente, siguiente paso natural una vez que el
      flujo esté validado en uso real.
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Claude/Visualizador TOPD/vscode-animador-topd"
git add README.md
git commit -m "Documentar el estado de la Fase 2 en el README"
```

---

## Self-Review

**Cobertura de la spec (Fase 2):** "Componentes → 2. Extension host" y "3. Webview harness" → Tareas 1, 3, 4. "Flujo de datos" → Tarea 3 Step 2 (`animateCode`) más Tarea 2 (`runStepRunner`). "Errores y casos borde" (API no disponible → botón deshabilitado con tooltip) — **no implementado en esta fase**: el diseño actual muestra un `showErrorMessage` al fallar en vez de deshabilitar el botón preventivamente (deshabilitar requeriría sondear la disponibilidad del kernel de forma proactiva, lo cual añade complejidad no crítica para validar el flujo por primera vez) — anotado como gap consciente para una iteración posterior, no una omisión.

**Placeholders:** ninguno — cada step tiene código completo. Las Tareas 3 y 4 terminan en un paso manual explícitamente marcado, con instrucciones concretas de qué hacer y qué reportar, no un "TODO: probar".

**Consistencia de tipos:** `runStepRunner(code, extensionUri) -> Promise<{pre, pasos}>` (Tarea 2) se consume igual en `animateCode` (Tarea 3). `AnimatorPanel.showSteps(extensionUri, payload)` (Tarea 3) se reusa sin cambios en la Tarea 4. `mountSteps(container, {code, pre, pasos})` (Tarea 1) coincide con la forma exacta del objeto que le pasa `postMessage` en `panel.ts` (Tarea 3).
