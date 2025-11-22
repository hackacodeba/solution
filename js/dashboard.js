// Simples gráficos em canvas (substituir por SVG se necessário)
function drawPieChart(canvasId, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const total = data.reduce((a, b) => a + b, 0);
    let startAngle = 0;
    data.forEach((value, index) => {
        const sliceAngle = total ? (value / total) * 2 * Math.PI : 0;
        ctx.fillStyle = colors[index];
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.arc(100, 100, 80, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        startAngle += sliceAngle;
    });
}

// Dados fictícios para gráficos com nova paleta
const palette = ['#1d4ed8', '#0ea5e9', '#a855f7'];
drawPieChart('chartEstadia', [18.1, 19.2, 20.3], palette);
drawPieChart('chartNavios', [230, 180, 150], palette);

const UPLOAD_STATE = {
    errors: [],
    rows: [],
    currentErrorPage: 1,
    charts: {
        validData: null,
        errorFields: null,
        errorCategories: null,
    },
};

const ERROR_PAGE_SIZE = 8;

// --- Upload CSV validation constants ---
const EXPECTED_HEADERS = [
    'SENTIDO', 'NAVEGACAO', 'PAIS_PORTO_ESTRANG', 'REGIAO_ORIGEM', 'BERCO',
    'PORTO_ATRACACAO', 'ATRACACAO', 'MES_ATRAC', 'ANO_ATRAC',
    'DESATRACACAO', 'ANO_DESAT', 'TEMPO_ESTADIA_HORAS',
    'CAPITULO', 'SECAO', 'TIPO_CARGA', 'TIPO_CARGA_MACRO',
    'GRUPOANTAQ', 'NAVIO', 'IMO', 'TIPO_NAVIO', 'PORTE_NAVIO',
    'CLIMA_DIA', 'MARE_DIA', 'DIA_SEMANA', 'TURNO',
    'PORTO_ORIGEM', 'PORTO_DESTINO',
];

const INTEGER_FIELDS = new Set([
    'BERCO', 'MES_ATRAC', 'ANO_ATRAC', 'ANO_DESAT',
    'TEMPO_ESTADIA_HORAS', 'CAPITULO', 'IMO',
]);

const DOMAIN_SETS = {
    SENTIDO: new Set(['Descarga', 'Embarque']),
    NAVEGACAO: new Set(['LC', 'CB']),
    REGIAO_ORIGEM: new Set(['AMERICA DO NORTE', 'AMERICA DO SUL', 'ASIA', 'EUROPA']),
    BERCO: new Set(['101', '102', '103', '104', '105', '201', '202', '203', '205']),
    PORTO_ATRACACAO: new Set(['Salvador', 'Ilhéus', 'Aratu']),
    PORTO_ORIGEM: new Set(['Salvador', 'Ilhéus', 'Aratu']),
    PORTO_DESTINO: new Set(['Salvador', 'Ilhéus', 'Aratu']),
    TIPO_CARGA: new Set(['Carga 1', 'Carga 2', 'Carga 3', 'Carga 4', 'Carga 5']),
    TIPO_CARGA_MACRO: new Set(['CARGA GERAL', 'GRANEL LÍQUIDO', 'GRANEL SÓLIDO', 'PROJETO']),
    PORTE_NAVIO: new Set(['Pequeno', 'Médio', 'Grande']),
    CLIMA_DIA: new Set(['Chuva', 'Instável', 'Sol']),
    MARE_DIA: new Set(['Baixa', 'Normal', 'Alta', 'Extrema']),
    DIA_SEMANA: new Set(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']),
    TURNO: new Set(['Manhã', 'Tarde', 'Noite']),
};

const YEAR_RANGE = { min: 2020, max: 2030 };

const ERROR_CATEGORIES = {
    STRUCTURE: 'Estrutura',
    REQUIRED: 'Obrigatoriedade',
    FORMAT: 'Formato',
    DOMAIN: 'Domínio',
    DATE: 'Data',
    CONSISTENCY: 'Consistência',
};

function showOverview() {
    document.getElementById('overview').style.display = 'block';
    document.getElementById('analises').style.display = 'none';
}

function showAnalises() {
    document.getElementById('overview').style.display = 'none';
    document.getElementById('analises').style.display = 'block';
    if (typeof window.initAnalisesDashboard === 'function') {
        window.initAnalisesDashboard();
    }
}

function showPortos() {
    alert('Portos - Em breve');
}

function showKPIs() {
    alert('KPIs - Em breve');
}

function handleFile(event) {
    const file = event.target.files[0];
    resetUploadFeedback();
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
        showUploadSummary('Envie um arquivo CSV no padrão CODEBA.', 'danger');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const { header, rows } = parseCsvContent(text);
            const validationResult = validateCsvData(header, rows);

            UPLOAD_STATE.errors = validationResult.errors;
            UPLOAD_STATE.rows = rows;
            UPLOAD_STATE.currentErrorPage = 1;

            if (validationResult.errors.length) {
                showUploadSummary(`Foram encontrados ${validationResult.errors.length} erro(s). Corrija o arquivo e tente novamente.`, 'danger');
                renderUploadErrors(validationResult.errors);
                renderErrorCharts(validationResult);
                renderUploadedChart([]);
                return;
            }

            showUploadSummary(`Arquivo válido! ${rows.length} linha(s) processadas.`, 'success');
            renderUploadErrors([]);
            renderErrorCharts(validationResult);
            renderUploadedChart(rows);
        } catch (error) {
            showUploadSummary(`Erro ao processar o arquivo: ${error.message}`, 'danger');
        }
    };
    reader.readAsText(file, 'utf-8');
}

