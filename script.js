document.addEventListener('DOMContentLoaded', () => {
  let marcadoresLayer = L.layerGroup();
  let recurrentesLayer = L.layerGroup();
  let heatmapLayer = null;
  let currentViewMode = 'markers';
  let currentData = [];
  let currentRecurrentData = [];

  function obterDataValida(publishedDate) {
    if (!publishedDate) {
      return null;
    }

    if (publishedDate instanceof Date) {
      return Number.isNaN(publishedDate.getTime()) ? null : publishedDate;
    }

    let valorNormalizado = publishedDate;

    if (typeof valorNormalizado === 'string') {
      valorNormalizado = valorNormalizado.trim();
      if (!valorNormalizado) {
        return null;
      }

      if (valorNormalizado.includes(' ')) {
        valorNormalizado = valorNormalizado.replace(' ', 'T');
      }
    }

    const timestamp = Date.parse(valorNormalizado);
    if (Number.isNaN(timestamp)) {
      return null;
    }

    return new Date(timestamp);
  }

  function formatarDataBr(publishedDate) {
    const dataValida = obterDataValida(publishedDate);
    if (!dataValida) {
      return 'Data indisponível';
    }

    return dataValida.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  const map = L.map('mapa').setView([-22.3245, -49.0749], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  marcadoresLayer.addTo(map);

  const iconesPorTema = {
    "Clima": {
      icone: L.divIcon({
        html: '<i class="fa fa-cloud-rain" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-azul',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Crimes": {
      icone: L.divIcon({
        html: '<i class="fa fa-gun" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-laranja',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Drogas e tráfico": {
      icone: L.divIcon({
        html: '<i class="fa fa-user-secret" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-roxo',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Emergências": {
      icone: L.divIcon({
        html: '<i class="fa fa-exclamation-triangle" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-vermelho',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Infraestrutura": {
      icone: L.divIcon({
        html: '<i class="fa fa-building" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-cinza',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Meio ambiente": {
      icone: L.divIcon({
        html: '<i class="fa fa-leaf" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-verde',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Mortes e ferimentos": {
      icone: L.divIcon({
        html: '<i class="fa fa-ambulance" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-preto',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Problemas sociais": {
      icone: L.divIcon({
        html: '<i class="fa fa-users" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-rosa',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Reclamações": {
      icone: L.divIcon({
        html: '<i class="fa fa-volume-up" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-amarelo',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Trânsito": {
      icone: L.divIcon({
        html: '<i class="fa fa-car" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-marrom',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "Saúde": {
      icone: L.divIcon({
        html: '<i class="fa fa-hospital" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-azul-claro',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    },
    "default": {
      icone: L.divIcon({
        html: '<i class="fa fa-map-marker-alt" style="color: white;"></i>',
        className: 'marcador-personalizado marcador-cinza',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    }
  };

  L.Control.Legend = L.Control.extend({
    onAdd: function(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-legend');

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      container.innerHTML = `
      <h3 style="cursor: pointer; user-select: none;">
        Legenda <span style="float: right; transition: transform 0.3s;">▼</span>
      </h3>
      <div class="legend-content">
        <div class="legend-item">
          <div class="legend-icon marcador-azul"><i class="fa fa-cloud-rain"></i></div>
          <span class="legend-text">Clima</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-laranja"><i class="fa fa-gun"></i></div>
          <span class="legend-text">Crimes</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-roxo"><i class="fa fa-user-secret"></i></div>
          <span class="legend-text">Drogas e tráfico</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-vermelho"><i class="fa fa-exclamation-triangle"></i></div>
          <span class="legend-text">Emergências</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-cinza"><i class="fa fa-building"></i></div>
          <span class="legend-text">Infraestrutura</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-verde"><i class="fa fa-leaf"></i></div>
          <span class="legend-text">Meio ambiente</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-preto"><i class="fa fa-ambulance"></i></div>
          <span class="legend-text">Mortes e ferimentos</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-rosa"><i class="fa fa-users"></i></div>
          <span class="legend-text">Problemas sociais</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-amarelo"><i class="fa fa-volume-up"></i></div>
          <span class="legend-text">Reclamações</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-marrom"><i class="fa fa-car"></i></div>
          <span class="legend-text">Trânsito</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon marcador-azul-claro"><i class="fa fa-hospital"></i></div>
          <span class="legend-text">Saúde</span>
        </div>
      </div>
    `;

      const title = container.querySelector('h3');
      title.addEventListener('click', function() {
        container.classList.toggle('collapsed');
        const arrow = this.querySelector('span');
        if (container.classList.contains('collapsed')) {
          arrow.style.transform = 'rotate(-90deg)';
        } else {
          arrow.style.transform = 'rotate(0deg)';
        }
      });

      return container;
    },

    onRemove: function(map) {}
  });

  L.Control.Filter = L.Control.extend({
    onAdd: function(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-filter');

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      container.innerHTML = `
            <h3>Filtros</h3>
      
            <label>Filtrar por Tema:</label>
            <div class="custom-select" id="tema-wrapper">
              <div class="select-selected" data-value="">Selecione um Tema</div>
              <div class="select-items select-hide">
              </div>
            </div>
      
            <label>Filtrar por Ano:</label>
            <div class="custom-select" id="ano-wrapper">
              <div class="select-selected" data-value="">Selecione um Ano</div>
              <div class="select-items select-hide">
              </div>
            </div>
          `;

      return container;
    },
    onRemove: function(map) {}
  });

  L.Control.View = L.Control.extend({
    onAdd: function(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-view');

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      container.innerHTML = `
        <h3>Visualização</h3>
        <div class="view-toggle">
          <button class="view-option active" data-view="markers">
            <i class="fa fa-map-marker-alt"></i>
            Marcadores
          </button>
          <button class="view-option" data-view="heatmap">
            <i class="fa fa-fire"></i>
            Mapa de Calor
          </button>
          <button class="view-option" data-view="recurrent">
            <i class="fa fa-exclamation-triangle"></i>
            Ocorrências Recorrentes
          </button>         
        </div>
      `;

      const viewButtons = container.querySelectorAll('.view-option');
      viewButtons.forEach(button => {
        button.addEventListener('click', function() {
          const newViewMode = this.dataset.view;
          if (newViewMode !== currentViewMode) {
            viewButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            currentViewMode = newViewMode;
            atualizarVisualizacao();
          }
        });
      });

      return container;
    },
    onRemove: function(map) {}
  });

  const viewControl = new L.Control.View({ position: 'topright' }).addTo(map);
  const filterControl = new L.Control.Filter({ position: 'topright' }).addTo(map);
  const legendControl = new L.Control.Legend({ position: 'bottomleft' }).addTo(map);

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

  function criarHeatmap(ocorrencias) {
    console.log('Criando heatmap com', ocorrencias.length, 'ocorrências');

    if (heatmapLayer) {
      map.removeLayer(heatmapLayer);
      heatmapLayer = null;
    }

    if (!ocorrencias || ocorrencias.length === 0) {
      console.log('Nenhuma ocorrência para criar heatmap');
      return;
    }

    const heatData = ocorrencias
      .filter(ocorrencia => ocorrencia.latitude && ocorrencia.longitude)
      .map(ocorrencia => [
        parseFloat(ocorrencia.latitude),
        parseFloat(ocorrencia.longitude),
        1
      ]);

    console.log('Dados do heatmap:', heatData.length, 'pontos válidos');

    if (heatData.length > 0) {
      heatmapLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.2: 'blue',
          0.4: 'cyan',
          0.6: 'yellow',
          0.8: 'orange',
          1.0: 'red'
        }
      });

      heatmapLayer.addTo(map);
      console.log('Heatmap adicionado ao mapa');
    } else {
      console.log('Nenhum ponto válido para o heatmap');
    }
  }

  function atualizarVisualizacao() {
    console.log('Atualizando visualização para:', currentViewMode, 'com', currentData.length, 'dados');

    marcadoresLayer.clearLayers();
    recurrentesLayer.clearLayers();
    if (heatmapLayer) {
      map.removeLayer(heatmapLayer);
      heatmapLayer = null;
    }
    if (map.hasLayer(recurrentesLayer)) {
      map.removeLayer(recurrentesLayer);
    }

    if (currentViewMode === 'markers') {
      if (!map.hasLayer(marcadoresLayer)) {
        marcadoresLayer.addTo(map);
      }
      exibirMarcadores(currentData);

    } else if (currentViewMode === 'heatmap') {
      if (map.hasLayer(marcadoresLayer)) {
        map.removeLayer(marcadoresLayer);
      }
      criarHeatmap(currentData);

    } else if (currentViewMode === 'recurrent') {
      if (map.hasLayer(marcadoresLayer)) {
        map.removeLayer(marcadoresLayer);
      }
      carregarOcorrenciasRecorrentes();
    }
  }

  function exibirMarcadores(ocorrencias) {
    marcadoresLayer.clearLayers();

    ocorrencias.forEach(ocorrencia => {
      const popupContent = `
        <h4 style='margin-bottom:5px; font-size:16px;'>${ocorrencia.title}</h4>
        <hr style='margin: 2px;'>
        <b>Tema:</b> ${ocorrencia.tema || 'N/A'}<br>
        <b>Local:</b> ${ocorrencia.address || 'N/A'}<br>
        <b>Data:</b> ${formatarDataBr(ocorrencia.published_date)}<br>
        <b>Fonte:</b> ${ocorrencia.site || 'N/A'}<br>
        <a href='${ocorrencia.link}' target='_blank'>Ler notícia completa</a>
      `;

      const iconeConfig = iconesPorTema[ocorrencia.tema] || iconesPorTema.default;

      L.marker([ocorrencia.latitude, ocorrencia.longitude], { icon: iconeConfig.icone })
          .bindPopup(popupContent)
          .addTo(marcadoresLayer);
    });
  }

  function exibirRecorrentes(ocorrencias) {
    recurrentesLayer.clearLayers();

    ocorrencias.forEach(ocorrencia => {
      const popupContent = `
        <h4 style='margin-bottom:5px; font-size:16px;'>Ponto de ocorrência recorrente</h4>
        <hr style='margin: 2px;'>
        <b>Endereço:</b> ${ocorrencia.endereco_comum || 'N/A'}<br>
        <b>Tema:</b> ${ocorrencia.tema || 'N/A'}<br>
        <b>Nº de Ocorrências:</b> ${ocorrencia.contagem || 0}
      `;

      const iconeConfig = iconesPorTema[ocorrencia.tema] || iconesPorTema.default;

      L.marker([ocorrencia.latitude, ocorrencia.longitude], { icon: iconeConfig.icone })
          .bindPopup(popupContent)
          .addTo(recurrentesLayer);
    });

    if (!map.hasLayer(recurrentesLayer)) {
      recurrentesLayer.addTo(map);
    }
  }

  async function carregarOcorrenciasRecorrentes() {
    const temaSelect = document.querySelector('#tema-wrapper .select-selected');
    const anoSelect = document.querySelector('#ano-wrapper .select-selected');
    const tema = temaSelect.dataset.value;
    const ano = anoSelect.dataset.value;

    try {
      const url = `http://127.0.0.1:5001/api/ocorrencias-recorrentes?tema=${tema}&ano=${ano}`;
      console.log('Carregando dados recorrentes de:', url);
      const response = await fetch(url);
      const ocorrenciasRecorrentes = await response.json();

      console.log('Dados recorrentes recebidos:', ocorrenciasRecorrentes.length, 'pontos');
      currentRecurrentData = ocorrenciasRecorrentes;

      exibirRecorrentes(currentRecurrentData);

    } catch (error) {
      console.error('Erro ao buscar ou processar as ocorrências recorrentes:', error);
    }
  }

  async function carregarOcorrencias() {
    const temaSelect = document.querySelector('#tema-wrapper .select-selected');
    const anoSelect = document.querySelector('#ano-wrapper .select-selected');
    const tema = temaSelect.dataset.value;
    const ano = anoSelect.dataset.value;

    try {
      const url = `http://127.0.0.1:5001/api/ocorrencias?tema=${tema}&ano=${ano}`;
      console.log('Carregando dados de:', url);
      const response = await fetch(url);
      const ocorrencias = await response.json();

      console.log('Dados recebidos:', ocorrencias.length, 'ocorrências');
      currentData = ocorrencias;

      if (currentViewMode === 'recurrent') {
        await carregarOcorrenciasRecorrentes();
      } else {
        atualizarVisualizacao();
      }

    } catch (error) {
      console.error('Erro ao buscar ou processar as ocorrências:', error);
    }
  }

  function popularFiltros(ocorrencias) {
    const temas = new Set();
    const anos = new Set();

    ocorrencias.forEach(ocorrencia => {
      if (ocorrencia.tema) temas.add(ocorrencia.tema);
      const dataValida = obterDataValida(ocorrencia.published_date);
      if (dataValida) anos.add(dataValida.getUTCFullYear());
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
      const response = await fetch('http://127.0.0.1:5001/api/ocorrencias');
      const todasOcorrencias = await response.json();

      console.log('Dados iniciais carregados:', todasOcorrencias.length, 'ocorrências');
      currentData = todasOcorrencias;

      popularFiltros(todasOcorrencias);

      atualizarVisualizacao();
    } catch (error) {
      console.error("Erro na inicialização da página:", error);
      alert("Falha ao carregar os dados iniciais.");
    }
  }

  init();
});
