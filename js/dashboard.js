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
            const errors = validateCsvData(header, rows);

            if (errors.length) {
                showUploadSummary(`Foram encontrados ${errors.length} erro(s). Corrija o arquivo e tente novamente.`, 'danger');
                renderUploadErrors(errors);
                window.myChart && window.myChart.destroy();
                return;
            }

            showUploadSummary(`Arquivo válido! ${rows.length} linha(s) processadas.`, 'success');
            renderUploadErrors([]);
            renderUploadedChart(rows);
        } catch (error) {
            showUploadSummary(`Erro ao processar o arquivo: ${error.message}`, 'danger');
        }
    };
    reader.readAsText(file, 'utf-8');
}

document.getElementById('fileInput').addEventListener('change', handleFile);

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
    const errors = [];
    errors.push(...validateStructure(header));
    const context = { navioImo: new Map() };

    rows.forEach((row, index) => {
        const lineNumber = index + 2; // Accounting for header
        errors.push(...validateRow(row, lineNumber, context));
    });

    return errors;
}

function validateStructure(header) {
    const errors = [];
    if (header.length !== EXPECTED_HEADERS.length) {
        errors.push(`Estrutura inválida: esperado ${EXPECTED_HEADERS.length} colunas, encontrado ${header.length}.`);
        return errors;
    }

    EXPECTED_HEADERS.forEach((expected, idx) => {
        if (header[idx] !== expected) {
            errors.push(`Estrutura inválida: coluna ${idx + 1} deveria ser "${expected}", mas é "${header[idx]}".`);
        }
    });

    return errors;
}

function validateRow(row, lineNumber, context) {
    const errors = [];
    EXPECTED_HEADERS.forEach((field) => {
        if (!row[field] && row[field] !== '0') {
            errors.push(`Linha ${lineNumber}: campo ${field} é obrigatório.`);
        }
    });

    INTEGER_FIELDS.forEach((field) => {
        const value = row[field];
        if (value === undefined) return;
        if (!/^[-]?\d+$/.test(value)) {
            errors.push(`Linha ${lineNumber}: campo ${field} deve ser um número inteiro.`);
        }
    });

    validateDomain('SENTIDO', row.SENTIDO, lineNumber, errors);
    validateDomain('NAVEGACAO', row.NAVEGACAO, lineNumber, errors);
    validateDomain('REGIAO_ORIGEM', row.REGIAO_ORIGEM, lineNumber, errors);
    validateDomain('BERCO', row.BERCO, lineNumber, errors);
    ['PORTO_ATRACACAO', 'PORTO_ORIGEM', 'PORTO_DESTINO'].forEach((field) => validateDomain(field, row[field], lineNumber, errors));
    validateDomain('TIPO_CARGA', row.TIPO_CARGA, lineNumber, errors);
    validateDomain('TIPO_CARGA_MACRO', row.TIPO_CARGA_MACRO, lineNumber, errors);
    validateDomain('PORTE_NAVIO', row.PORTE_NAVIO, lineNumber, errors);
    validateDomain('CLIMA_DIA', row.CLIMA_DIA, lineNumber, errors);
    validateDomain('MARE_DIA', row.MARE_DIA, lineNumber, errors);
    validateDomain('DIA_SEMANA', row.DIA_SEMANA, lineNumber, errors);
    validateDomain('TURNO', row.TURNO, lineNumber, errors);

    if (!/^Secao\s+\d+$/i.test(row.SECAO || '')) {
        errors.push(`Linha ${lineNumber}: campo SECAO deve seguir o padrão "Secao X".`);
    }

    if (!/^Grupo\s+(10|[1-9])$/.test(row.GRUPOANTAQ || '')) {
        errors.push(`Linha ${lineNumber}: campo GRUPOANTAQ deve estar entre Grupo 1 e Grupo 10.`);
    }

    if (!/^\d{7}$/.test(row.IMO || '')) {
        errors.push(`Linha ${lineNumber}: campo IMO deve conter exatamente 7 dígitos.`);
    }

    validateNavioImo(row, lineNumber, context, errors);
    validateDates(row, lineNumber, errors);

    return errors;
}

function validateDomain(field, value, lineNumber, errors) {
    if (!DOMAIN_SETS[field]) return;
    if (!DOMAIN_SETS[field].has(value)) {
        errors.push(`Linha ${lineNumber}: valor inválido para ${field}.`);
    }
}

function validateNavioImo(row, lineNumber, context, errors) {
    const navio = row.NAVIO;
    const imo = row.IMO;
    if (!navio || !imo) return;

    const stored = context.navioImo.get(navio);
    if (stored && stored !== imo) {
        errors.push(`Linha ${lineNumber}: IMO ${imo} não corresponde ao navio ${navio} (esperado ${stored}).`);
    } else if (!stored) {
        context.navioImo.set(navio, imo);
    }
}

function validateDates(row, lineNumber, errors) {
    const atracacao = parseDate(row.ATRACACAO);
    const desatracacao = parseDate(row.DESATRACACAO);

    if (!atracacao) {
        errors.push(`Linha ${lineNumber}: ATRACACAO inválida.`);
    }
    if (!desatracacao) {
        errors.push(`Linha ${lineNumber}: DESATRACACAO inválida.`);
    }

    if (atracacao) {
        const atracaoYear = atracacao.getFullYear();
        const atracaoMonth = atracacao.getMonth() + 1;
        if (!isYearInRange(atracaoYear)) {
            errors.push(`Linha ${lineNumber}: ano da ATRACACAO fora do intervalo permitido (2020-2030).`);
        }
        if (Number(row.ANO_ATRAC) !== atracaoYear) {
            errors.push(`Linha ${lineNumber}: ANO_ATRAC deve ser ${atracaoYear}.`);
        }
        if (Number(row.MES_ATRAC) !== atracaoMonth) {
            errors.push(`Linha ${lineNumber}: MES_ATRAC deve ser ${atracaoMonth}.`);
        }
    }

    if (desatracacao) {
        const desatracYear = desatracacao.getFullYear();
        if (!isYearInRange(desatracYear)) {
            errors.push(`Linha ${lineNumber}: ano da DESATRACACAO fora do intervalo permitido (2020-2030).`);
        }
        if (Number(row.ANO_DESAT) !== desatracYear) {
            errors.push(`Linha ${lineNumber}: ANO_DESAT deve ser ${desatracYear}.`);
        }
    }

    if (atracacao && desatracacao && desatracacao < atracacao) {
        errors.push(`Linha ${lineNumber}: DESATRACACAO deve ser posterior ou igual à ATRACACAO.`);
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

function renderUploadErrors(errors) {
    const list = document.getElementById('upload-errors');
    if (!list) return;
    list.innerHTML = '';
    if (!errors.length) return;
    errors.forEach((error) => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-danger';
        li.textContent = error;
        list.appendChild(li);
    });
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

    if (window.myChart) {
        window.myChart.destroy();
    }

    const canvas = document.getElementById('chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    window.myChart = new Chart(ctx, {
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

function logout() {
    window.location.href = '../index.html';
}