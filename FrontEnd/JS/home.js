// home.js 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

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
    const apiKey = "AIzaSyD7hGcyKNffmPHLUiNAgWDUzeAW0MwR93c"; // Sua chave Gemini
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorData = await response.json();
            // Lança um erro com a mensagem específica da API para ser capturado pelo seletor.
            throw new Error(errorData.error?.message || 'Erro desconhecido na API Gemini.');
        }
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini não retornou uma resposta válida.";
    } catch (error) {
        // Repassa o erro para a função que chamou (callAIProvider)
        throw error;
    }
}

/**
 * Adaptador 2: Comunica-se com a API da OpenAI (modelos GPT).
 */
async function callOpenAI_API(prompt) {
    const apiKey = "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"; 
    if (apiKey === "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") {
        throw new Error("A chave de API da OpenAI não foi configurada.");
    }
    const apiUrl = `https://api.openai.com/v1/chat/completions`;
    const payload = {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
    };
    try {
        const response = await fetch(apiUrl, { 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }, 
            body: JSON.stringify(payload) 
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erro desconhecido na API OpenAI.');
        }
        const result = await response.json();
        return result.choices?.[0]?.message?.content || "OpenAI não retornou uma resposta válida.";
    } catch (error) {
        throw error;
    }
}

/**
 * ATUALIZADO Seletor: Função principal que escolhe qual IA usar, com lógica de fallback.
 */
