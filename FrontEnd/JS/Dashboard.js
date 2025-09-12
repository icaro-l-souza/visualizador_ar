// === Criação dos gráficos ===
const chartTemp = new Chart(document.getElementById("graficoTemp"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Temperatura (°C)", data: [], borderColor: "#f87171", backgroundColor: "#fca5a5", color: "#fff", tension: 0.3 }] },
     options: {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: "#ffffff" // Cor da legenda
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo X
                }
            },
            y: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo Y
                }
            }
        }
    }
});

const chartUmid = new Chart(document.getElementById("graficoUmid"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Umidade (%)", data: [], borderColor: "#60a5fa", backgroundColor: "#93c5fd", tension: 0.3 }] },
     options: {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: "#ffffff" // Cor da legenda
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo X
                }
            },
            y: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo Y
                }
            }
        }
    }
});

const chartPir = new Chart(document.getElementById("graficoPir"), {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Detecção", data: [], borderColor: "#34d399", backgroundColor: "#6ee7b7" }] },
     options: {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: "#ffffff" // Cor da legenda
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo X
                }
            },
            y: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo Y
                }
            }
        }
    }
});

const chartEstoque = new Chart(document.getElementById("graficoEstoque"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Estoque", data: [], borderColor: "#a78bfa", backgroundColor: "#c4b5fd", tension: 0.3 }] },
    options: {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: "#ffffff" // Cor da legenda
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo X
                }
            },
            y: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo Y
                }
            }
        }
    }
});

const chartVibracao = new Chart(document.getElementById("graficoVibracao"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Vibração (microns)", data: [], borderColor: "#fbbf24", backgroundColor: "#fde68a", tension: 0.3 }] },
     options: {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: "#ffffff" // Cor da legenda
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo X
                }
            },
            y: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo Y
                }
            }
        }
    }
});

const chartLuminosidade = new Chart(document.getElementById("graficoLuminosidade"), {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: "Luminosidade (lx)",
            data: [],
            borderColor: "#eb66b8ff",
            backgroundColor: "#ee7dbfff",
            tension: 0.3
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: "#ffffff" // Cor da legenda
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo X
                }
            },
            y: {
                ticks: {
                    color: "#ffffff" // Cor dos rótulos do eixo Y
                }
            }
        }
    }
});

Chart.defaults.color = '#ffffff';  // Define texto padrão para todos gráficos
Chart.defaults.plugins.legend.labels.color = '#ffffff'; // Define cor da legenda
Chart.defaults.color = "#ffffff"; // Define a cor branca para todos os textos
Chart.defaults.scales = {
    x: { ticks: { color: '#ffffff' }, grid: { color: 'rgba(255, 237, 237, 1)' } },
    y: { ticks: { color: '#ffffff' }, grid: { color: 'rgba(242, 240, 240, 1)' } }
};


// === Função utilitária para formatar hora ===
function formatarHora(dataHora) {
    const data = new Date(dataHora);
    return isNaN(data) ? "" : data.toLocaleTimeString();
}

