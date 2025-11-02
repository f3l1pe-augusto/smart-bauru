from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import ast
import re

app = Flask(__name__)
CORS(app)


def normalizar_endereco(endereco: str) -> str:
  if not isinstance(endereco, str):
    return ''
  primeiro_segmento = endereco.split(',')[0]
  primeiro_segmento = primeiro_segmento.split(' - ')[0]
  return primeiro_segmento.strip()


def extrair_bairros(address: str):
  if not isinstance(address, str):
    return []
  partes = re.split(r',|\s-\s', address)
  bairros = []
  for parte in partes:
    bairro = normalizar_endereco(parte)
    if bairro:
      bairros.append(bairro)
  return bairros


def normalizar_parametros_multivalores(parametros):
  valores_normalizados = []
  for valor in parametros:
    if not valor:
      continue
    partes = [normalizar_endereco(parte) for parte in str(valor).split(',')]
    for parte in partes:
      parte = parte.strip()
      if parte:
        valores_normalizados.append(parte)

  valores_unicos = []
  vistos = set()
  for valor in valores_normalizados:
    if valor in vistos:
      continue
    vistos.add(valor)
    valores_unicos.append(valor)
  return valores_unicos


def carregar_e_processar_dados():
  print("Iniciando o carregamento dos dados...")
  try:
    df = pd.read_csv('data/news.csv')
    print(f"Arquivo CSV carregado com sucesso. {len(df)} linhas encontradas.")
  except FileNotFoundError:
    print("ERRO CRÍTICO: O arquivo 'data/news.csv' não foi encontrado.")
    return pd.DataFrame()

  theme_keywords = {
    "Meio ambiente": ["rio batalha", "cobra", "animal", "animais", "maus-tratos", "maus tratos", "picad", "escorpiao", "poluido", "poluida", "mato", "poluicao", "poeira", "fumaca", "fogo", "incendio", "queima", "peconhento"],
    "Clima": ["chuva", "chove", "granizo", "temporal", "tempestade", "ventania", "desastre", "erosao", "queda", "desaba", "desabou", "atol", "calor", "frio", "submers", "derrub", "cair", "caiu"],
    "Crimes": ["agredid", "tortura", "agredir", "agressao", "esfaquead", "arma", "tiro", "bala perdida", "disparo", "atentado", "facao", "facada", "violen", "crime", "sequestr", "esquartejad", "choque", "criminos", "pixacao", "vitima", "roub", "furt", "assalt", "latrocionio", "vandalismo", "vandalo", "quadrilha", "arromb", "invad", "desviado", "golp", "bandid", "celular", "faccao", "fuga", "penitenciaria", "operac", "flagr", "prende", "policia", "bombeir", "blitz", "prisao", "mandado", "delegacia", "seguranca", "camera", "captura", "capturad", "investiga", "foragid", "cadeia", "presidiari", "detent", "pris", "detid", "abordagem", "denunc", "preso", "presa", "suspeit", "motim", "bater", "estupr", "assed", "importuna", "abus", "pedofil", "medida protetiva"],
    "Drogas e tráfico": ["entorpecente", "droga", "maconha", "cocaina", "crack", "trafic", "apreen", "contrab"],
    "Emergências": ["urgen", "risco", "alerta", "emergencia", "socorr", "grave"],
    "Infraestrutura": ["interr", "vazamento", "prefeit", "abastecimento", "rodizio", "cratera", "enchente", "enxurrada", "alaga", "luz", "buraco", "esburacad", "calcada", "semaforo", "poste", "arvore", "iluminacao", "energia", "agua", "esgoto", "bueiro", "asfalto", "paviment", "obra", "manutencao", "reparo", "saneamento", "entulho", "lixo", "coleta seletiva", "reservatorio", "adutora", "poco", "bomba", "racionamento", "eletric", "baldio", "dae", "cpfl", "companhia paulista de forca e luz", "interdi", "captacao", "quebr"],
    "Mortes e ferimentos": ["esfaqueado", "homicidio", "feminicídio", "assassin", "matar", "matou", "iml", "instituto medico legal", "letal", "afogou", "afoga", "morre", "mort", "obito", "ferid", "ferimento", "suicidio", "balead", "lesao", "lesoes", "carbonizad", "corpo"],
    "Problemas sociais": ["desemprego", "situacao de rua", "desabrig", "fome", "precar", "descaso", "morador", "favela", "comunidade", "moradia", "vulnera", "racis", "homofob", "transfob", "injuria"],
    "Reclamações": ["justica", "acusad", "laudo", "pericia", "mandado", "ilegal", "atacad", "ataque", "atacou", "abandonad", "descarte", "irregular", "fraud", "escass", "danific", "dano", "falha", "falta de", "reclamacao", "reclamam", "pane", "barulho", "desaparec", "estrago", "aband", "descart", "prejuizo"],
    "Saúde": ["internad", "samu", "saude", "mosquito", "infestacao", "dengue", "zika", "chikungunya", "aedes aegypti", "surto", "doente", "vacina", "covid", "influenza", "sus", "hospital", "upa", "ubs", "unidade basica de saude", "unidade de pronto atendimento", "pandemia", "epidemia", "proliferacao", "criadouro"],
    "Trânsito": ["transporte", "trafego", "aviao", "piloto", "veiculo", "tomb", "emdurmb", "transito", "acidente", "atropela", "colisao", "batida", "bate", "bateu", "capot", "motorista", "motociclista", "caminhao", "carro", "moto", "onibus", "pedestre", "ciclista", "mobilidade", "congestionamento", "radar", "emdurb", "sinal", "passageir"]
  }

  def classificar_ocorrencia(search_term, keywords):
    search_term = str(search_term).lower()
    for theme, words in keywords.items():
      for word in words:
        if word in search_term:
          return theme
    return "Outro"

  df['tema'] = df['search_term'].apply(lambda x: classificar_ocorrencia(x, theme_keywords))
  print("Coluna 'tema' criada com sucesso.")

  df.dropna(subset=['title'], inplace=True)
  df['published_date'] = pd.to_datetime(df['published_date'], dayfirst=True, errors='coerce')

  def parse_coordenadas(coord_str):
    if isinstance(coord_str, str) and coord_str.startswith('['):
      try:
        lista_coords = ast.literal_eval(coord_str)
        if not lista_coords:
          return None
        return lista_coords
      except (ValueError, SyntaxError):
        return None
    return None

  df['coordinates_list'] = df['coordinates'].apply(parse_coordenadas)
  df.dropna(subset=['coordinates_list'], inplace=True)
  print(f"Após limpeza e conversão de coordenadas, restam {len(df)} linhas com dados geográficos.")

  if df.empty:
    print("AVISO: Nenhuma linha com coordenadas válidas foi encontrada após o processamento.")
    return pd.DataFrame()

  df['bairro_lista'] = df['address'].apply(extrair_bairros)
  df_exploded = df.explode('coordinates_list')
  df_exploded.dropna(subset=['coordinates_list'], inplace=True)
  df_exploded = df_exploded.explode('bairro_lista')

  df_exploded['bairro'] = df_exploded['bairro_lista'].apply(normalizar_endereco)
  df_exploded['bairro'] = df_exploded['bairro'].str.strip()
  df_exploded = df_exploded[df_exploded['bairro'] != '']
  df_exploded.drop_duplicates(subset=['title', 'published_date', 'bairro', 'coordinates_list'], inplace=True)

  df_exploded.drop(columns=['bairro_lista'], inplace=True, errors='ignore')

  def extrair_lat(coord):
    if isinstance(coord, (list, tuple)) and len(coord) >= 1: return coord[0]
    return None

  def extrair_lon(coord):
    if isinstance(coord, (list, tuple)) and len(coord) >= 2: return coord[1]
    return None

  df_exploded['latitude'] = df_exploded['coordinates_list'].apply(extrair_lat)
  df_exploded['longitude'] = df_exploded['coordinates_list'].apply(extrair_lon)
  df_exploded.dropna(subset=['latitude', 'longitude'], inplace=True)
  print(f"Após 'explode' e extração de lat/lon, temos {len(df_exploded)} pontos para o mapa.")
  return df_exploded