async function callAIProvider(provider, prompt) {
    if (provider === 'gemini') {
        try {
            console.log("Tentando provedor primário: Gemini...");
            return await callGeminiAPI(prompt);
        } catch (error) {
            console.error(`Erro ao contatar a IA (Gemini):`, error);
            // Verifica se o erro é de sobrecarga para tentar o fallback.
            if (error.message && error.message.toLowerCase().includes('overloaded')) {
                console.warn("Gemini sobrecarregado. Acionando fallback para OpenAI...");
                try {
                    return await callOpenAI_API(prompt);
                } catch (openAIError) {
                    console.error(`Erro ao contatar a IA (OpenAI Fallback):`, openAIError);
                    return `<strong>Erro nos dois provedores de IA:</strong><br><br><b>Gemini:</b> ${error.message}<br><b>OpenAI:</b> ${openAIError.message}`;
                }
            }
            // Se for outro erro do Gemini, mostra diretamente.
            return `<strong>Erro ao contatar a IA:</strong><br><br>${error.message}`;
        }
    } else if (provider === 'openai') {
        // Chamada direta para OpenAI, caso seja a preferência.
        try {
            return await callOpenAI_API(prompt);
        } catch (error) {
             console.error(`Erro ao contatar a IA (OpenAI):`, error);
             return `<strong>Erro ao contatar a IA:</strong><br><br>${error.message}`;
        }
    } else {
        return `<strong>Erro de Configuração:</strong><br><br>Provedor de IA '${provider}' não é suportado.`;
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

    const prompt = `Aja como um especialista em manutenção industrial. O ativo '${ativo.nome}' (ID: ${ativo.id}) está com o status '${ativo.status}'. O último erro registrado foi: "${ativo.ultimo_erro}". Forneça uma análise concisa em tópicos sobre:
    **1. Possíveis Causas Raiz:** Baseado no erro, liste 3 possíveis motivos para este status.
    **2. Ações Recomendadas:** Sugira 3 passos de diagnóstico imediatos para a equipe.
    Responda em português do Brasil e use este formato exato.`;
    
    // Nenhuma mudança aqui. A lógica de fallback é gerenciada pelo callAIProvider.
    const result = await callAIProvider('gemini', prompt);
    
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


/* chatbot-button.js
   Módulo autônomo. Usa IIFE para não poluir o escopo global.
   Regras:
   - Não altera variáveis globais.
   - Event listeners anexados ao root apenas.
   - Fornece hooks (callbacks) para integração com chat backend.
*/
(function(){
  const ROOT_ID = 'sgmi-chatbot-root';
  const BTN_ID = 'sgmi-chatbot-btn';
  const MODAL_ID = 'sgmi-chatbot-modal';
  const CLOSE_SEL = '.sgmi-chatbot-close';

  const root = document.getElementById(ROOT_ID);
  if (!root) {
    console.warn('[sgmi-chatbot] root element not found. Skipping initialization.');
    return;
  }

  const btn = document.getElementById(BTN_ID);
  const modal = document.getElementById(MODAL_ID);
  const closeBtn = modal ? modal.querySelector(CLOSE_SEL) : null;

  // Estado encapsulado
  let state = { open: false };

  // Accessibility: allow open/close with keyboard
  function onKeyDown(e){
    if (!state.open && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggleModal(true);
    } else if (state.open && e.key === 'Escape') {
      toggleModal(false);
    }
  }

  function toggleModal(open){
    state.open = !!open;
    if (modal) modal.setAttribute('aria-hidden', (!state.open).toString());
    if (btn) {
      btn.setAttribute('aria-pressed', state.open ? 'true' : 'false');
      if (state.open) btn.classList.remove('sgmi-idle'); else btn.classList.add('sgmi-idle');
    }
    // focus management
    if (state.open){
      // focus the modal for keyboard users
      const focusable = modal && modal.querySelector('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    } else {
      if (btn) btn.focus();
    }
  }

  // Click handlers
  function onBtnClick(e){
    e.stopPropagation && e.stopPropagation();
    toggleModal(!state.open);
  }

  function onOutsideClick(e){
    // close modal when clicking outside (but be careful with nested components)
    if (!state.open || !modal) return;
    const within = modal.contains(e.target) || btn.contains(e.target);
    if (!within) toggleModal(false);
  }

  // Attach handlers safely
  btn && btn.addEventListener('click', onBtnClick);
  btn && btn.addEventListener('keydown', onKeyDown);
  closeBtn && closeBtn.addEventListener('click', ()=> toggleModal(false));
  document.addEventListener('click', onOutsideClick);

  // Initialize idle breathing animation
  // start as idle
  if (btn) btn.classList.add('sgmi-idle');

  // Expose a safe hook for integration (no global leak)
  // window.SGMI_CHATBOT is used only if developer explicitly sets it (not created here)
  // To integrate chat behavior, assign handlers to window.SGMI_CHATBOT in your own code:
  // window.SGMI_CHATBOT = { onOpen: fn(), onClose: fn(), onSendMessage: async fn(message) => response }
  try {
    if (window.SGMI_CHATBOT && typeof window.SGMI_CHATBOT.onOpen === 'function') {
      // call onOpen when modal is opened
      const originalToggle = toggleModal;
      toggleModal = function(open){
        originalToggle(open);
        if (open) window.SGMI_CHATBOT.onOpen();
        else if (typeof window.SGMI_CHATBOT.onClose === 'function') window.SGMI_CHATBOT.onClose();
      };
    }
  } catch (err) {
    // fail silently
    console.warn('[sgmi-chatbot] hook init error', err);
  }

  // Clean-up API (returns a function to remove listeners) — useful if SPA changes route
  function uninstall(){
    btn && btn.removeEventListener('click', onBtnClick);
    btn && btn.removeEventListener('keydown', onKeyDown);
    closeBtn && closeBtn.removeEventListener('click', ()=> toggleModal(false));
    document.removeEventListener('click', onOutsideClick);
  }

  // Attach to root dataset for external control if needed
  root.sgmiChatbot = { toggleModal, uninstall };

  // safety: prevent accidental autosubmit in forms when pressing Enter on the button
  btn && btn.addEventListener('keypress', (e)=> {
    if (e.key === 'Enter') e.preventDefault();
  });

})();


// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o modal de análise de ativos
    const geminiModalElement = document.getElementById('geminiAnalysisModal');
    if (geminiModalElement) {
        geminiModal = new bootstrap.Modal(geminiModalElement);
    }

    // --- LÓGICA DO CHATBOT ---
    const chatbotFab = document.getElementById('ai-chatbot-fab');
    const chatWindow = document.getElementById('ai-chat-window');
    const closeChatBtn = document.getElementById('ai-chat-close-btn');
    const chatMessages = document.getElementById('ai-chat-messages');
    const chatInput = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send-btn');

    if (chatbotFab && chatWindow && closeChatBtn && chatInput && sendBtn) {
        // Abre e fecha a janela do chat
        chatbotFab.addEventListener('click', () => {
            chatWindow.classList.toggle('visible');
            chatInput.focus();
        });

        closeChatBtn.addEventListener('click', () => {
            chatWindow.classList.remove('visible');
        });

        // Função para criar e adicionar mensagens ao chat
        const adicionarMensagem = (conteudo, tipo = "ai") => {
            const div = document.createElement('div');
            div.classList.add('message');
            div.classList.add(tipo === "user" ? 'user-message' : 'ai-message');
            div.innerHTML = `<p>${conteudo}</p>`;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };

        // Função para enviar pergunta ao endpoint
        const enviarPergunta = async () => {
            const pergunta = chatInput.value.trim();
            if (!pergunta) return;

            // Adiciona a pergunta do usuário ao chat
            adicionarMensagem(pergunta, "user");
            chatInput.value = '';
            chatInput.disabled = true;
            sendBtn.disabled = true;

            try {
                const response = await fetch('http://localhost:5000/chat', { // URL absoluta do endpoint Flask
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: pergunta })
                });

                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status}`);
                }

                const data = await response.json();
                const resposta = data.mensagem || "Não obtive resposta do servidor.";

                // Adiciona a resposta da IA ao chat
                adicionarMensagem(resposta, "ai");
            } catch (err) {
                adicionarMensagem("Ocorreu um erro ao enviar a pergunta.", "ai");
                console.error(err);
            } finally {
                chatInput.disabled = false;
                sendBtn.disabled = false;
                chatInput.focus();
            }
        };

        // Envia pergunta ao clicar no botão
        sendBtn.addEventListener('click', enviarPergunta);

        // Envia pergunta ao pressionar Enter
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                enviarPergunta();
            }
        });
    }
    // --- FIM DA LÓGICA DO CHATBOT ---
});
