# Smart Bauru
Um Sistema de Informação Geográfica (SIG) para mapeamento e análise de ocorrências urbanas na cidade de Bauru–SP

![Smart Bauru](./images/smart-bauru.png)

## Tecnologias Utilizadas
- Backend: Python, Flask
- Frontend: HTML, CSS, JavaScript, Leaflet.js
- Banco de Dados: CSV

## Funcionalidades
- Mapeamento de ocorrências urbanas
- Visualização com marcadores, mapa de calor ou ocorrências recorrentes
- Filtros por tipo de ocorrência e ano

## API

### `GET /api/dashboard`
Retorna agregações utilizadas no dashboard, aplicando os mesmos filtros de ano (`?ano=2024`) e tema (`?tema=Clima`) disponíveis em `/api/ocorrencias`.

Formato da resposta:

```json
{
  "por_tema": [
    {"tema": "Infraestrutura", "contagem": 42}
  ],
  "serie_mensal": [
    {"mes": "2024-01", "contagem": 15}
  ],
  "principais_enderecos": [
    {"endereco": "Rua Exemplo, 123", "contagem": 3}
  ]
}
```

Exemplo de validação com `curl`:

```bash
curl "http://localhost:5001/api/dashboard?ano=2024&tema=Clima"
```

## Instalação
1. Clone o repositório:
   ```bash
   git clone [https://github.com/f3l1pe-augusto/smart-bauru.git](https://github.com/f3l1pe-augusto/smart-bauru.git)
   cd smart-bauru
   ```
   
2. Crie um ambiente virtual e ative-o:
   ```bash
   python -m venv venv
   source venv/bin/activate  # No Windows use `venv\Scripts\activate`
   ```
   
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
   
4. Execute o backend:
   ```bash
   python app.py
   ```
5. Execute o servidor frontend (em outro terminal):
   ```bash
   python -m http.server
   ```

6. Acesse o sistema no navegador:
   ```
   http://localhost:8000
   ```
   