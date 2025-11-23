# CODEBASIGHT — Visualizador de Dados de Porto

Este repositório contém uma interface front-end simples em HTML/CSS/JS para visualização de dados portuários (ex.: atracações, tipos de carga, navios). O projeto é estático — não há backend — e foi pensado para ser executado localmente em qualquer navegador moderno.

## Visão geral

- Arquivos principais: `index.html` (tela de login), `pages/dashboard.html` (dashboard), arquivos CSS em `css/`, e scripts em `js/`.
- Dados de exemplo: `Base-dados_Codeba.csv` e `PlanilhaCodeba_Dados-Errados.csv` no diretório raiz.
- Tecnologias: HTML5, CSS, JavaScript, Bootstrap (CDN), Chart.js (CDN).

## Estrutura do projeto

```
solution/
├─ Base-dados_Codeba.csv            # Dados principais (CSV)
├─ PlanilhaCodeba_Dados-Errados.csv # Planilha com exemplos de dados incorretos/para limpeza
├─ index.html                       # Página de login
├─ pages/
│  └─ dashboard.html                # Dashboard (página com gráficos/visualizações)
├─ css/
│  ├─ login.css
│  └─ dashboard.css
└─ js/
	├─ login.js
	├─ dashboard.js
	└─ analises-charts.js
```

## Pré-requisitos

- Navegador moderno (Chrome, Firefox, Edge, etc.).
- (Opcional) Node.js/npm se você preferir rodar com um pacote `serve`.
- Python 3 caso queira usar o servidor HTTP rápido embutido.

> Observação: como o projeto pode carregar dados via fetch ou AJAX, é recomendado servi-lo por um servidor HTTP local em vez de abrir o arquivo `index.html` diretamente no navegador, para evitar problemas de CORS ao carregar recursos locais.

## Como rodar (opções)

Opção 1 — Abrir localmente (rápido, pode funcionar):

1. Abra `index.html` no navegador (duplo clique ou `File -> Open`).

Limitação: alguns navegadores bloqueiam requisições fetch para arquivos locais. Se o dashboard carregar dados por fetch, use a opção 2.

Opção 2 — Servidor HTTP simples com Python 3 (recomendado):

No diretório do projeto (onde está `index.html`), execute:

```bash
python3 -m http.server 8000
```

Em seguida, abra no navegador:

http://localhost:8000/

Opção 3 — Usando `npx serve` (Node, sem instalação global):

```bash
npx serve . -l 8000
```

Ou, se preferir instalar globalmente:

```bash
npm i -g serve
serve . -l 8000
```

Em todos os casos, você poderá abrir a página de login em `/index.html` e o dashboard em `/pages/dashboard.html`.

## Visualizando os dados (CSV)

- `Base-dados_Codeba.csv` é o arquivo de dados principal; o formato é CSV com colunas como `ATRACACAO`, `MES_ATRAC`, `ANO_ATRAC`, `TIPO_CARGA`, `NAVIO`, `IMO`, etc.
- `PlanilhaCodeba_Dados-Errados.csv` contém linhas com dados deliberadamente incorretos/exemplos para limpeza (datas erradas, colunas mal formatadas). Use-o para testes de tratamento de dados.

Se os scripts JS (ex.: `dashboard.js`, `analises-charts.js`) fazem fetch das CSVs, verifique o caminho relativo usado. Ao servir com `python -m http.server`, rotas relativas funcionarão corretamente.

## Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo LICENSE na raiz do repositório para o texto completo.
