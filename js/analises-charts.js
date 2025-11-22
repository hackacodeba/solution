// Utilities and state for the Analises dashboard
const CSV_SOURCES = {
    base: '../Base-dados_Codeba.csv',
    errors: '../PlanilhaCodeba_Dados-Errados.csv',
};

const NUMERIC_COLUMNS = new Set([
    'MES_ATRAC',
    'ANO_ATRAC',
    'ANO_DESAT',
    'TEMPO_ESTADIA_HORAS',
    'CAPITULO',
    'SECAO',
]);

const ANALISES_STATE = {
    initialized: false,
    baseData: [],
    errorData: [],
    charts: {
        line: null,
        bar: null,
        doughnut: null,
    },
    filters: {
        year: 'all',
        porto: 'all',
    },
};

async function loadCsv(relativePath) {
    const response = await fetch(relativePath);
    if (!response.ok) {
        throw new Error(`Falha ao carregar ${relativePath}: ${response.status}`);
    }
    const text = await response.text();
    return parseCsv(text);
}

function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];

    const headers = splitCsvLine(lines[0]).map((header) => header.replaceAll('"', '').trim());
    return lines.slice(1).map((line) => {
        const values = splitCsvLine(line);
        return headers.reduce((acc, header, idx) => {
            const raw = (values[idx] ?? '').replace(/^"|"$/g, '').trim();
            acc[header] = normalizeValue(header, raw);
            return acc;
        }, {});
    });
}

function splitCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values;
}

function normalizeValue(header, value) {
    if (value === '') return '';
    if (NUMERIC_COLUMNS.has(header)) {
        const parsed = Number(value.replace(',', '.'));
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return value;
}

function setupFilters(baseData) {
    const yearSelect = document.getElementById('filter-year');
    const portoSelect = document.getElementById('filter-porto');
    if (!yearSelect || !portoSelect) return;

    populateSelect(yearSelect, getUniqueSortedValues(baseData, 'ANO_ATRAC'));
    populateSelect(portoSelect, getUniqueSortedValues(baseData, 'PORTO_ATRACACAO'));

    yearSelect.addEventListener('change', (event) => {
        ANALISES_STATE.filters.year = event.target.value;
        updateAnalisesCharts();
    });

    portoSelect.addEventListener('change', (event) => {
        ANALISES_STATE.filters.porto = event.target.value;
        updateAnalisesCharts();
    });
}

function populateSelect(select, values) {
    select.querySelectorAll('option:not([value="all"])').forEach((option) => option.remove());
    values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function getUniqueSortedValues(data, key) {
    const unique = new Set();
    data.forEach((row) => {
        if (row[key] !== undefined && row[key] !== '') {
            unique.add(row[key]);
        }
    });
    return Array.from(unique).sort((a, b) => (
        typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b))
    ));
}

function applyFilters(dataset, options = { applyPort: true }) {
    const { year, porto } = ANALISES_STATE.filters;

    return dataset.filter((row) => {
        if (year !== 'all') {
            const yearValue = Number(row.ANO_ATRAC || row.ANO_DESAT);
            if (yearValue !== Number(year)) return false;
        }

        if (options.applyPort && porto !== 'all') {
            const portoValue = row.PORTO_ATRACACAO || row.PORTO_DESTINO || row.PORTO_ORIGEM;
            if (!portoValue || portoValue !== porto) return false;
        }

        return true;
    });
}

function updateAnalisesCharts() {
    const filteredBase = applyFilters(ANALISES_STATE.baseData);
    const filteredErrors = applyFilters(ANALISES_STATE.errorData, { applyPort: false });

    renderLineChart(filteredBase);
    renderBarChart(filteredBase);
    renderDoughnutChart(filteredErrors);
}

function renderLineChart(data) {
    const ctx = document.getElementById('chart1');
    if (!ctx) return;
    const series = buildAtracacoesSeries(data);
    const config = createLineChartConfig(series);
    updateOrCreateChart('line', ctx.getContext('2d'), config);
}

function renderBarChart(data) {
    const ctx = document.getElementById('chart2');
    if (!ctx) return;
    const series = buildTempoMedioPorPorto(data);
    const config = createBarChartConfig(series);
    updateOrCreateChart('bar', ctx.getContext('2d'), config);
}

function renderDoughnutChart(data) {
    const ctx = document.getElementById('chart3');
    if (!ctx) return;
    const series = buildDistribuicaoCarga(data);
    const config = createDoughnutChartConfig(series);
    updateOrCreateChart('doughnut', ctx.getContext('2d'), config);
}