document.getElementById('fileInput').addEventListener('change', handleFile);
document.getElementById('generate-report').addEventListener('click', handleGenerateReport);

function parseCsvContent(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
    if (!lines.length) {
        throw new Error('Arquivo vazio.');
    }

    const header = splitCsvLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
        const values = splitCsvLine(line);
        return header.reduce((acc, column, idx) => {
            acc[column.trim()] = (values[idx] ?? '').trim();
            return acc;
        }, {});
    });

    return { header: header.map((col) => col.trim()), rows };
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

function validateCsvData(header, rows) {
    const collector = createErrorCollector();
    validateStructure(header, collector);
    const context = { navioImo: new Map() };

    rows.forEach((row, index) => {
        const lineNumber = index + 2; // Accounting for header
        validateRow(row, lineNumber, context, collector);
    });

    return {
        errors: collector.entries,
        fieldCounts: collector.fieldCounts,
        categoryCounts: collector.categoryCounts,
    };
}

function createErrorCollector() {
    return {
        entries: [],
        fieldCounts: new Map(),
        categoryCounts: new Map(),
        add(line, field, category, message) {
            this.entries.push({ line, field, category, message });
            if (field) {
                this.fieldCounts.set(field, (this.fieldCounts.get(field) || 0) + 1);
            }
            if (category) {
                this.categoryCounts.set(category, (this.categoryCounts.get(category) || 0) + 1);
            }
        },
    };
}

function validateStructure(header, collector) {
    if (header.length !== EXPECTED_HEADERS.length) {
        collector.add(null, null, ERROR_CATEGORIES.STRUCTURE, `Estrutura inválida: esperado ${EXPECTED_HEADERS.length} colunas, encontrado ${header.length}.`);
        return;
    }

    EXPECTED_HEADERS.forEach((expected, idx) => {
        if (header[idx] !== expected) {
            collector.add(null, expected, ERROR_CATEGORIES.STRUCTURE, `Coluna ${idx + 1} deveria ser "${expected}", mas é "${header[idx]}".`);
        }
    });
}

