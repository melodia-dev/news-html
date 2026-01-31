# 📊 Aggregatore Notizie Finanziarie

Aggregatore RSS di notizie finanziarie con sistema di filtraggio per keyword e raggruppamento intelligente.

## 🚀 Caratteristiche

- **Semplice e Pulito**: Un solo pulsante "Carica Notizie"
- **Configurazione Esterna**: Feed e keyword gestiti tramite file CSV
- **Proxy Ottimizzato**: Sistema intelligente di rotazione proxy per bypassare CORS
- **Raggruppamento**: Notizie raggruppate per parole chiave con supporto gruppi
- **Responsive**: Funziona su desktop e mobile
- **Zero Configurazione Utente**: Tutto è gestito nei file CSV

## 📁 Struttura File

```
aggregatore-notizie/
├── index.html          # Interfaccia utente
├── style.css           # Stili
├── script.js           # Logica applicazione
├── fonti.csv           # Elenco feed RSS
├── keyword.csv         # Parole chiave e gruppi
└── README.md           # Questo file
```

## 🔧 Configurazione

### File `fonti.csv`

Struttura: `nome,url,attivo`

```csv
nome,url,attivo
Il Sole 24 Ore,https://www.ilsole24ore.com/rss/finanza.xml,true
Reuters Business,https://feeds.reuters.com/reuters/businessNews,true
Bloomberg Markets,https://feeds.bloomberg.com/markets/news.rss,false
```

- **nome**: Nome visualizzato della fonte
- **url**: URL del feed RSS/Atom
- **attivo**: `true` o `false` (o `1`/`0`)

### File `keyword.csv`

Struttura: `keyword,attivo,gruppo`

```csv
keyword,attivo,gruppo
Intesa Sanpaolo,true,Intesa
Intesa,true,Intesa
ISP,true,Intesa
Unicredit,true,Unicredit
UCG,true,Unicredit
```

- **keyword**: Parola chiave da cercare
- **attivo**: `true` o `false` (o `1`/`0`)
- **gruppo**: Nome del gruppo (per aggregare keyword diverse)

**Esempio di raggruppamento:**
- "Banca Mediolanum" e "Mediolanum" → stesso gruppo "Mediolanum"
- "Intesa", "Intesa Sanpaolo", "ISP" → stesso gruppo "Intesa"

## 🌐 Utilizzo con GitHub Pages

### Setup Iniziale

1. Crea un repository su GitHub
2. Carica tutti i file nella root del repository
3. Vai su Settings → Pages
4. Seleziona "Deploy from branch" → "main" → "/(root)"
5. Salva

Il tuo sito sarà disponibile su: `https://tuousername.github.io/nome-repo/`

### Aggiornamento Feed e Keyword

Per modificare feed o keyword:

1. Modifica i file CSV direttamente su GitHub (o in locale)
2. Commit e push
3. Il sito si aggiornerà automaticamente

## 💻 Sviluppo Locale

### Con Visual Studio Code

1. Installa l'estensione "Live Server"
2. Apri la cartella del progetto
3. Click destro su `index.html` → "Open with Live Server"
4. Il browser si aprirà automaticamente

### Senza Server

Alcuni browser (Chrome) bloccano le richieste file:// per sicurezza.

**Soluzione rapida con Python:**

```bash
# Python 3
python -m http.server 8000

# Poi apri: http://localhost:8000
```

**Oppure con Node.js:**

```bash
npx http-server -p 8000
```

## 🔍 Come Funziona

### Sistema Proxy

Il codice usa una rotazione intelligente di proxy pubblici per bypassare le limitazioni CORS:

1. `api.allorigins.win` (primo tentativo)
2. `corsproxy.io` (fallback)
3. `api.codetabs.com` (ultimo fallback)

**Cache intelligente**: I proxy che funzionano vengono memorizzati per velocizzare le richieste successive.

### Filtraggio Keyword

Le notizie vengono filtrate cercando le keyword in:
- Titolo
- Descrizione

Una notizia appare solo se contiene almeno una keyword attiva.

### Raggruppamento

Le notizie vengono raggruppate per:
- **Gruppo** (se specificato nel CSV)
- **Keyword** (se nessun gruppo)
- **"Altro"** (se non corrisponde a nessuna keyword)

## 🎨 Personalizzazione

### Modifica Colori

Modifica le variabili CSS in `style.css`:

```css
:root {
    --primary: #667eea;        /* Colore principale */
    --primary-dark: #5568d3;   /* Colore hover */
    --success: #10b981;        /* Verde successo */
    --danger: #ef4444;         /* Rosso errore */
}
```

### Modifica Proxy

Modifica l'array in `script.js`:

```javascript
const PROXY_SERVERS = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'tuo-proxy-personale?url='
];
```

## 🐛 Troubleshooting

### Le notizie non si caricano

1. Controlla la console del browser (F12)
2. Verifica che i file CSV siano nella stessa cartella
3. Controlla che gli URL dei feed siano corretti
4. Alcuni feed potrebbero essere temporaneamente offline

### Errori CORS

I proxy pubblici a volte hanno limitazioni:
- Aggiungi altri proxy alla lista
- Considera un proxy personale per uso intensivo

### File CSV non vengono letti

- Verifica che siano nella stessa cartella di `index.html`
- Controlla che il formato CSV sia corretto (virgola come separatore)
- Verifica l'encoding del file (deve essere UTF-8)

## 📝 Formato Feed Supportati

- **RSS 2.0** (standard)
- **Atom 1.0**
- Feed XML generici con elementi `<item>` o `<entry>`

## 🔐 Privacy

- **Nessun dato viene salvato sul server**
- Tutto avviene nel browser dell'utente
- I proxy vedono solo gli URL dei feed richiesti
- Zero tracking, zero analytics

## 📄 Licenza

Progetto sperimentale open source. Usa e modifica liberamente.

## 🤝 Contributi

Questo è un progetto educativo/sperimentale. Suggerimenti e miglioramenti sono benvenuti!

### Possibili Miglioramenti

- [ ] Aggiungere cache localStorage per velocizzare ricaricamenti
- [ ] Implementare paginazione per molte notizie
- [ ] Aggiungere export PDF/Excel
- [ ] Dark mode
- [ ] Ricerca full-text
- [ ] Notifiche per nuove notizie
- [ ] Grafici statistiche

## 👨‍💻 Autore

Progetto creato come esperimento per aggregare notizie finanziarie.

---

**⭐ Se ti piace, lascia una stella su GitHub!**