function buildAtracacoesSeries(data) {
    const buckets = new Map();

    data.forEach((row) => {
        if (!row.ANO_ATRAC || !row.MES_ATRAC) return;
        const key = `${row.ANO_ATRAC}-${String(row.MES_ATRAC).padStart(2, '0')}`;
        const label = `${String(row.MES_ATRAC).padStart(2, '0')}/${row.ANO_ATRAC}`;

        if (!buckets.has(key)) {
            buckets.set(key, { label, total: 0 });
        }
        buckets.get(key).total += 1;
    });

    return Array.from(buckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, value]) => value);
}

function buildTempoMedioPorPorto(data) {
    const aggregation = data.reduce((acc, row) => {
        const porto = row.PORTO_ATRACACAO || 'Desconhecido';
        const tempo = Number(row.TEMPO_ESTADIA_HORAS || 0);
        if (!acc[porto]) acc[porto] = { total: 0, count: 0 };
        acc[porto].total += tempo;
        acc[porto].count += 1;
        return acc;
    }, {});

    return Object.entries(aggregation).map(([porto, value]) => ({
        label: porto,
        tempoMedio: value.count ? Number((value.total / value.count).toFixed(1)) : 0,
    }));
}

function buildDistribuicaoCarga(data) {
    const counts = data.reduce((acc, row) => {
        const tipo = row.TIPO_CARGA || row.TIPO_CARGA_MACRO || 'Não informado';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value]) => ({ label, value }));
}

function createLineChartConfig(series) {
    const labels = series.length ? series.map((item) => item.label) : ['Sem dados'];
    const data = series.length ? series.map((item) => item.total) : [0];

    return {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Atracações registradas',
                data,
                borderColor: '#1d4ed8',
                backgroundColor: 'rgba(29,78,216,0.2)',
                tension: 0.3,
                fill: true,
            }],
        },
        options: baseChartOptions({
            title: 'Evolução mensal de atracações',
            scales: true,
        }),
    };
}

function createBarChartConfig(series) {
    const labels = series.length ? series.map((item) => item.label) : ['Sem dados'];
    const data = series.length ? series.map((item) => item.tempoMedio) : [0];

    return {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Tempo médio (h)',
                data,
                backgroundColor: '#0ea5e9',
                borderRadius: 6,
            }],
        },
        options: baseChartOptions({
            title: 'Tempo médio de estadia por porto',
            scales: true,
        }),
    };
}

function createDoughnutChartConfig(series) {
    const labels = series.length ? series.map((item) => item.label) : ['Sem dados'];
    const data = series.length ? series.map((item) => item.value) : [1];
    const palette = ['#1d4ed8', '#0ea5e9', '#a855f7', '#34d399', '#f97316', '#facc15', '#ec4899', '#94a3b8'];

    return {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette,
            }],
        },
        options: baseChartOptions({
            title: 'Distribuição dos tipos de carga (dados inconsistentes)',
            legendPosition: 'bottom',
        }),
    };
}

function baseChartOptions({ title, scales = false, legendPosition = 'top' }) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: legendPosition },
            title: { display: true, text: title },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: scales
            ? {
                x: { grid: { display: false } },
                y: { beginAtZero: true },
            }
            : undefined,
    };
}

function updateOrCreateChart(key, ctx, config) {
    if (!ctx) return;
    const existing = ANALISES_STATE.charts[key];
    if (!existing) {
        ANALISES_STATE.charts[key] = new Chart(ctx, config);
        return;
    }

    existing.data = config.data;
    existing.options = config.options;
    existing.update();
}

function showAnalisesAlert(message) {
    const container = document.getElementById('analises-alert');
    if (!container) return;

    if (message) {
        container.textContent = message;
        container.style.display = 'block';
    } else {
        container.textContent = '';
        container.style.display = 'none';
    }
}

async function initAnalisesDashboard() {
    if (ANALISES_STATE.initialized) return;

    try {
        showAnalisesAlert('Carregando dados...');

        const [baseData, errorData] = await Promise.all([
            loadCsv(CSV_SOURCES.base),
            loadCsv(CSV_SOURCES.errors),
        ]);

        ANALISES_STATE.baseData = baseData;
        ANALISES_STATE.errorData = errorData;

        setupFilters(baseData);
        updateAnalisesCharts();

        showAnalisesAlert('');
        ANALISES_STATE.initialized = true;
    } catch (error) {
        console.error('Erro ao inicializar Analises:', error);
        showAnalisesAlert('Não foi possível carregar os gráficos. Verifique os CSVs.');
    }
}

window.initAnalisesDashboard = initAnalisesDashboard;