function validateRow(row, lineNumber, context, collector) {
    EXPECTED_HEADERS.forEach((field) => {
        if (!row[field] && row[field] !== '0') {
            collector.add(lineNumber, field, ERROR_CATEGORIES.REQUIRED, `Campo ${field} é obrigatório.`);
        }
    });

    INTEGER_FIELDS.forEach((field) => {
        const value = row[field];
        if (value === undefined) return;
        if (!/^[-]?\d+$/.test(value)) {
            collector.add(lineNumber, field, ERROR_CATEGORIES.FORMAT, `Campo ${field} deve ser um número inteiro.`);
        }
    });

    validateDomain('SENTIDO', row.SENTIDO, lineNumber, collector);
    validateDomain('NAVEGACAO', row.NAVEGACAO, lineNumber, collector);
    validateDomain('REGIAO_ORIGEM', row.REGIAO_ORIGEM, lineNumber, collector);
    validateDomain('BERCO', row.BERCO, lineNumber, collector);
    ['PORTO_ATRACACAO', 'PORTO_ORIGEM', 'PORTO_DESTINO'].forEach((field) => validateDomain(field, row[field], lineNumber, collector));
    validateDomain('TIPO_CARGA', row.TIPO_CARGA, lineNumber, collector);
    validateDomain('TIPO_CARGA_MACRO', row.TIPO_CARGA_MACRO, lineNumber, collector);
    validateDomain('PORTE_NAVIO', row.PORTE_NAVIO, lineNumber, collector);
    validateDomain('CLIMA_DIA', row.CLIMA_DIA, lineNumber, collector);
    validateDomain('MARE_DIA', row.MARE_DIA, lineNumber, collector);
    validateDomain('DIA_SEMANA', row.DIA_SEMANA, lineNumber, collector);
    validateDomain('TURNO', row.TURNO, lineNumber, collector);

    if (!/^Secao\s+\d+$/i.test(row.SECAO || '')) {
        collector.add(lineNumber, 'SECAO', ERROR_CATEGORIES.DOMAIN, 'Campo SECAO deve seguir o padrão "Secao X".');
    }

    if (!/^Grupo\s+(10|[1-9])$/.test(row.GRUPOANTAQ || '')) {
        collector.add(lineNumber, 'GRUPOANTAQ', ERROR_CATEGORIES.DOMAIN, 'Campo GRUPOANTAQ deve estar entre Grupo 1 e Grupo 10.');
    }

    if (!/^\d{7}$/.test(row.IMO || '')) {
        collector.add(lineNumber, 'IMO', ERROR_CATEGORIES.FORMAT, 'Campo IMO deve conter exatamente 7 dígitos.');
    }

    validateNavioImo(row, lineNumber, context, collector);
    validateDates(row, lineNumber, collector);
}

function validateDomain(field, value, lineNumber, collector) {
    if (!DOMAIN_SETS[field]) return;
    if (!DOMAIN_SETS[field].has(value)) {
        collector.add(lineNumber, field, ERROR_CATEGORIES.DOMAIN, `Valor inválido para ${field}.`);
    }
}

function validateNavioImo(row, lineNumber, context, collector) {
    const navio = row.NAVIO;
    const imo = row.IMO;
    if (!navio || !imo) return;

    const stored = context.navioImo.get(navio);
    if (stored && stored !== imo) {
        collector.add(lineNumber, 'IMO', ERROR_CATEGORIES.CONSISTENCY, `IMO ${imo} não corresponde ao navio ${navio} (esperado ${stored}).`);
    } else if (!stored) {
        context.navioImo.set(navio, imo);
    }
}

