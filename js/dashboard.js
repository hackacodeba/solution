// Simples gráficos em canvas (substituir por SVG se necessário)
function drawPieChart(canvasId, data, colors) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const total = data.reduce((a, b) => a + b, 0);
    let startAngle = 0;
    data.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            // Contar por PORTO_ATRACACAO
            const counts = {};
            json.forEach(row => {
                const porto = row.PORTO_ATRACACAO;
                if (porto) {
                    counts[porto] = (counts[porto] || 0) + 1;
                }
            });

            const labels = Object.keys(counts);
            const dataValues = Object.values(counts);

            // Destruir gráfico anterior se existir
            if (window.myChart) {
                window.myChart.destroy();
            }

            const ctx = document.getElementById('chart').getContext('2d');
            window.myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Contagem por Porto',
                        data: dataValues,
                        backgroundColor: '#1d4ed8',
                        borderColor: '#1e40af',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            alert('Erro ao processar o arquivo: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

document.getElementById('fileInput').addEventListener('change', handleFile);

function logout() {
    window.location.href = '../index.html';
}