// === Função principal para carregar dados ===
async function carregarDados() {
    try {
        const resposta = await fetch("http://localhost:5000/dados");
        const dados = await resposta.json();

        console.log("📊 Dados recebidos:", dados);

        // --- Temperatura ---
        const Temperatura = dados.filter(d => d.Topico === "Cypher/Temperatura" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("temp").textContent = Temperatura.at(-1)?.Valor + " °C" || "-- °C";
        document.getElementById("mediaTemp").textContent = Temperatura.length ?
            (Temperatura.reduce((s, v) => s + parseFloat(v.Valor), 0) / Temperatura.length).toFixed(1) + " °C" : "-- °C";
        chartTemp.data.labels = Temperatura.map(d => formatarHora(d.Data_Hora));
        chartTemp.data.datasets[0].data = Temperatura.map(d => parseFloat(d.Valor));
        chartTemp.update();

        // --- Umidade ---
        const Umidade = dados.filter(d => d.Topico === "Cypher/Umidade" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("umid").textContent = Umidade.at(-1)?.Valor + " %" || "-- %";
        document.getElementById("mediaUmid").textContent = Umidade.length ?
            (Umidade.reduce((s, v) => s + parseFloat(v.Valor), 0) / Umidade.length).toFixed(1) + " %" : "-- %";
        chartUmid.data.labels = Umidade.map(d => formatarHora(d.Data_Hora));
        chartUmid.data.datasets[0].data = Umidade.map(d => parseFloat(d.Valor));
        chartUmid.update();

        // --- PIR ---
        const PIR = dados.filter(d => d.Topico === "Cypher/Presenca").slice(-15);
        document.getElementById("pir_status").textContent = PIR.at(-1)?.Valor === "1" ? "Detectado" : "Sem movimento";
        document.getElementById("pir_total").textContent = PIR.filter(d => d.Valor === "1").length;
        chartPir.data.labels = PIR.map(d => formatarHora(d.Data_Hora));
        chartPir.data.datasets[0].data = PIR.map(d => (d.Valor === "1" ? 1 : 0));
        chartPir.update();

        // --- Estoque ---
        const Estoque = dados.filter(d => d.Topico === "Cypher/Estoque" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("estoque_Detc").textContent = Estoque.at(-1)?.Valor || "--";
        chartEstoque.data.labels = Estoque.map(d => formatarHora(d.Data_Hora));
        chartEstoque.data.datasets[0].data = Estoque.map(d => parseFloat(d.Valor));
        chartEstoque.update();

        // --- Vibração ---
        const Vibracao = dados.filter(d => d.Topico === "Cypher/Vibracao" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("vibracao").textContent = Vibracao.length ?
            (Vibracao.reduce((s, v) => s + parseFloat(v.Valor), 0) / Vibracao.length).toFixed(1) + " microns" : "-- microns";
        chartVibracao.data.labels = Vibracao.map(d => formatarHora(d.Data_Hora));
        chartVibracao.data.datasets[0].data = Vibracao.map(d => parseFloat(d.Valor));
        chartVibracao.update();

        // --- Luminosidade ---
        const Luminosidade = dados.filter(d => d.Topico === "Cypher/Luminosidade" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("luminosidade").textContent = Luminosidade.length ?
            (Luminosidade.reduce((s, v) => s + parseFloat(v.Valor), 0) / Luminosidade.length).toFixed(1) + " lx" : "-- lx";
        chartLuminosidade.data.labels = Luminosidade.map(d => formatarHora(d.Data_Hora));
        chartLuminosidade.data.datasets[0].data = Luminosidade.map(d => parseFloat(d.Valor));
        chartLuminosidade.update();


    } catch (erro) {
        console.error("❌ Erro ao carregar dados:", erro);
    }
}





// Atualiza a cada 5 segundos
setInterval(carregarDados, 5000);
carregarDados();


document.addEventListener('DOMContentLoaded', () => {

    // --- UPGRADE 4: Configuração das partículas (Adaptado para Tema Claro) ---
    particlesJS('particles-js', { // O primeiro argumento é o ID do seu div
        "particles": {
            // --- Aparência das Partículas ---
            "number": { "value": 50, "density": { "enable": true, "value_area": 800 } }, // Quantidade de partículas
            "color": { "value": "#0d6efd" }, // Cor das partículas (azul)
            "shape": { "type": "circle" }, // Formato
            "opacity": { "value": 0.7, "random": true }, // Opacidade
            "size": { "value": 3, "random": true }, // Tamanho

            // --- Aparência das Linhas ---
            "line_linked": {
                "enable": true, // Habilita as linhas que conectam as partículas
                "distance": 150, // Distância para criar uma linha
                "color": "#0d6efd", // Cor da linha
                "opacity": 0.2,
                "width": 1
            },

            // --- Comportamento e Movimento ---
            "move": {
                "enable": true,
                "speed": 1, // Velocidade do movimento
                "direction": "none",
                "out_mode": "out" // O que acontece quando saem da tela
            }
        },
        // --- Interatividade com o Mouse ---
        "interactivity": {
            "detect_on": "canvas",
            "events": { "onhover": { "enable": true, "mode": "grab" } }, // Efeito ao passar o mouse
            "modes": {
                "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } }
            }
        },
        "retina_detect": true
    });

});