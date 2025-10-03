from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import ast

app = Flask(__name__)
CORS(app)

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

  df_exploded = df.explode('coordinates_list')
  df_exploded.dropna(subset=['coordinates_list'], inplace=True)

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

@app.route('/api/ocorrencias', methods=['GET'])
def get_ocorrencias():
  print("Requisição recebida em /api/ocorrencias")
  ano_filtro = request.args.get('ano')
  tema_filtro = request.args.get('tema')
  df_filtrado = dataframe_global.copy()

  if ano_filtro:
    df_filtrado['ano'] = df_filtrado['published_date'].dt.year
    df_filtrado = df_filtrado[df_filtrado['ano'] == int(ano_filtro)]
    print(f"Filtrando por ano: {ano_filtro}")

  if tema_filtro:
    df_filtrado = df_filtrado[df_filtrado['tema'] == tema_filtro]
    print(f"Filtrando por tema: {tema_filtro}")

  if df_filtrado.empty:
    return jsonify([])

  df_limpo = df_filtrado.copy()
  datetime_cols = df_limpo.select_dtypes(include=['datetime64[ns]', 'datetime64[ns, tz]']).columns
  for col in datetime_cols:
    df_limpo[col] = df_limpo[col].apply(lambda x: x.isoformat() if pd.notnull(x) else None)

  df_limpo = df_limpo.where(pd.notnull(df_limpo), None)
  dados_para_json = df_limpo.to_dict(orient='records')
  return jsonify(dados_para_json)

@app.route('/api/ocorrencias-recorrentes', methods=['GET'])
def get_ocorrencias_recorrentes():
  print("Requisição recebida em /api/ocorrencias-recorrentes")
  ano_filtro = request.args.get('ano')
  tema_filtro = request.args.get('tema')
  df_filtrado = dataframe_global.copy()

  if ano_filtro:
    df_filtrado['ano'] = df_filtrado['published_date'].dt.year
    df_filtrado = df_filtrado[df_filtrado['ano'] == int(ano_filtro)]
    print(f"Filtrando por ano: {ano_filtro}")

  if tema_filtro:
    df_filtrado = df_filtrado[df_filtrado['tema'] == tema_filtro]
    print(f"Filtrando por tema: {tema_filtro}")

  if df_filtrado.empty:
    return jsonify([])

  precisao = 3
  df_filtrado = df_filtrado.copy()
  df_filtrado['chave_local'] = list(zip(
    round(df_filtrado['latitude'], precisao),
    round(df_filtrado['longitude'], precisao)
  ))

  enderecos_por_local = df_filtrado.groupby('chave_local')['address'].agg(
    lambda x: x.mode().iloc[0] if not x.empty else 'Endereço não disponível'
  )

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
      'endereco_comum': row['endereco_comum']
    })

  print(f"Encontradas {len(resultado)} ocorrências recorrentes")
  return jsonify(resultado)

if __name__ == '__main__':
  app.run(debug=True, port=5001)