function validateDates(row, lineNumber, collector) {
    const atracacao = parseDate(row.ATRACACAO);
    const desatracacao = parseDate(row.DESATRACACAO);

    if (!atracacao) {
        collector.add(lineNumber, 'ATRACACAO', ERROR_CATEGORIES.DATE, 'ATRACACAO inválida.');
    }
    if (!desatracacao) {
        collector.add(lineNumber, 'DESATRACACAO', ERROR_CATEGORIES.DATE, 'DESATRACACAO inválida.');
    }

    if (atracacao) {
        const atracaoYear = atracacao.getFullYear();
        const atracaoMonth = atracacao.getMonth() + 1;
        if (!isYearInRange(atracaoYear)) {
            collector.add(lineNumber, 'ATRACACAO', ERROR_CATEGORIES.DATE, 'Ano da ATRACACAO fora do intervalo permitido (2020-2030).');
        }
        if (Number(row.ANO_ATRAC) !== atracaoYear) {
            collector.add(lineNumber, 'ANO_ATRAC', ERROR_CATEGORIES.CONSISTENCY, `ANO_ATRAC deve ser ${atracaoYear}.`);
        }
        if (Number(row.MES_ATRAC) !== atracaoMonth) {
            collector.add(lineNumber, 'MES_ATRAC', ERROR_CATEGORIES.CONSISTENCY, `MES_ATRAC deve ser ${atracaoMonth}.`);
        }
    }

    if (desatracacao) {
        const desatracYear = desatracacao.getFullYear();
        if (!isYearInRange(desatracYear)) {
            collector.add(lineNumber, 'DESATRACACAO', ERROR_CATEGORIES.DATE, 'Ano da DESATRACACAO fora do intervalo permitido (2020-2030).');
        }
        if (Number(row.ANO_DESAT) !== desatracYear) {
            collector.add(lineNumber, 'ANO_DESAT', ERROR_CATEGORIES.CONSISTENCY, `ANO_DESAT deve ser ${desatracYear}.`);
        }
    }

    if (atracacao && desatracacao && desatracacao < atracacao) {
        collector.add(lineNumber, 'DESATRACACAO', ERROR_CATEGORIES.CONSISTENCY, 'DESATRACACAO deve ser posterior ou igual à ATRACACAO.');
    }
}

function parseDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isYearInRange(year) {
    return year >= YEAR_RANGE.min && year <= YEAR_RANGE.max;
}

function resetUploadFeedback() {
    renderUploadErrors([]);
    showUploadSummary('', '');
    renderErrorCharts({ errors: [], fieldCounts: new Map(), categoryCounts: new Map() });
    renderUploadedChart([]);
    UPLOAD_STATE.currentErrorPage = 1;
}

function showUploadSummary(message, type) {
    const container = document.getElementById('upload-summary');
    if (!container) return;
    if (!message) {
        container.style.display = 'none';
        container.textContent = '';
        container.className = 'alert mt-3';
        return;
    }
    container.textContent = message;
    container.style.display = 'block';
    container.className = `alert mt-3 alert-${type}`;
}

function renderUploadErrors(errors, forcedPage) {
    const details = document.getElementById('upload-errors-details');
    const summary = details ? details.querySelector('summary') : null;
    const list = document.getElementById('upload-errors');
    const pagination = document.getElementById('upload-errors-pagination');
    if (!list || !details || !pagination) return;

    list.innerHTML = '';
    pagination.innerHTML = '';

    if (!errors.length) {
        details.style.display = 'none';
        details.open = false;
        if (summary) {
            summary.textContent = 'Ver detalhes dos erros';
        }
        return;
    }

    details.style.display = 'block';
    if (summary) {
        summary.textContent = `Ver detalhes dos erros (${errors.length})`;
    }

    const totalPages = Math.max(1, Math.ceil(errors.length / ERROR_PAGE_SIZE));
    let currentPage = Number.isInteger(forcedPage) ? forcedPage : UPLOAD_STATE.currentErrorPage;
    if (!currentPage) currentPage = 1;
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    UPLOAD_STATE.currentErrorPage = currentPage;
    details.open = true;

    const startIndex = (currentPage - 1) * ERROR_PAGE_SIZE;
    const pageItems = errors.slice(startIndex, startIndex + ERROR_PAGE_SIZE);

    pageItems.forEach((error) => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-danger';
        const prefix = error.line ? `Linha ${error.line}: ` : '';
        const fieldInfo = error.field ? `[${error.field}] ` : '';
        li.textContent = `${prefix}${fieldInfo}${error.message}`;
        list.appendChild(li);
    });

    const info = document.createElement('span');
    info.className = 'text-muted small';
    info.textContent = `Página ${currentPage} de ${totalPages}`;
    pagination.appendChild(info);

    if (totalPages > 1) {
        const controls = document.createElement('div');
        controls.className = 'btn-group btn-group-sm ms-auto';

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'btn btn-outline-secondary';
        prevBtn.textContent = 'Anterior';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            renderUploadErrors(errors, currentPage - 1);
        });

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'btn btn-outline-secondary';
        nextBtn.textContent = 'Próxima';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            renderUploadErrors(errors, currentPage + 1);
        });

        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        pagination.appendChild(controls);
    }
}

