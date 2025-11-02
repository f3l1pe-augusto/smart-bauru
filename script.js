document.addEventListener('DOMContentLoaded', () => {
  let marcadoresLayer = L.layerGroup();
  let recurrentesLayer = L.layerGroup();
  let heatmapLayer = null;
  let currentViewMode = 'markers';
  let currentData = [];
  let currentRecurrentData = [];
  let dashboardCharts = {};
  const selectedTemas = new Set();
  const selectedAnos = new Set();
  const selectedBairros = new Set();
  const dashboardPanel = document.getElementById('dashboard-panel');
  const dashboardFeedback = dashboardPanel ? dashboardPanel.querySelector('.dashboard-feedback') : null;
  const API_BASE_URL = (() => {
    const meta = document.querySelector('meta[name="api-base-url"]');
    const candidates = [
      window.APP_API_BASE_URL,
      window.API_BASE_URL,
      window.__API_BASE_URL__,
      meta && meta.content,
      window.appConfig && window.appConfig.apiBaseUrl
    ].filter(value => typeof value === 'string' && value.trim().length > 0);

    if (candidates.length > 0) {
      return candidates[0].replace(/\/+$/, '');
    }

    const origin = (typeof window.location !== 'undefined' && window.location.origin !== 'null')
      ? window.location.origin
      : '';
    return origin.replace(/\/+$/, '');
  })();

  function construirApiUrl(path = '') {
    if (typeof path !== 'string' || path.trim() === '') {
      return API_BASE_URL;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const sanitizedBase = API_BASE_URL.replace(/\/+$/, '');
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${sanitizedBase}${sanitizedPath}`;
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
          Legenda <span style="float: right; transition: transform 0.3s; transform: rotate(-90deg);">▼</span>
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

      container.classList.add('collapsed');

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
              <div class="select-selected" data-value="">Selecione Temas</div>
              <div class="select-items select-hide">
              </div>
            </div>

            <label>Filtrar por Ano:</label>
            <div class="custom-select" id="ano-wrapper">
              <div class="select-selected" data-value="">Selecione Anos</div>
              <div class="select-items select-hide">
              </div>
            </div>
            <label>Filtrar por Bairro:</label>
            <div class="custom-select" id="bairro-wrapper">
              <div class="select-selected" data-value="">Selecione Bairros</div>
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
            Pontos Recorrentes
          </button>
          <button class="view-option" data-view="dashboard">
            <i class="fa fa-chart-line"></i>
            Dashboard
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

    document.querySelectorAll('.select-items').forEach(items => {
      items.addEventListener('click', function(e) {
        e.stopPropagation();
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

  function updateSelectPlaceholder(wrapperId, selectedSet, defaultText) {
    const selected = document.querySelector(`#${wrapperId} .select-selected`);
    if (!selected) {
      return;
    }

    if (selectedSet.size === 0) {
      selected.textContent = defaultText;
      selected.dataset.value = '';
      return;
    }

    const values = Array.from(selectedSet).sort();
    selected.dataset.value = values.join(',');

    if (values.length <= 2) {
      selected.textContent = values.join(', ');
    } else {
      selected.textContent = `${values.length} selecionados`;
    }
  }

  function construirParametrosFiltro() {
    const params = new URLSearchParams();
    selectedTemas.forEach(tema => params.append('tema', tema));
    selectedAnos.forEach(ano => params.append('ano', ano));
    selectedBairros.forEach(bairro => params.append('bairro', bairro));
    return params;
  }

  function construirUrlComFiltros(endpoint) {
    const baseUrl = construirApiUrl(endpoint);
    const params = construirParametrosFiltro();
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
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

    renderDashboard();

    marcadoresLayer.clearLayers();
    recurrentesLayer.clearLayers();
    if (heatmapLayer) {
      map.removeLayer(heatmapLayer);
      heatmapLayer = null;
    }
    if (map.hasLayer(recurrentesLayer)) {
      map.removeLayer(recurrentesLayer);
    }

    if (currentViewMode === 'dashboard') {
      if (map.hasLayer(marcadoresLayer)) {
        map.removeLayer(marcadoresLayer);
      }
      carregarEstatisticasDashboard();
      return;

    } else if (currentViewMode === 'markers') {
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

  function renderDashboard() {
    if (!dashboardPanel) {
      return;
    }

    if (currentViewMode === 'dashboard') {
      dashboardPanel.style.display = 'block';
      if (dashboardFeedback) {
        dashboardFeedback.textContent = 'Carregando estatísticas...';
      }
    } else {
      dashboardPanel.style.display = 'none';
      if (dashboardFeedback) {
        dashboardFeedback.textContent = '';
      }
    }

    setTimeout(() => map.invalidateSize(), 200);
  }

  function normalizarColecao(dados, chavesRotulo, chavesValor, rotuloPadrao = 'N/A') {
    if (!dados) {
      return { labels: [], dados: [] };
    }

    const obterValor = (item, chaves, padrao) => {
      for (const chave of chaves) {
        if (!item || item[chave] === undefined || item[chave] === null) {
          continue;
        }

        const valor = item[chave];
        if (typeof valor === 'string') {
          const valorAjustado = valor.trim();
          if (valorAjustado !== '') {
            return valorAjustado;
          }
        } else {
          return valor;
        }
      }
      return padrao;
    };

    const chavesRotuloArray = Array.isArray(chavesRotulo) ? chavesRotulo : [chavesRotulo];
    const chavesValorArray = Array.isArray(chavesValor) ? chavesValor : [chavesValor];

    if (Array.isArray(dados)) {
      return {
        labels: dados.map(item => String(obterValor(item, chavesRotuloArray, rotuloPadrao))),
        dados: dados.map(item => Number(obterValor(item, chavesValorArray, 0)) || 0)
      };
    }

    if (typeof dados === 'object') {
      const labels = Object.keys(dados);
      return {
        labels,
        dados: labels.map(label => {
          const valor = dados[label];
          if (typeof valor === 'object' && valor !== null) {
            return Number(obterValor(valor, chavesValorArray, 0)) || 0;
          }
          return Number(valor ?? 0) || 0;
        })
      };
    }

    return { labels: [], dados: [] };
  }

  function atualizarGrafico(chartId, chartType, labels, data, datasetConfig = {}, extraOptions = {}) {
    const canvas = document.getElementById(chartId);
    if (!canvas || typeof Chart === 'undefined') {
      return;
    }

    const defaultDataset = {
      label: 'Ocorrências',
      data,
      backgroundColor: chartType === 'line'
        ? 'rgba(54, 162, 235, 0.2)'
        : [
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 99, 132, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)'
          ],
      borderColor: chartType === 'line'
        ? 'rgba(54, 162, 235, 1)'
        : [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
      borderWidth: 2,
      fill: chartType !== 'line',
      tension: 0.3
    };

    const dataset = { ...defaultDataset, ...datasetConfig };

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    };

    const options = { ...defaultOptions, ...extraOptions };

    if (dashboardCharts[chartId]) {
      dashboardCharts[chartId].data.labels = labels;
      dashboardCharts[chartId].data.datasets[0].data = data;
      if (dataset.backgroundColor) {
        dashboardCharts[chartId].data.datasets[0].backgroundColor = dataset.backgroundColor;
      }
      if (dataset.borderColor) {
        dashboardCharts[chartId].data.datasets[0].borderColor = dataset.borderColor;
      }
      dashboardCharts[chartId].data.datasets[0].fill = dataset.fill;
      dashboardCharts[chartId].data.datasets[0].tension = dataset.tension;
      dashboardCharts[chartId].update();
    } else {
      dashboardCharts[chartId] = new Chart(canvas.getContext('2d'), {
        type: chartType,
        data: {
          labels,
          datasets: [dataset]
        },
        options
      });
    }
  }

  async function carregarEstatisticasDashboard() {
    if (!dashboardPanel) {
      return;
    }

    if (dashboardFeedback) {
      dashboardFeedback.textContent = 'Carregando estatísticas...';
    }

    try {
      const url = construirUrlComFiltros('/api/dashboard');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Falha ao carregar estatísticas: ${response.status}`);
      }

      const dadosDashboard = await response.json();
      const temasRaw = dadosDashboard.temas || dadosDashboard.porTema || dadosDashboard.por_tema;
      const temporalRaw = dadosDashboard.temporal || dadosDashboard.serieTemporal || dadosDashboard.serie_temporal || dadosDashboard.serie_mensal;
      const enderecosRaw = dadosDashboard.principais_enderecos || dadosDashboard.enderecos || dadosDashboard.topEnderecos;

      const { labels: temaLabels, dados: temaDados } = normalizarColecao(
        temasRaw,
        ['tema', 'label', 'nome'],
        ['contagem', 'total', 'quantidade', 'count'],
        'Não informado'
      );
      const { labels: temporalLabels, dados: temporalDados } = normalizarColecao(
        temporalRaw,
        ['periodo', 'mes', 'data', 'label'],
        ['contagem', 'total', 'quantidade', 'count']
      );
      const { labels: enderecosLabels, dados: enderecosDados } = normalizarColecao(
        enderecosRaw,
        ['endereco', 'label', 'local'],
        ['contagem', 'total', 'quantidade', 'count'],
        'Endereço não informado'
      );

      atualizarGrafico('chart-temas', 'bar', temaLabels, temaDados);
      atualizarGrafico('chart-temporal', 'line', temporalLabels, temporalDados, { fill: false });
      atualizarGrafico(
        'chart-enderecos',
        'bar',
        enderecosLabels,
        enderecosDados,
        {
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
          borderColor: 'rgba(255, 206, 86, 1)'
        },
        { indexAxis: 'y' }
      );

      if (dashboardFeedback) {
        if (temaLabels.length === 0 && temporalLabels.length === 0 && enderecosLabels.length === 0) {
          dashboardFeedback.textContent = 'Nenhuma estatística disponível no momento.';
        } else {
          dashboardFeedback.textContent = '';
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas do dashboard:', error);
      if (dashboardFeedback) {
        dashboardFeedback.textContent = 'Não foi possível carregar as estatísticas do dashboard.';
      }
    }
  }

  function exibirMarcadores(ocorrencias) {
    marcadoresLayer.clearLayers();

    ocorrencias.forEach(ocorrencia => {
      const popupContent = `
        <h4 style='margin-bottom:5px; font-size:16px;'>${ocorrencia.title}</h4>
        <hr style='margin: 2px;'>
        <b>Tema:</b> ${ocorrencia.tema || 'N/A'}<br>
        <b>Bairro:</b> ${ocorrencia.bairro || 'N/A'}<br>
        <b>Local:</b> ${ocorrencia.address || 'N/A'}<br>
        <b>Data:</b> ${new Date(ocorrencia.published_date).toLocaleDateString('pt-BR')}<br>
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
    try {
      const url = construirUrlComFiltros('/api/ocorrencias-recorrentes');
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
    try {
      const url = construirUrlComFiltros('/api/ocorrencias');
      console.log('Carregando dados de:', url);
      const response = await fetch(url);
      const ocorrencias = await response.json();

      console.log('Dados recebidos:', ocorrencias.length, 'ocorrências');
      currentData = ocorrencias;

      if (currentViewMode === 'recurrent') {
        await carregarOcorrenciasRecorrentes();
      } else if (currentViewMode === 'dashboard') {
        await carregarEstatisticasDashboard();
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
    const bairros = new Set();

    ocorrencias.forEach(ocorrencia => {
      if (ocorrencia.tema) temas.add(ocorrencia.tema);
      if (ocorrencia.published_date) anos.add(new Date(ocorrencia.published_date).getFullYear());
      if (ocorrencia.bairro) {
        const bairro = String(ocorrencia.bairro).trim();
        if (bairro) {
          bairros.add(bairro);
        }
      }
    });

    const temaItems = document.querySelector('#tema-wrapper .select-items');
    const anoItems = document.querySelector('#ano-wrapper .select-items');
    const bairroItems = document.querySelector('#bairro-wrapper .select-items');

    if (temaItems) {
      temaItems.innerHTML = '';
    }
    if (anoItems) {
      anoItems.innerHTML = '';
    }
    if (bairroItems) {
      bairroItems.innerHTML = '';
    }

    Array.from(temas).sort().forEach(tema => {
      const div = document.createElement('div');
      div.classList.add('select-multi-item');

      const label = document.createElement('label');
      label.classList.add('select-multi-option');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = tema;
      checkbox.checked = selectedTemas.has(tema);

      checkbox.addEventListener('change', function(e) {
        e.stopPropagation();
        if (this.checked) {
          selectedTemas.add(this.value);
        } else {
          selectedTemas.delete(this.value);
        }
        div.classList.toggle('selected', this.checked);
        updateSelectPlaceholder('tema-wrapper', selectedTemas, 'Selecione Temas');
        carregarOcorrencias();
      });

      label.appendChild(checkbox);
      const span = document.createElement('span');
      span.textContent = tema;
      label.appendChild(span);

      div.appendChild(label);
      div.classList.toggle('selected', checkbox.checked);
      div.addEventListener('click', function(e) {
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });

      temaItems.appendChild(div);
    });

    Array.from(anos).sort((a, b) => b - a).forEach(ano => {
      const div = document.createElement('div');
      div.classList.add('select-multi-item');

      const label = document.createElement('label');
      label.classList.add('select-multi-option');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = String(ano);
      checkbox.checked = selectedAnos.has(String(ano));

      checkbox.addEventListener('change', function(e) {
        e.stopPropagation();
        if (this.checked) {
          selectedAnos.add(this.value);
        } else {
          selectedAnos.delete(this.value);
        }
        div.classList.toggle('selected', this.checked);
        updateSelectPlaceholder('ano-wrapper', selectedAnos, 'Selecione Anos');
        carregarOcorrencias();
      });

      label.appendChild(checkbox);
      const span = document.createElement('span');
      span.textContent = ano;
      label.appendChild(span);

      div.appendChild(label);
      div.classList.toggle('selected', checkbox.checked);
      div.addEventListener('click', function(e) {
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });

      anoItems.appendChild(div);
    });

    Array.from(bairros).sort().forEach(bairro => {
      const div = document.createElement('div');
      div.classList.add('select-multi-item');

      const label = document.createElement('label');
      label.classList.add('select-multi-option');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = bairro;
      checkbox.checked = selectedBairros.has(bairro);

      checkbox.addEventListener('change', function(e) {
        e.stopPropagation();
        if (this.checked) {
          selectedBairros.add(this.value);
        } else {
          selectedBairros.delete(this.value);
        }
        div.classList.toggle('selected', this.checked);
        updateSelectPlaceholder('bairro-wrapper', selectedBairros, 'Selecione Bairros');
        carregarOcorrencias();
      });

      label.appendChild(checkbox);
      const span = document.createElement('span');
      span.textContent = bairro;
      label.appendChild(span);

      div.appendChild(label);
      div.classList.toggle('selected', checkbox.checked);
      div.addEventListener('click', function(e) {
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });

      if (bairroItems) {
        bairroItems.appendChild(div);
      }
    });

    initCustomSelects();
    updateSelectPlaceholder('tema-wrapper', selectedTemas, 'Selecione Temas');
    updateSelectPlaceholder('ano-wrapper', selectedAnos, 'Selecione Anos');
    updateSelectPlaceholder('bairro-wrapper', selectedBairros, 'Selecione Bairros');
  }

  async function init() {
    try {
      const response = await fetch(construirApiUrl('/api/ocorrencias'));
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