dataframe_global = carregar_e_processar_dados()
if not dataframe_global.empty:
  print("Dados prontos para serem servidos pela API.")
else:
  print("AVISO: O servidor está a correr, mas sem dados para exibir. Verifique as mensagens de erro acima.")

def gerar_estatisticas_dashboard(df: pd.DataFrame) -> dict:
  resultado = {
    "por_tema": [],
    "serie_mensal": [],
    "principais_enderecos": []
  }

  if df.empty:
    return resultado

  contagem_tema = (
    df.groupby('tema')
      .size()
      .reset_index(name='contagem')
      .sort_values('contagem', ascending=False)
  )
  contagem_tema['contagem'] = contagem_tema['contagem'].astype(int)
  resultado['por_tema'] = contagem_tema.to_dict(orient='records')

  df_mensal = df.dropna(subset=['published_date']).copy()
  if not df_mensal.empty:
    df_mensal['mes'] = df_mensal['published_date'].dt.to_period('M')
    serie_mensal = (
      df_mensal.groupby('mes')
        .size()
        .reset_index(name='contagem')
        .sort_values('mes')
    )
    serie_mensal['mes'] = serie_mensal['mes'].astype(str)
    serie_mensal['contagem'] = serie_mensal['contagem'].astype(int)
    resultado['serie_mensal'] = serie_mensal.to_dict(orient='records')

  if 'bairro' in df.columns:
    bairros_validos = df['bairro'].fillna('').astype(str).str.strip()
    bairros_validos = bairros_validos[bairros_validos != '']
    if not bairros_validos.empty:
      bairros_normalizados = bairros_validos.apply(normalizar_endereco)
      bairros_normalizados = bairros_normalizados[bairros_normalizados != '']
      bairros_normalizados = bairros_normalizados[bairros_normalizados != 'Bauru']
      if not bairros_normalizados.empty:
        top_bairros = (
          bairros_normalizados
            .value_counts()
            .reset_index()
        )
        top_bairros.columns = ['endereco', 'contagem']
        top_bairros = top_bairros.sort_values('contagem', ascending=False).head(10)
        top_bairros['contagem'] = top_bairros['contagem'].astype(int)
        resultado['principais_enderecos'] = top_bairros.to_dict(orient='records')

  return resultado

