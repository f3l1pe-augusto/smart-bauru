import streamlit as st
import pandas as pd
import ast
import folium
from folium import Icon
from streamlit_folium import st_folium
import matplotlib.pyplot as plt

# --- Configuração da página ---
st.set_page_config(page_title="Mapa de Ocorrências Urbanas", layout="wide")

# --- Função de classificação de ocorrências ---
def classificar_ocorrencia(search_term, theme_keywords):
    term = str(search_term).lower()
    for theme, words in theme_keywords.items():
        for word in words:
            if word in term:
                return theme
    return "Outro"

# --- Dicionário de temas e palavras-chave ---
theme_keywords = {
    "Animais e meio ambiente": ["rio batalha", "cobra", "animal", "animais", "maus-tratos", "maus tratos", "picad", "escorpiao", "poluido", "poluida", "mato", "poluicao", "poeira", "fumaca", "fogo", "incendio", "queima", "peconhento"],
    "Clima e desastres naturais": ["chuva", "chove", "granizo", "temporal", "tempestade", "ventania", "desastre", "erosao", "queda", "desaba", "desabou", "atol", "calor", "frio", "submers", "derrub", "cair", "caiu"],
    "Crimes": ["agredid", "tortura", "feminicídio", "agredir", "agressao", "assassin", "matar", "matou", "esfaquead", "arma", "tiro", "bala perdida", "disparo", "atentado", "homicidio", "facao", "facada", "violen", "crime", "sequestr", "esquartejad", "choque", "criminos", "pixacao", "vitima", "roub", "furt", "assalt", "latrocionio", "vandalismo", "vandalo", "quadrilha", "arromb", "invad", "desviado", "golp", "bandid", "celular", "faccao"],
    "Drogas e tráfico": ["droga", "maconha", "cocaina", "crack", "trafic", "apreen", "contrab"],
    "Emergências e riscos": ["urgen", "risco", "alerta", "emergencia", "socorr", "grave"],
    "Infraestrutura e serviços urbanos": ["interr", "vazamento", "prefeit", "abastecimento", "rodizio", "cratera", "enchente", "enxurrada", "alaga", "luz", "buraco", "esburacad", "calcada", "semaforo", "poste", "arvore", "iluminacao", "energia", "agua", "esgoto", "bueiro", "asfalto", "paviment", "obra", "manutencao", "reparo", "saneamento", "entulho", "lixo", "coleta seletiva", "reservatorio", "adutora", "poco", "bomba", "racionamento", "eletric", "baldio", "dae", "cpfl", "companhia paulista de forca e luz", "interdi", "captacao", "quebr"],
    "Mortes e ferimentos": ["iml", "instituto medico legal", "letal", "afogou", "afoga", "morre", "mort", "obito", "ferid", "ferimento", "suicidio", "balead", "lesao", "lesoes", "carbonizad", "corpo"],
    "Problemas sociais": ["desemprego", "situacao de rua", "desabrig", "fome", "precar", "descaso", "morador", "favela", "comunidade", "moradia", "vulnera", "racis", "homofob", "transfob", "injuria"],
    "Reclamações e problemas gerais": ["justica", "acusad", "laudo", "pericia", "mandado", "ilegal", "atacad", "ataque", "atacou", "abandonad", "descarte", "irregular", "fraud", "escass", "danific", "dano", "falha", "falta de", "reclamacao", "reclamam", "pane", "barulho", "desaparec", "estrago", "aband", "descart", "prejuizo"],
    "Saúde e doenças": ["internad", "samu", "saude", "mosquito", "infestacao", "dengue", "zika", "chikungunya", "aedes aegypti", "surto", "doente", "vacina", "covid", "influenza", "sus", "hospital", "upa", "ubs", "unidade basica de saude", "unidade de pronto atendimento", "pandemia", "epidemia", "proliferacao", "criadouro"],
    "Segurança pública": ["fuga", "penitenciaria", "operac", "flagr", "prende", "policia", "bombeir", "blitz", "prisao", "mandado", "delegacia", "seguranca", "camera", "captura", "capturad", "investiga", "foragid", "cadeia", "presidiari", "detent", "pris", "detid", "abordagem", "denunc", "preso", "presa", "suspeit", "motim"],
    "Trânsito e transporte": ["transporte", "trafego", "aviao", "piloto", "veiculo", "tomb", "emdurmb", "transito", "acidente", "atropela", "colisao", "batida", "bate", "bateu", "capot", "motorista", "motociclista", "caminhao", "carro", "moto", "onibus", "pedestre", "ciclista", "mobilidade", "congestionamento", "radar", "emdurb", "sinal", "passageir"],
    "Violência sexual e abuso": ["bater", "estupr", "assed", "importuna", "abus", "pedofil", "medida protetiva"],
}