function renderUploadedChart(rows) {
    const counts = rows.reduce((acc, row) => {
        const porto = row.PORTO_ATRACACAO;
        if (porto) {
            acc[porto] = (acc[porto] || 0) + 1;
        }
        return acc;
    }, {});

    const labels = Object.keys(counts);
    const dataValues = Object.values(counts);

    if (UPLOAD_STATE.charts.validData) {
        UPLOAD_STATE.charts.validData.destroy();
        UPLOAD_STATE.charts.validData = null;
    }

    const canvas = document.getElementById('chart');
    if (!canvas || !labels.length) return;
    const ctx = canvas.getContext('2d');

    UPLOAD_STATE.charts.validData = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Atracações válidas por porto',
                data: dataValues,
                backgroundColor: '#1d4ed8',
                borderColor: '#1e40af',
                borderWidth: 1,
            }],
        },
        options: {
            scales: {
                y: { beginAtZero: true },
            },
        },
    });
}

function renderErrorCharts(validationResult) {
    renderErrorFieldChart(validationResult.fieldCounts);
    renderErrorCategoryChart(validationResult.categoryCounts);
}

function renderErrorFieldChart(fieldCounts) {
    if (UPLOAD_STATE.charts.errorFields) {
        UPLOAD_STATE.charts.errorFields.destroy();
        UPLOAD_STATE.charts.errorFields = null;
    }

    const canvas = document.getElementById('uploadErrorsFieldChart');
    if (!canvas) return;
    const labels = Array.from(fieldCounts.keys());
    if (!labels.length) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    const data = labels.map((field) => fieldCounts.get(field));

    UPLOAD_STATE.charts.errorFields = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Erros por campo',
                data,
                backgroundColor: '#f97316',
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
            },
        },
    });
}

function renderErrorCategoryChart(categoryCounts) {
    if (UPLOAD_STATE.charts.errorCategories) {
        UPLOAD_STATE.charts.errorCategories.destroy();
        UPLOAD_STATE.charts.errorCategories = null;
    }

    const canvas = document.getElementById('uploadErrorsCategoryChart');
    if (!canvas) return;
    const labels = Array.from(categoryCounts.keys());
    if (!labels.length) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    const data = labels.map((category) => categoryCounts.get(category));
    const paletteErrors = ['#ef4444', '#f97316', '#facc15', '#0ea5e9', '#a855f7', '#34d399'];

    UPLOAD_STATE.charts.errorCategories = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: paletteErrors,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
            },
        },
    });
}

function handleGenerateReport() {
    if (!UPLOAD_STATE.errors.length) {
        showUploadSummary('Nenhum erro disponível para gerar relatório.', 'info');
        return;
    }

    const lines = [
        'Relatório de validação CODEBA',
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
        `Total de erros: ${UPLOAD_STATE.errors.length}`,
        '',
    ];

    UPLOAD_STATE.errors.forEach((error) => {
        const lineInfo = error.line ? `Linha ${error.line}` : 'Linha n/d';
        const fieldInfo = error.field ? `Campo: ${error.field}` : 'Campo n/d';
        lines.push(`${lineInfo} | ${fieldInfo} | Categoria: ${error.category} | ${error.message}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-erros-codeba-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function logout() {
    window.location.href = '../index.html';
}