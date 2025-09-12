// home.js

// --- VARIÁVEIS GLOBAIS ---
let chartTemp, chartUmid;
let geminiModal;


// --- FUNÇÕES DE ATUALIZAÇÃO DE DADOS ---

/**
 * NOVA FUNÇÃO: Busca no backend a LISTA DETALHADA de ativos que não estão operacionais.
 * Esta função substitui a simulação (mock) e busca os dados reais.
 */
async function fetchAtivosComAlerta() {
    try {
        // Este é o novo endpoint que você precisará criar no seu backend.
        // Ele deve retornar um JSON com a lista de ativos que não estão com status 'ativo'.
        const response = await fetch(`${API_BASE_URL}/ativos/alertas`); 
        if (!response.ok) {
            throw new Error(`Erro na API ao buscar alertas: ${response.statusText}`);
        }
        return await response.json(); // Retorna a lista de ativos.
    } catch (error) {
        console.error(error);
        const container = document.getElementById('ativos-com-alerta-container');
        container.innerHTML = `<div class="status-item"><span style="opacity: 0.7;">Não foi possível carregar os alertas.</span></div>`;
        // Em caso de erro, retorna um array vazio para não quebrar o resto do código.
        return []; 
    }
}


async function atualizarIndicadores() {
    try {
        // --- PEÇAS EM ESTOQUE (sem alteração) ---
        const pecasResponse = await fetch(`${API_BASE_URL}/estoque_pecas`);
        const pecasData = await pecasResponse.json();
        document.getElementById('estoque-total').textContent = pecasData.estoque;
        document.getElementById('entrada-pecas').textContent = pecasData.entrada;
        document.getElementById('saida-pecas').textContent = pecasData.saida;

        // --- ATUALIZAÇÃO PRINCIPAL: LÓGICA DE ATIVOS INDIVIDUAIS ---
        // 1. Busca o total de ativos operacionais (sua chamada de API existente).
        const totalAtivosResponse = await fetch(`${API_BASE_URL}/ativos/status`);
        const totalAtivosData = await totalAtivosResponse.json();
        const ativosMap = new Map(totalAtivosData.map(s => [s.Status, s.quantidade]));
        document.getElementById('ativos-ativo').textContent = ativosMap.get('ativo') || 0;

        // 2. Busca a LISTA REAL de ativos que precisam de atenção.
        const ativosComAlerta = await fetchAtivosComAlerta();
        const container = document.getElementById('ativos-com-alerta-container');
        container.innerHTML = ''; // Limpa o container antes de adicionar os novos itens.

        // 3. Se não houver alertas, exibe uma mensagem informativa.
        if (ativosComAlerta.length === 0) {
            container.innerHTML = `<div class="status-item"><span style="opacity: 0.7;">Nenhum ativo com alerta no momento.</span></div>`;
        }

        // 4. Cria a interface dinamicamente para cada ativo com alerta.
        ativosComAlerta.forEach(ativo => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ativo-alerta-item';

            const iconMap = {
                'Inativo': 'fa-times-circle',
                'Em Manutenção': 'fa-wrench',
                'Condenado': 'fa-ban'
            };
            const iconClass = iconMap[ativo.status] || 'fa-exclamation-circle';
            const corStatus = ativo.cor_status || '#9ca3af'; // Cor padrão

            const infoDiv = document.createElement('div');
            infoDiv.className = 'info';
            infoDiv.innerHTML = `
                <span class="asset-name"><i class="fas ${iconClass}" style="color:${corStatus};"></i> ${ativo.nome}</span>
                <span class="asset-status ms-4">${ativo.status}</span>
            `;

            const button = document.createElement('button');
            button.className = 'btn-gemini';
            button.innerHTML = '<i class="fas fa-brain me-1"></i> Analisar';
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                handleGeminiAnalysis(ativo); 
            });

            itemDiv.appendChild(infoDiv);
            itemDiv.appendChild(button);
            container.appendChild(itemDiv);
        });

        // --- STATUS DAS ORDENS DE MANUTENÇÃO (sem alteração) ---
        const omResponse = await fetch(`${API_BASE_URL}/om/status`);
        const statusOm = await omResponse.json();
        const omMap = new Map(statusOm.map(s => [s.Status, s.quantidade]));
        document.getElementById('om-aberto').textContent = omMap.get('Aberta') || 0;
        document.getElementById('om-em-andamento').textContent = omMap.get('Em Andamento') || 0;
        document.getElementById('om-concluida').textContent = omMap.get('Concluida') || 0;

    } catch (error) {
        console.error("Erro ao atualizar indicadores:", error);
    }
}