@app.route('/api/ocorrencias', methods=['GET'])
def get_ocorrencias():
  print("Requisição recebida em /api/ocorrencias")
  anos_param = request.args.getlist('ano')
  temas_param = request.args.getlist('tema')
  bairros_param = request.args.getlist('bairro')
  df_filtrado = dataframe_global.copy()

  anos_validos = []
  for ano in anos_param:
    if not ano:
      continue
    for parte in str(ano).split(','):
      try:
        anos_validos.append(int(parte))
      except (TypeError, ValueError):
        continue

  temas_validos = []
  for tema in temas_param:
    if not tema:
      continue
    partes = [valor.strip() for valor in str(tema).split(',') if valor.strip()]
    temas_validos.extend(partes)

  anos_validos = sorted(set(anos_validos))
  temas_validos = list(dict.fromkeys(temas_validos))
  bairros_validos = normalizar_parametros_multivalores(bairros_param)

  if anos_validos:
    df_filtrado['ano'] = df_filtrado['published_date'].dt.year
    df_filtrado = df_filtrado[df_filtrado['ano'].isin(anos_validos)]
    print(f"Filtrando por anos: {anos_validos}")

  if temas_validos:
    df_filtrado = df_filtrado[df_filtrado['tema'].isin(temas_validos)]
    print(f"Filtrando por temas: {temas_validos}")

  if bairros_validos and 'bairro' in df_filtrado.columns:
    df_filtrado = df_filtrado[df_filtrado['bairro'].isin(bairros_validos)]
    print(f"Filtrando por bairros: {bairros_validos}")

  if df_filtrado.empty:
    return jsonify([])

  df_limpo = df_filtrado.where(pd.notnull(df_filtrado), None)
  dados_para_json = df_limpo.to_dict(orient='records')
  return jsonify(dados_para_json)

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
  print("Requisição recebida em /api/dashboard")
  anos_param = request.args.getlist('ano')
  temas_param = request.args.getlist('tema')
  bairros_param = request.args.getlist('bairro')
  df_filtrado = dataframe_global.copy()

  anos_validos = []
  for ano in anos_param:
    if not ano:
      continue
    for parte in str(ano).split(','):
      try:
        anos_validos.append(int(parte))
      except (TypeError, ValueError):
        continue

  temas_validos = []
  for tema in temas_param:
    if not tema:
      continue
    partes = [valor.strip() for valor in str(tema).split(',') if valor.strip()]
    temas_validos.extend(partes)

  anos_validos = sorted(set(anos_validos))
  temas_validos = list(dict.fromkeys(temas_validos))
  bairros_validos = normalizar_parametros_multivalores(bairros_param)

  if anos_validos:
    df_filtrado['ano'] = df_filtrado['published_date'].dt.year
    df_filtrado = df_filtrado[df_filtrado['ano'].isin(anos_validos)]
    print(f"Filtrando por anos: {anos_validos}")

  if temas_validos:
    df_filtrado = df_filtrado[df_filtrado['tema'].isin(temas_validos)]
    print(f"Filtrando por temas: {temas_validos}")

  if bairros_validos and 'bairro' in df_filtrado.columns:
    df_filtrado = df_filtrado[df_filtrado['bairro'].isin(bairros_validos)]
    print(f"Filtrando por bairros: {bairros_validos}")

  estatisticas = gerar_estatisticas_dashboard(df_filtrado)
  return jsonify(estatisticas)

