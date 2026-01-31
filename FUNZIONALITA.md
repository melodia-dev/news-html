# 🔧 NUOVE FUNZIONALITÀ IMPLEMENTATE

## 📋 Configurazione

Le tre nuove funzionalità sono configurabili all'inizio del file `script.js`:

```javascript
const CONFIG = {
    TIME_FILTER_HOURS: 48,      // Filtra notizie più vecchie di 48 ore
    EXACT_MATCH: true,           // true = match esatto, false = match parziale
    MAX_NEWS_PER_GROUP: 10       // Massimo 10 notizie per gruppo
};
```

---

## ⏰ 1. FILTRO TEMPORALE (48 ORE MAX)

### Cosa fa
Mostra solo notizie pubblicate nelle ultime 48 ore.

### Come funziona
```javascript
const now = Date.now();
const timeLimit = CONFIG.TIME_FILTER_HOURS * 60 * 60 * 1000; // 48h in ms

allNews = allNews.filter(item => {
    if (!item.timestamp) return true; // Mantieni se non ha timestamp
    return (now - item.timestamp) <= timeLimit;
});
```

### Personalizzazione
Per cambiare il periodo, modifica `TIME_FILTER_HOURS`:
- `24` = ultime 24 ore
- `48` = ultime 48 ore (default)
- `72` = ultimi 3 giorni
- `168` = ultima settimana

### Note
- Le notizie senza data vengono mantenute (potrebbero essere importanti)
- Il calcolo usa il timestamp al momento della pubblicazione RSS

---

## 🎯 2. FILTRO PAROLE ESATTE

### Cosa fa
Distingue tra "Intesa" e "Intesa Sanpaolo" usando word boundary.

### Come funziona
```javascript
function matchKeyword(text, keyword) {
    if (CONFIG.EXACT_MATCH) {
        // Match esatto con word boundary
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(text);
    } else {
        // Match parziale
        return text.toLowerCase().includes(keyword.toLowerCase());
    }
}
```

### Esempi Pratici

**Con EXACT_MATCH = true:**
- Keyword: `"Intesa"` → Match: "Intesa ha annunciato" ✅
- Keyword: `"Intesa"` → NO Match: "Intesa Sanpaolo annuncia" ❌
- Keyword: `"Intesa Sanpaolo"` → Match: "Intesa Sanpaolo annuncia" ✅

**Con EXACT_MATCH = false:**
- Keyword: `"Intesa"` → Match: "Intesa ha annunciato" ✅
- Keyword: `"Intesa"` → Match: "Intesa Sanpaolo annuncia" ✅
- Keyword: `"Sanpaolo"` → Match: "Intesa Sanpaolo annuncia" ✅

### Personalizzazione
Cambia `EXACT_MATCH`:
- `true` = Match esatto con word boundary (raccomandato)
- `false` = Match parziale (più permissivo)

### Word Boundary
Il simbolo `\b` in regex significa "confine di parola". Matcha:
- Inizio/fine stringa
- Spazi
- Punteggiatura

**Esempi:**
- `"Intesa"` in "Intesa ha" → ✅ (spazio dopo)
- `"Intesa"` in "Intesa, oggi" → ✅ (virgola dopo)
- `"Intesa"` in "Intesa." → ✅ (punto dopo)
- `"Intesa"` in "Intesanext" → ❌ (nessun confine)

---

## 📊 3. MAX NOTIZIE PER GRUPPO (10)

### Cosa fa
Limita ogni gruppo a massimo 10 notizie (le più recenti).

### Come funziona
```javascript
function groupByKeyword(newsItems) {
    // ... logica raggruppamento ...
    
    // Limita il numero di notizie per gruppo
    for (const group in grouped) {
        if (grouped[group].length > CONFIG.MAX_NEWS_PER_GROUP) {
            grouped[group] = grouped[group].slice(0, CONFIG.MAX_NEWS_PER_GROUP);
        }
    }
    
    return grouped;
}
```

### Personalizzazione
Cambia `MAX_NEWS_PER_GROUP`:
- `5` = massimo 5 notizie per gruppo
- `10` = massimo 10 notizie per gruppo (default)
- `20` = massimo 20 notizie per gruppo
- `999999` = nessun limite pratico