async function carregarDadosSensores() {
    try {
        const response = await fetch(`${API_BASE_URL}/dados`);
        const dados = await response.json();
        const temperatura = dados.filter(d => d.Topico === 'Cypher/Temperatura' && !isNaN(d.Valor));
        const umidade = dados.filter(d => d.Topico === 'Cypher/Umidade' && !isNaN(d.Valor));
        const valorTempAtual = temperatura.length > 0 ? temperatura[temperatura.length - 1].Valor : '--';
        const valorUmidAtual = umidade.length > 0 ? umidade[umidade.length - 1].Valor : '--';
        document.getElementById('temp').textContent = valorTempAtual + ' °C';
        document.getElementById('umid').textContent = valorUmidAtual + ' %';
        const media = (arr) => arr.length > 0 ? (arr.reduce((soma, item) => soma + parseFloat(item.Valor), 0) / arr.length).toFixed(1) : '--';
        document.getElementById('mediaTemp').textContent = media(temperatura) + ' °C';
        document.getElementById('mediaUmid').textContent = media(umidade) + ' %';
        if (chartTemp && chartUmid) {
            chartTemp.data.labels = temperatura.map(d => new Date(d.Data_Hora).toLocaleTimeString());
            chartTemp.data.datasets[0].data = temperatura.map(d => parseFloat(d.Valor));
            chartTemp.update();
            chartUmid.data.labels = umidade.map(d => new Date(d.Data_Hora).toLocaleTimeString());
            chartUmid.data.datasets[0].data = umidade.map(d => parseFloat(d.Valor));
            chartUmid.update();
        }
    } catch (erro) {
        console.error('Erro ao carregar dados dos sensores:', erro);
    }
}


// --- FUNÇÕES DA INTELIGÊNCIA ARTIFICIAL (GEMINI) ---

async function callGeminiAPI(prompt) {
    const apiKey = "AIzaSyD7hGcyKNffmPHLUiNAgWDUzeAW0MwR93c";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || 'A resposta da API indica um erro.';
            return `<strong>Erro ao contatar a IA:</strong><br><br>${errorMessage}`;
        }
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "A IA não retornou uma resposta válida.";
    } catch (error) {
        return "Falha na comunicação com a IA. Verifique sua conexão.";
    }
}

function formatAIResponse(text) {
    let html = '';
    const lines = text.split('\n').filter(line => line.trim() !== '');
    let inList = false;
    lines.forEach(line => {
        let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (processedLine.trim().startsWith('*')) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${processedLine.trim().substring(1).trim()}</li>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            if (processedLine.includes('<strong>')) { html += `<h6>${processedLine}</h6>`; } 
            else { html += `<p>${processedLine}</p>`; }
        }
    });
    if (inList) { html += '</ul>'; }
    return `<div class="ai-response-formatted">${html}</div>`;
}

async function handleGeminiAnalysis(ativo) {
    if (!geminiModal) return;
    geminiModal.show();
    
    const responseEl = document.getElementById('gemini-response');
    responseEl.innerHTML = `<div class="spinner-border" role="status"></div><p class="mt-2">Analisando dados e consultando a IA...</p>`;
    responseEl.style.textAlign = 'center';

    document.getElementById('gemini-asset-name').textContent = ativo.nome;
    document.getElementById('gemini-asset-status').textContent = ativo.status;

    // O prompt agora inclui o último erro conhecido, vindo do banco de dados.
    const prompt = `Aja como um especialista em manutenção industrial. O ativo '${ativo.nome}' (ID: ${ativo.id}) está com o status '${ativo.status}'. O último erro registrado foi: "${ativo.ultimo_erro}". Forneça uma análise concisa em tópicos sobre:
    **1. Possíveis Causas Raiz:** Baseado no erro, liste 3 possíveis motivos para este status.
    **2. Ações Recomendadas:** Sugira 3 passos de diagnóstico imediatos para a equipe.
    Responda em português do Brasil e use este formato exato.`;

    const result = await callGeminiAPI(prompt);
    
    responseEl.style.textAlign = 'left';
    responseEl.innerHTML = formatAIResponse(result);
}


// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
    const geminiModalElement = document.getElementById('geminiAnalysisModal');
    if (geminiModalElement) {
        geminiModal = new bootstrap.Modal(geminiModalElement);
    }
    const ctxTemp = document.getElementById('graficoTemp').getContext('2d');
    const ctxUmid = document.getElementById('graficoUmid').getContext('2d');
    chartTemp = new Chart(ctxTemp, { type: 'line', data: { labels: [], datasets: [{ label: 'Temperatura (°C)', data: [], borderColor: 'white', borderWidth: 2, tension: 0.2 }] }, options: { plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } }, y: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } } } } });
    chartUmid = new Chart(ctxUmid, { type: 'line', data: { labels: [], datasets: [{ label: 'Umidade (%)', data: [], borderColor: 'white', borderWidth: 2, tension: 0.2 }] }, options: { plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } }, y: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } } } } });
    particlesJS('particles-js', { particles: { number: { value: 50, density: { enable: true, value_area: 800 } }, color: { value: "#0d6efd" }, shape: { type: "circle" }, opacity: { value: 0.7, random: true }, size: { value: 3, random: true }, line_linked: { enable: true, distance: 150, color: "#0d6efd", opacity: 0.2, width: 1 }, move: { enable: true, speed: 1, direction: "none", out_mode: "out" } }, interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "grab" } }, modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } } } }, retina_detect: true });

    atualizarIndicadores();
    carregarDadosSensores();
    setInterval(atualizarIndicadores, 15000);
    setInterval(carregarDadosSensores, 10000);
});
