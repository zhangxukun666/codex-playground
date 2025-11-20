const randomColor = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;

const state = {
  domain: { min: -10, max: 10 },
  samples: 600,
  snap: false,
  showGrid: true,
  evalX: 0,
  functions: [],
};

const graphEl = document.getElementById('graph');
const functionRows = document.getElementById('function-rows');
const template = document.getElementById('function-row-template');
const valueTable = document.getElementById('value-table');

const clampDomain = () => {
  const min = Number(document.getElementById('x-min').value);
  const max = Number(document.getElementById('x-max').value);
  if (max <= min) {
    document.getElementById('x-max').value = min + 1;
  }
};

function readControls() {
  clampDomain();
  state.domain.min = Number(document.getElementById('x-min').value);
  state.domain.max = Number(document.getElementById('x-max').value);
  state.samples = Number(document.getElementById('samples').value);
  state.showGrid = document.getElementById('show-grid').checked;
  state.snap = document.getElementById('snap').checked;
  state.evalX = Number(document.getElementById('eval-x').value);
}

function createRow(fn) {
  const clone = template.content.cloneNode(true);
  const row = clone.querySelector('.function-row');
  const exprInput = row.querySelector('.fn-input');
  const colorInput = row.querySelector('.color-input');
  const derivativeInput = row.querySelector('.derivative-input');
  const widthInput = row.querySelector('.width-input');
  const errorEl = row.querySelector('.error');

  exprInput.value = fn.expression;
  colorInput.value = fn.color;
  derivativeInput.checked = fn.derivative;
  widthInput.value = fn.width;

  row.querySelector('.apply').addEventListener('click', () => {
    try {
      fn.expression = exprInput.value.trim();
      fn.color = colorInput.value;
      fn.derivative = derivativeInput.checked;
      fn.width = Number(widthInput.value) || 2;
      errorEl.textContent = '';
      render();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  row.querySelector('.remove').addEventListener('click', () => {
    state.functions = state.functions.filter((f) => f.id !== fn.id);
    row.remove();
    render();
  });

  return row;
}

function addFunction(expression = 'sin(x)', color = randomColor()) {
  const fn = {
    id: crypto.randomUUID(),
    expression,
    color,
    derivative: false,
    width: 2,
  };
  state.functions.push(fn);
  const row = createRow(fn);
  functionRows.appendChild(row);
  render();
}

function buildTrace(fn) {
  const { min, max } = state.domain;
  const samples = state.samples;
  const compiled = math.compile(fn.expression);
  const x = [];
  const y = [];
  const step = (max - min) / (samples - 1);
  for (let i = 0; i < samples; i++) {
    const v = min + i * step;
    try {
      const xv = state.snap ? Math.round(v) : v;
      const result = compiled.evaluate({ x: xv });
      if (typeof result === 'number' && Number.isFinite(result)) {
        x.push(v);
        y.push(result);
      } else {
        x.push(v);
        y.push(null);
      }
    } catch (err) {
      x.push(v);
      y.push(null);
    }
  }

  return {
    x,
    y,
    mode: 'lines',
    name: fn.expression,
    line: { color: fn.color, width: fn.width },
  };
}

function buildDerivativeTrace(fn) {
  const derivative = math.derivative(fn.expression, 'x');
  const derivedFn = { ...fn, expression: derivative.toString(), color: fn.color };
  const trace = buildTrace(derivedFn);
  trace.name = `d/dx (${fn.expression})`;
  trace.line = { color: fn.color, width: Math.max(1, fn.width - 1), dash: 'dot' };
  return trace;
}

function renderValueTable(results) {
  if (!results.length) {
    valueTable.innerHTML = '';
    return;
  }
  const rows = results
    .map(
      (row) => `
        <div class="table-row">
          <span class="header">${row.label}</span>
          <span>y = ${row.value}</span>
        </div>
      `,
    )
    .join('');
  valueTable.innerHTML = `<div class="table-row header"><span>Function</span><span>Value at x=${state.evalX}</span></div>${rows}`;
}

function render() {
  readControls();
  const traces = [];
  const valueRows = [];

  state.functions.forEach((fn) => {
    if (!fn.expression.trim()) return;
    try {
      const trace = buildTrace(fn);
      trace.uid = fn.id;
      traces.push(trace);
      const compiled = math.compile(fn.expression);
      const value = compiled.evaluate({ x: state.evalX });
      valueRows.push({ label: fn.expression, value: Number(value.toFixed(5)) });
      if (fn.derivative) {
        traces.push(buildDerivativeTrace(fn));
      }
    } catch (err) {
      console.warn('Skipping function', fn.expression, err);
    }
  });

  if (state.functions.length === 0) {
    Plotly.purge(graphEl);
    graphEl.innerHTML = '<div class="empty">Add a function to start graphing.</div>';
    valueTable.innerHTML = '';
    return;
  }

  const layout = {
    margin: { l: 40, r: 10, b: 40, t: 10 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    xaxis: {
      range: [state.domain.min, state.domain.max],
      showgrid: state.showGrid,
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.2)',
    },
    yaxis: {
      showgrid: state.showGrid,
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.2)',
    },
    legend: { orientation: 'h', y: -0.2 },
  };

  const shapes = [
    {
      type: 'line',
      x0: state.evalX,
      x1: state.evalX,
      y0: -1e6,
      y1: 1e6,
      line: { color: 'rgba(255,255,255,0.25)', dash: 'dot' },
    },
  ];

  Plotly.newPlot(graphEl, traces, { ...layout, shapes }, { responsive: true, displaylogo: false });
  renderValueTable(valueRows);
}

function resetView() {
  document.getElementById('x-min').value = -10;
  document.getElementById('x-max').value = 10;
  document.getElementById('samples').value = 600;
  document.getElementById('eval-x').value = 0;
  document.getElementById('show-grid').checked = true;
  document.getElementById('snap').checked = false;
  render();
}

function exportPng() {
  Plotly.toImage(graphEl, { format: 'png', height: 600, width: 900 }).then((dataUrl) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'function-graph.png';
    link.click();
  });
}

function bindControls() {
  ['x-min', 'x-max', 'samples', 'show-grid', 'snap', 'eval-x'].forEach((id) => {
    document.getElementById(id).addEventListener('input', render);
  });
  document.getElementById('add-function').addEventListener('click', () => addFunction('sin(x)'));
  document.getElementById('reset-view').addEventListener('click', resetView);
  document.getElementById('export-png').addEventListener('click', exportPng);
}

bindControls();
addFunction('sin(x)');
addFunction('cos(2x)');
render();