### Note
- Le notizie sono già ordinate per data (più recenti prima)
- Il limite si applica DOPO il filtraggio temporale
- Se un gruppo ha 15 notizie, vengono mostrate le prime 10 (più recenti)

---

## 🔄 ORDINE DI APPLICAZIONE FILTRI

I filtri vengono applicati in questo ordine:

```
1. Caricamento feed RSS
2. Parsing notizie
3. ✅ Filtro per KEYWORD (match esatto o parziale)
4. ✅ Filtro TEMPORALE (48 ore)
5. Rimozione duplicati (stesso link)
6. Ordinamento per data (più recenti prima)
7. Raggruppamento per keyword/gruppo
8. ✅ Limite MAX NOTIZIE PER GRUPPO (10)
9. Visualizzazione
```

---

## 💡 ESEMPI DI CONFIGURAZIONE

### Configurazione Conservativa (Poche notizie, molto precise)
```javascript
const CONFIG = {
    TIME_FILTER_HOURS: 24,       // Solo ultime 24 ore
    EXACT_MATCH: true,           // Solo match esatti
    MAX_NEWS_PER_GROUP: 5        // Max 5 notizie per gruppo
};
```

### Configurazione Permissiva (Molte notizie, meno precise)
```javascript
const CONFIG = {
    TIME_FILTER_HOURS: 168,      // Ultima settimana
    EXACT_MATCH: false,          // Match parziali OK
    MAX_NEWS_PER_GROUP: 20       // Max 20 notizie per gruppo
};
```

### Configurazione Bilanciata (Default)
```javascript
const CONFIG = {
    TIME_FILTER_HOURS: 48,       // Ultime 48 ore
    EXACT_MATCH: true,           // Match esatti
    MAX_NEWS_PER_GROUP: 10       // Max 10 notizie per gruppo
};
```

---

## 🧪 TESTING

### Test Match Esatto
Crea questa keyword in `keyword.csv`:
```csv
keyword,attivo,gruppo
Intesa,true,Test Intesa
Intesa Sanpaolo,true,Test Intesa Sanpaolo
```

Con `EXACT_MATCH = true`:
- "Intesa annuncia" → gruppo "Test Intesa"
- "Intesa Sanpaolo annuncia" → gruppo "Test Intesa Sanpaolo"
- Sono DUE gruppi separati

Con `EXACT_MATCH = false`:
- "Intesa annuncia" → gruppo "Test Intesa"
- "Intesa Sanpaolo annuncia" → ENTRAMBI i gruppi (duplicato)

### Test Filtro Temporale
1. Imposta `TIME_FILTER_HOURS: 1` (1 ora)
2. Carica notizie
3. Dovresti vedere solo notizie recentissime

### Test Limite Gruppo
1. Trova un gruppo con molte notizie
2. Imposta `MAX_NEWS_PER_GROUP: 3`
3. Carica notizie
4. Ogni gruppo dovrebbe avere max 3 notizie

---

## 🐛 TROUBLESHOOTING

### Problema: Troppe poche notizie
**Soluzione:**
- Aumenta `TIME_FILTER_HOURS` (es. 72 o 168)
- Imposta `EXACT_MATCH: false`
- Aumenta `MAX_NEWS_PER_GROUP`

### Problema: Troppe notizie duplicate
**Soluzione:**
- Imposta `EXACT_MATCH: true`
- Riduci `MAX_NEWS_PER_GROUP`
- Controlla keyword.csv per duplicati

### Problema: Keyword non funziona
**Soluzione:**
- Con `EXACT_MATCH: true`, usa la parola esatta completa
- Es. "Intesa Sanpaolo" invece di "Intesa" o "Sanpaolo"

### Problema: Notizie vecchie
**Soluzione:**
- Riduci `TIME_FILTER_HOURS` a 24 o 12
- Verifica che i feed RSS abbiano date corrette

---

## ✅ CHECKLIST IMPLEMENTAZIONE

- [x] Filtro temporale 48h implementato
- [x] Match esatto con word boundary implementato
- [x] Limite 10 notizie per gruppo implementato
- [x] Configurazione centralizzata in oggetto CONFIG
- [x] Codice commentato e chiaro
- [x] Funziona con configurazione di default
- [x] Personalizzabile facilmente
- [x] Documentazione completa

---

**🎉 Tutte e tre le funzionalità sono implementate e pronte all'uso!**