@app.route('/api/ocorrencias-recorrentes', methods=['GET'])
def get_ocorrencias_recorrentes():
  print("Requisição recebida em /api/ocorrencias-recorrentes")
  anos_param = request.args.getlist('ano')
  temas_param = request.args.getlist('tema')
  bairros_param = request.args.getlist('bairro')
  df_filtrado = dataframe_global.copy()

  anos_validos = []
  for ano in anos_param:
    if not ano:
      continue
    for parte in str(ano).split(','):
      try:
        anos_validos.append(int(parte))
      except (TypeError, ValueError):
        continue

  temas_validos = []
  for tema in temas_param:
    if not tema:
      continue
    partes = [valor.strip() for valor in str(tema).split(',') if valor.strip()]
    temas_validos.extend(partes)

  anos_validos = sorted(set(anos_validos))
  temas_validos = list(dict.fromkeys(temas_validos))
  bairros_validos = normalizar_parametros_multivalores(bairros_param)

  if anos_validos:
    df_filtrado['ano'] = df_filtrado['published_date'].dt.year
    df_filtrado = df_filtrado[df_filtrado['ano'].isin(anos_validos)]
    print(f"Filtrando por anos: {anos_validos}")

  if temas_validos:
    df_filtrado = df_filtrado[df_filtrado['tema'].isin(temas_validos)]
    print(f"Filtrando por temas: {temas_validos}")

  if bairros_validos and 'bairro' in df_filtrado.columns:
    df_filtrado = df_filtrado[df_filtrado['bairro'].isin(bairros_validos)]
    print(f"Filtrando por bairros: {bairros_validos}")

  if df_filtrado.empty:
    return jsonify([])

  precisao = 3
  df_filtrado = df_filtrado.copy()
  df_filtrado['chave_local'] = list(zip(
    round(df_filtrado['latitude'], precisao),
    round(df_filtrado['longitude'], precisao)
  ))

  def obter_bairro_predominante(series):
    serie_limpa = series.dropna().astype(str).str.strip()
    serie_limpa = serie_limpa[serie_limpa != '']
    if serie_limpa.empty:
      return 'Bairro não disponível'
    moda = serie_limpa.mode()
    if not moda.empty:
      return normalizar_endereco(moda.iloc[0]) or 'Bairro não disponível'
    return normalizar_endereco(serie_limpa.iloc[0]) or 'Bairro não disponível'

  enderecos_por_local = df_filtrado.groupby('chave_local')['bairro'].agg(obter_bairro_predominante)

  recorrencias = df_filtrado.groupby(['chave_local', 'tema']).size()
  recorrencias = recorrencias[recorrencias > 7]
  df_recorrencias = recorrencias.reset_index(name='contagem')

  if df_recorrencias.empty:
    return jsonify([])

  df_recorrencias['endereco_comum'] = df_recorrencias['chave_local'].map(enderecos_por_local)
  df_recorrencias = df_recorrencias.sort_values('contagem', ascending=False)

  resultado = []
  for _, row in df_recorrencias.iterrows():
    lat, lon = row['chave_local']
    resultado.append({
      'latitude': lat,
      'longitude': lon,
      'tema': row['tema'],
      'contagem': int(row['contagem']),
      'endereco_comum': enderecos_por_local.get(row['chave_local'], 'Bairro não disponível')
    })

  print(f"Encontradas {len(resultado)} ocorrências recorrentes")
  return jsonify(resultado)

if __name__ == '__main__':
  app.run(debug=True, port=5001)
