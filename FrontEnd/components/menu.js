// menu.js

/**
 * Carrega e insere o menu de navegação dinâmico na página.
 * O menu é construído com base no 'tipo_usuario' armazenado no localStorage.
 */
export function loadMenu() {

    // --- Bloco de Depuração (Debug) ---
    // Este código é útil para desenvolvimento, para monitorar o valor de 'tipo_usuario'.
    // Ele deve ser removido quando a aplicação for para produção.
    console.log("[DEBUG] tipo_usuario no localStorage:", localStorage.getItem("tipo_usuario"));

    // Intercepta a função localStorage.setItem para avisar sobre qualquer tentativa de alteração.
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
        if (key === "tipo_usuario") {
            console.warn(`[INTERCEPTADO] Tentativa de alteração de tipo_usuario para: ${value}`);
            console.trace(); // Mostra no console a pilha de chamadas que originou a alteração.
        }
        originalSetItem.apply(this, arguments);
    };
    // --- Fim do Bloco de Depuração ---

    // 1. Lê o tipo de usuário do localStorage.
    const tipoUsuario = localStorage.getItem("tipo_usuario");

    // 2. Define variáveis booleanas para facilitar as verificações de permissão.
    const isAdmin = tipoUsuario === "Administrador";
    const isGestor = tipoUsuario === "Gestor";
    const isUser = tipoUsuario === "Usuario";

    // 3. Constrói dinamicamente o submenu de "Cadastro" com base nas permissões.
    // O link de "Peças" é visível para todos.
    let cadastroMenu = `
        <li>
            <a class="dropdown-item engrenagem-link" href="../View/Gerenciamento_pecas.html">
                <i class="fa-solid fa-gear engrenagem-icon"></i> Peças
            </a>
        </li>
    `;

    // Adiciona mais itens ao submenu se o usuário for Administrador.
    if (isAdmin) {
        cadastroMenu += `
            <li>
                <a class="dropdown-item maquina-link" href="../View/Gerenciamento_maquinas.html">
                    <i class="fa-solid fa-industry maquina-icon"></i> Máquinas
                    <span class="smoke"></span>
                </a>
            </li>
            <li>
                <a class="dropdown-item sensor-link" href="../View/Gerenciamento_Sensores.html">
                    <i class="fa-solid fa-eye sensor-icon"></i> Sensores
                </a>
            </li>
            <li>
                <a class="dropdown-item usuario-link" href="../View/Cadastro_usuario.html">
                    <i class="fa-solid fa-user-plus usuario-icon"></i> Cadastrar Usuário
                </a>
            </li>
            <li>
                <a class="dropdown-item cadastro-user-link" href="../View/Usuario.html">
                    <i class="fa-solid fa-user-secret cadastro-user-icon"></i> Gerenciar Usuários
                </a>
            </li>
        `;
    }

    // Adiciona o item de "Manutenção" se for Administrador OU Gestor.
    if (isAdmin || isGestor) {
        cadastroMenu += `
            <li>
                <a class="dropdown-item manutencao-link" href="../View/Gerenciamento_ordens_manutencao.html">
                    <i class="fa-solid fa-helmet-safety manutencao-icon"></i> Manutenção
                </a>
            </li>
        `;
    }

    // 4. Constrói o HTML completo do menu usando Template Literals.
    const menuHTML = `
        <style>
            /* Estilos para as animações dos ícones. */
            
            .engrenagem-icon { transition: transform 0.5s ease; display: inline-block; }
            .engrenagem-icon.girando { transform: rotate(360deg); }

            .maquina-link { position: relative; }
            .smoke { position: absolute; left: 16px; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: rgba(28, 27, 27, 0.7); opacity: 0; pointer-events: none; }
            .maquina-link:hover .smoke { animation: smokeUp 5s infinite; }
            @keyframes smokeUp { 0% { opacity: 0; transform: translateY(0) scale(0.5); } 30% { opacity: 0.6; transform: translateY(-10px) scale(1); } 60% { opacity: 0.3; transform: translateY(-20px) scale(1.3); } 100% { opacity: 0; transform: translateY(-30px) scale(1.6); } }

            .sensor-icon { transition: all 10s ease; display: inline-block; }
            .sensor-link:hover .sensor-icon { animation: blinkEye 1s infinite; }
            @keyframes blinkEye { 0%, 90%, 100% { transform: scaleY(1); } 45%, 55% { transform: scaleY(0.1); } }

            .usuario-link:hover .usuario-icon { animation: pulseUser 0.6s ease-in-out; }
            @keyframes pulseUser { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); color: #2c4b60ff; } }

            .cadastro-user-link:hover .cadastro-user-icon { animation: spyBlink 1s infinite; }
            @keyframes spyBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; transform: scale(0.9); } }

            .manutencao-link:hover .manutencao-icon { animation: swingHelmet 0.8s ease-in-out infinite; transform-origin: top center; }
            @keyframes swingHelmet { 0% { transform: rotate(0deg); } 25% { transform: rotate(10deg); } 50% { transform: rotate(0deg); } 75% { transform: rotate(-10deg); } 100% { transform: rotate(0deg); } }
        </style>

        <nav class="navbar navbar-expand-lg" id="nav-bar-all" style="background-color: #2C3E50; height: 60px;">
            <div class="container-fluid">
                <a class="navbar-brand" href="../View/home.html" style="margin-top: 12px;">
                    <img src="../View/img/Logo_text.svg" alt="Bootstrap" style="max-width: 100px; margin-left: 50px;">
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse justify-content-end" id="navbarNavDropdown">
                    <ul class="navbar-nav align-items-center">
                        <li class="nav-item">
                            <a class="nav-link item-navegacao" href="../View/home.html">Home</a>
                        </li>

                        <!-- Renderização condicional dos links de navegação -->
                        ${(isAdmin || isGestor || isUser) ? `
                            <li class="nav-item">
                                <a class="nav-link item-navegacao" href="../View/Solicitacao_de_manutencao.html">Solicitar Manutenção</a>
                            </li>
                        ` : ''}
                        
                        ${(isAdmin || isGestor) ? `
                            <li class="nav-item">
                                <a class="nav-link item-navegacao" href="../View/Gerenciamento_Solicitacao.html">Gerir Solicitações</a>
                            </li>
                        `: ''}

                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Cadastro</a>
                            <ul class="dropdown-menu">
                                <!-- O submenu construído dinamicamente é inserido aqui -->
                                ${cadastroMenu}
                            </ul>
                        </li>

                        ${isAdmin ? `
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Histórico</a>
                            <ul class="dropdown-menu">
                                <li>
                                    <a class="dropdown-item" href="../View/Historico.html">
                                        Histórico de Ordens
                                    </a>
                                </li>
                                                                <li>
                                    <a class="dropdown-item" href="../View/HistoricoAtivo.html">
                                        Histórico de Ativos
                                    </a>
                                </li>
                                                                <li>
                                    <a class="dropdown-item" href="../View/HistoricoSensor.html">
                                        </i> Histórico de Sensores
                                    </a>
                                </li>
                            </ul>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link item-navegacao" href="../View/Dashboards.html">Dashboard</a>
                        </li>



                        ` : ''}

                        <li class="nav-item">
                            <a class="nav-link" href="../View/Perfil.html" title="Meu Perfil">
                                <i class="fa-solid fa-user"></i>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="../View/Notificacao.html" title="Notificações">
                                <i class="fa-solid fa-bell"></i>
                            </a>
                        </li>
                        <!-- botão de Logout -->
                        <li class="nav-item">
                            <a id="logout-button" class="nav-link" href="#" title="Sair">
                                <i class="fa-solid fa-sign-out-alt"></i>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `;

    // 5. Injeta o HTML gerado no container da página.
    const container = document.getElementById("menu-container");
    if (container) {
        container.innerHTML = menuHTML;

        // 6. Adiciona os "ouvintes de evento" para as animações de hover.
        const engrenagemLink = container.querySelector(".engrenagem-link");
        const engrenagemIcon = container.querySelector(".engrenagem-icon");

        if (engrenagemLink && engrenagemIcon) {
            engrenagemLink.addEventListener("mouseenter", () => {
                engrenagemIcon.classList.add("girando");
            });
            engrenagemLink.addEventListener("mouseleave", () => {
                engrenagemIcon.classList.remove("girando");
            });
        }
        
        // --- Lógica de Logout ---
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', (event) => {
                event.preventDefault(); // Impede que o link '#' recarregue a página.
                
                // Limpa os dados do usuário do localStorage.
                localStorage.clear(); // ou localStorage.removeItem('usuarioLogado');
                
                // Redireciona para a página de login.
                window.location.href = '../View/index.html';
            });
        }

    } else {
        console.error("Elemento #menu-container não encontrado na página.");
    }
}