# --- Carregamento e pré-processamento ---
@st.cache_data
def load_data():
    df = pd.read_csv('data/df_all_news.csv')
    # Extrai coordenadas
    df['coordinates'] = df['coordinates'].apply(
        lambda x: ast.literal_eval(x) if isinstance(x, str) else x
    )
    df = df.explode('coordinates').dropna(subset=['coordinates'])
    df['latitude'] = df['coordinates'].apply(lambda c: c[0])
    df['longitude'] = df['coordinates'].apply(lambda c: c[1])
    # Datas e anos
    df['published_date'] = pd.to_datetime(
        df['published_date'], dayfirst=True, errors='coerce'
    )
    df['ano'] = df['published_date'].dt.year
    # Classificação de ocorrências
    df['search_term'] = df['search_term'].apply(
        lambda x: classificar_ocorrencia(x, theme_keywords)
    )
    # Remove quaisquer lat/long inválidos
    return df.dropna(subset=['latitude', 'longitude', 'ano'])

# Carrega dados
df = load_data()

# --- Filtros na barra lateral ---
categorias = sorted(df['search_term'].unique())
anos = sorted(df['ano'].unique())
selected_cats = st.sidebar.multiselect(
    "Selecione temas:", categorias, default=categorias
)
selected_anos = st.sidebar.multiselect(
    "Selecione anos:", anos, default=anos
)

# Aplica máscara e remove NaNs em latitude/longitude
mask = df['search_term'].isin(selected_cats) & df['ano'].isin(selected_anos)
df_filtrado = df[mask].dropna(subset=['latitude', 'longitude'])

# --- Mapa ---
if not df_filtrado.empty:
    loc = [df_filtrado['latitude'].mean(), df_filtrado['longitude'].mean()]
else:
    loc = [-23.00, -49.00]  # Bauru padrão
mapa = folium.Map(location=loc, zoom_start=13)

# Paletas e mapeamentos
icon_palette = ['leaf', 'bolt', 'gun', 'user-secret', 'exclamation-triangle','wrench',
                'skull-crossbones', 'users', 'bell', 'hospital', 'shield', 'car','user']
color_palette = ['green','darkblue','darkred','purple','orange',
                 'darkgreen','black','gray','lightred','blue',
                 'cadetblue','darkpurple','beige']
icons_cat = {cat: icon_palette[i % len(icon_palette)] for i, cat in enumerate(categorias)}
cores_cat = {cat: color_palette[i % len(color_palette)] for i, cat in enumerate(categorias)}

for _, row in df_filtrado.iterrows():
    folium.Marker(
        location=[row['latitude'], row['longitude']],
        popup=row.get('title', ''),
        tooltip=row['search_term'],
        icon=Icon(
            color=cores_cat.get(row['search_term'], 'gray'),
            icon=icons_cat.get(row['search_term'], 'info-circle'),
            prefix='fa'
        )
    ).add_to(mapa)

st.subheader("Mapa de Ocorrências")
st_folium(mapa, width=1500, height=600)

# --- Estatísticas na sidebar ---
st.sidebar.markdown("---")
st.sidebar.subheader("Estatísticas")

# Gráfico: tipo de ocorrência
contagem = df['search_term'].value_counts()
fig, ax = plt.subplots(figsize=(6, 4))
contagem.plot(kind='bar', ax=ax)
ax.set_xlabel('Tipo de ocorrência')
ax.set_ylabel('Quantidade')
ax.set_title('Estatísticas por tipo de ocorrência')
st.sidebar.pyplot(fig)

# Gráfico: site/fonte
contagem_site = df['site'].value_counts()
fig2, ax2 = plt.subplots(figsize=(6, 4))
contagem_site.plot(kind='bar', ax=ax2)
ax2.set_xlabel('Site/Fonte')
ax2.set_ylabel('Quantidade')
ax2.set_title('Estatísticas por site/fonte')
st.sidebar.pyplot(fig2)

# Gráfico: ano
contagem_ano = df['ano'].value_counts().sort_index()
fig3, ax3 = plt.subplots(figsize=(6, 4))
contagem_ano.plot(kind='bar', ax=ax3)
ax3.set_xlabel('Ano')
ax3.set_ylabel('Quantidade')
ax3.set_title('Estatísticas por ano')
st.sidebar.pyplot(fig3)

# Instruções de uso
st.sidebar.markdown("---")
st.sidebar.markdown(
    "**Como usar:**\n"
    "1. Selecione temas e anos na barra lateral.\n"
    "2. Navegue entre o mapa e as estatísticas."
)
