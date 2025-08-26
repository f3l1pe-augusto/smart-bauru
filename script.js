document.addEventListener('DOMContentLoaded', () => {
  let marcadoresLayer = L.layerGroup();
  const map = L.map('mapa').setView([-22.3245, -49.0749], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  marcadoresLayer.addTo(map);

  L.Control.Filter = L.Control.extend({
    onAdd: function(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-filter');

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      container.innerHTML = `
            <h3>Filtros</h3>
    
            <label>Filtrar por Tema:</label>
            <div class="custom-select" id="tema-wrapper">
              <div class="select-selected" data-value="todos">Todos os Temas</div>
              <div class="select-items select-hide">
                <div data-value="todos">Todos os Temas</div>
              </div>
            </div>
    
            <label>Filtrar por Ano:</label>
            <div class="custom-select" id="ano-wrapper">
              <div class="select-selected" data-value="todos">Todos os Anos</div>
              <div class="select-items select-hide">
                <div data-value="todos">Todos os Anos</div>
              </div>
            </div>
          `;

      return container;
    },
    onRemove: function(map) {}
  });

  const filterControl = new L.Control.Filter({ position: 'topright' }).addTo(map);

  // Inicializa os selects personalizados
  function initCustomSelects() {
    document.querySelectorAll('.select-selected').forEach(selectBtn => {
      selectBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeAllSelects(this);
        this.nextElementSibling.classList.toggle('select-hide');
      });
    });

    document.addEventListener('click', function() {
      closeAllSelects();
    });
  }

  function closeAllSelects(exceptThis) {
    document.querySelectorAll('.select-items').forEach(items => {
      if (items.previousElementSibling !== exceptThis) {
        items.classList.add('select-hide');
      }
    });
  }

  async function carregarOcorrencias() {
    const temaSelect = document.querySelector('#tema-wrapper .select-selected');
    const anoSelect = document.querySelector('#ano-wrapper .select-selected');
    const tema = temaSelect.dataset.value;
    const ano = anoSelect.dataset.value;

    marcadoresLayer.clearLayers();

    try {
      const url = `http://127.0.0.1:5001/api/ocorrencias?tema=${tema}&ano=${ano}`;
      const response = await fetch(url);
      const ocorrencias = await response.json();

      ocorrencias.forEach(ocorrencia => {
        const popupContent = `
              <h4 style='margin-bottom:5px; font-size:16px;'>${ocorrencia.title}</h4>
              <hr style='margin: 2px;'>
              <b>Data:</b> ${new Date(ocorrencia.published_date).toLocaleDateString('pt-BR')}<br>
              <b>Local:</b> ${ocorrencia.address || 'N/A'}<br>
              <b>Fonte:</b> ${ocorrencia.site || 'N/A'}<br>
              <a href='${ocorrencia.link}' target='_blank'>Ler notícia completa</a>
            `;
        L.marker([ocorrencia.latitude, ocorrencia.longitude])
            .bindPopup(popupContent)
            .addTo(marcadoresLayer);
      });
    } catch (error) {
      console.error('Erro ao buscar ou processar as ocorrências:', error);
    }
  }

  function popularFiltros(ocorrencias) {
    const temas = new Set();
    const anos = new Set();

    ocorrencias.forEach(ocorrencia => {
      if (ocorrencia.tema) temas.add(ocorrencia.tema);
      if (ocorrencia.published_date) anos.add(new Date(ocorrencia.published_date).getFullYear());
    });

    const temaItems = document.querySelector('#tema-wrapper .select-items');
    const anoItems = document.querySelector('#ano-wrapper .select-items');

    Array.from(temas).sort().forEach(tema => {
      const div = document.createElement('div');
      div.textContent = tema;
      div.dataset.value = tema;
      div.addEventListener('click', function(e) {
        e.stopPropagation();
        const selected = this.closest('.custom-select').querySelector('.select-selected');
        selected.textContent = this.textContent;
        selected.dataset.value = this.dataset.value;
        this.closest('.select-items').classList.add('select-hide');
        carregarOcorrencias();
      });
      temaItems.appendChild(div);
    });

    Array.from(anos).sort((a, b) => b - a).forEach(ano => {
      const div = document.createElement('div');
      div.textContent = ano;
      div.dataset.value = ano;
      div.addEventListener('click', function(e) {
        e.stopPropagation();
        const selected = this.closest('.custom-select').querySelector('.select-selected');
        selected.textContent = this.textContent;
        selected.dataset.value = this.dataset.value;
        this.closest('.select-items').classList.add('select-hide');
        carregarOcorrencias();
      });
      anoItems.appendChild(div);
    });

    initCustomSelects();
  }

  async function init() {
    try {
      const response = await fetch('http://127.0.0.1:5001/api/ocorrencias?tema=todos&ano=todos');
      const todasOcorrencias = await response.json();

      popularFiltros(todasOcorrencias);
      await carregarOcorrencias();
    } catch (error) {
      console.error("Erro na inicialização da página:", error);
      alert("Falha ao carregar os dados iniciais.");
    }
  }

  init();
});
