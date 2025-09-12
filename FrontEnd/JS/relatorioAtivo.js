document.addEventListener("DOMContentLoaded", () => {
  fetchHistorico();
});

function fetchHistorico() {
  fetch("/historico")
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById("historico-table-body");
      tbody.innerHTML = "";

      data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.id_Historico_Ativo}</td>
          <td>${row.id_Ativo}</td>
          <td>${new Date(row.Data_Evento).toLocaleDateString('pt-BR')}</td>
          <td>${row.Status_Anterior}</td>
          <td>${row.Status_Novo}</td>
          <td>${row.Localizacao_Anterior}</td>
          <td>${row.Localizacao_Nova}</td>
          <td>${row.Observacao || ''}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => console.error("Erro ao buscar histórico:", err));
}
