/* ==========================================
   AGGREGATORE NOTIZIE FINANZIARIE - SCRIPT
   ========================================== */

// Configurazione Proxy - Lista ottimizzata
const PROXY_SERVERS = [
        'https://cors-anywhere.run/'          
      
        // Alternative:
        // 'https://bridge.codes',
        // 'https://corsproxy.io/?',
        // 'https://api.codetabs.com/v1/proxy?quest=',
        // 'https://proxy.cors.sh/' 
        // 'https://api.allorigins.win/get?url=',           no
        // 'https://api.allorigins.win/raw?url=',           13
        // 'https://thingproxy.freeboard.io/fetch/',    
        // 'https://corsproxy.xyz/',                     
        // 'https://cors-anywhere.run/',                     ?

      

     
];

// Cache per migliorare le performance
const proxyCache = new Map();
let currentProxyIndex = 0;

// Configurazione filtri
const CONFIG = {
    TIME_FILTER_HOURS: 48,      // Filtra notizie più vecchie di 48 ore
    EXACT_MATCH: true,           // true = match esatto, false = match parziale
    MAX_NEWS_PER_GROUP: 5       // Massimo 10 notizie per gruppo
};

// Dati globali
let feeds = [];
let keywords = [];
let allNews = [];

/* ==========================================
   CARICAMENTO DATI DA CSV
   ========================================== */

async function loadFeeds() {
    try {
        const response = await fetch('fonti.csv');
        const text = await response.text();
        
        feeds = text.trim().split('\n')
            .slice(1) // Salta l'header
            .map(line => {
                const [name, url, active] = line.split(',').map(s => s.trim());
                return { name, url, active: active === 'true' || active === '1' };
            })
            .filter(f => f.active); // Solo feed attivi
        
        console.log(`✓ Caricati ${feeds.length} feed attivi`);
    } catch (error) {
        console.error('Errore caricamento fonti.csv:', error);
        showStatus('❌ Errore nel caricamento delle fonti', 'error');
    }
}

async function loadKeywords() {
    try {
        const response = await fetch('keyword.csv');
        const text = await response.text();
        
        keywords = text.trim().split('\n')
            .slice(1) // Salta l'header
            .map(line => {
                const [keyword, active, group] = line.split(',').map(s => s.trim());
                return { keyword, active: active === 'true' || active === '1', group };
            })
            .filter(k => k.active); // Solo keyword attive
        
        console.log(`✓ Caricate ${keywords.length} keyword attive`);
    } catch (error) {
        console.error('Errore caricamento keyword.csv:', error);
        showStatus('❌ Errore nel caricamento delle keyword', 'error');
    }
}

        // ⬇️ AGGIUNGI QUI LA BLACKLIST
    let blacklist = [];

    async function loadBlacklist() {
        try {
            const response = await fetch('blacklist.csv');
            const text = await response.text();
            
            blacklist = text.trim().split('\n')
                .slice(1)
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            console.log(`✓ Caricate ${blacklist.length} blacklist`);
        } catch (error) {
            console.warn('Blacklist non trovata');
        }
    }

/* ==========================================
   GESTIONE PROXY OTTIMIZZATA
   ========================================== */

function getProxyUrl(feedUrl) {
    // Controlla cache
    if (proxyCache.has(feedUrl)) {
        return proxyCache.get(feedUrl);
    }
    
    // Usa il proxy corrente e ruota
    const proxy = PROXY_SERVERS[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % PROXY_SERVERS.length;
    
    const proxyUrl = proxy + encodeURIComponent(feedUrl);
    proxyCache.set(feedUrl, proxyUrl);
    
    return proxyUrl;
}

async function fetchWithFallback(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const proxyUrl = getProxyUrl(url);
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
            });
            
            if (response.ok) {
                return await response.text();
            }
            
            // Rimuovi dalla cache se fallisce
            proxyCache.delete(url);
            
        } catch (error) {
            console.warn(`Tentativo ${i + 1} fallito per ${url}:`, error.message);
            proxyCache.delete(url);
        }
    }
    
    throw new Error(`Impossibile recuperare ${url} dopo ${maxRetries} tentativi`);
}

/* ==========================================
   PARSING RSS/ATOM
   ========================================== */

function parseRSS(xmlText, sourceName) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const items = [];
    
    // Supporto RSS 2.0
    const rssItems = xmlDoc.querySelectorAll('item');
    rssItems.forEach(item => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        
        if (title && link) {
            items.push({
                title: cleanText(title),
                link: link.trim(),
                pubDate: pubDate ? new Date(pubDate).toLocaleString('it-IT') : '',
                description: cleanText(description),
                source: sourceName,
                timestamp: pubDate ? new Date(pubDate).getTime() : Date.now()
            });
        }
    });
    
    // Supporto Atom
    if (items.length === 0) {
        const atomEntries = xmlDoc.querySelectorAll('entry');
        atomEntries.forEach(entry => {
            const title = entry.querySelector('title')?.textContent || '';
            const link = entry.querySelector('link')?.getAttribute('href') || '';
            const published = entry.querySelector('published, updated')?.textContent || '';
            const summary = entry.querySelector('summary, content')?.textContent || '';
            
            if (title && link) {
                items.push({
                    title: cleanText(title),
                    link: link.trim(),
                    pubDate: published ? new Date(published).toLocaleString('it-IT') : '',
                    description: cleanText(summary),
                    source: sourceName,
                    timestamp: published ? new Date(published).getTime() : Date.now()
                });
            }
        });
    }
    
    return items;
}

function cleanText(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '')
               .replace(/\s+/g, ' ')
               .trim();
}

/* ==========================================
   FILTRAGGIO PER KEYWORD
   ========================================== */

function matchKeyword(text, keyword) {
    if (CONFIG.EXACT_MATCH) {
        // Match esatto: "Intesa Sanpaolo" non matcha "intesa"
        // Usa word boundary per evitare match parziali
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(text);
    } else {
        // Match parziale: "intesa" matcha anche "Intesa Sanpaolo"
        return text.toLowerCase().includes(keyword.toLowerCase());
    }
}

function filterByKeywords(newsItems) {
    if (keywords.length === 0) return newsItems;
    
    return newsItems.filter(item => {
        const searchText = item.title; // Solo titolo
        
        // Filtra eventuali elementi nella blacklist
        if (blacklist.some(term => searchText.toLowerCase().includes(term.toLowerCase()))) 
            return false;
        
        return keywords.some(kw => matchKeyword(searchText, kw.keyword));
    });
}

function groupByKeyword(newsItems) {
    const grouped = {};
    
    newsItems.forEach(item => {
        const searchText = item.title; // Solo titolo
        
      const addedGroups = new Set();

        keywords.forEach(kw => {
        if (matchKeyword(searchText, kw.keyword)) {
        const groupName = kw.group || kw.keyword;

        if (addedGroups.has(groupName)) return; // blocca duplicati nello stesso gruppo

        if (!grouped[groupName]) {
            grouped[groupName] = [];
        }

        grouped[groupName].push(item);
        addedGroups.add(groupName);
        }
        });


    });
    
    // Limita il numero di notizie per gruppo
    for (const group in grouped) {
        if (grouped[group].length > CONFIG.MAX_NEWS_PER_GROUP) {
            grouped[group] = grouped[group].slice(0, CONFIG.MAX_NEWS_PER_GROUP);
        }
    }
    
    return grouped;
}

/* ==========================================
   CARICAMENTO NOTIZIE PRINCIPALE
   ========================================== */

async function loadNews() {
    const loadBtn = document.getElementById('loadBtn');
    const newsContainer = document.getElementById('newsContainer');
    const statsTotal = document.getElementById('statsTotal');
    
    // Disabilita bottone e mostra loading
    loadBtn.disabled = true;
    loadBtn.innerHTML = '<span class="loading"></span> Caricamento in corso...';
    newsContainer.innerHTML = '<div class="status-message info">⏳ Recupero notizie dai feed RSS...</div>';
    
    try {
        // Carica configurazione se non già fatto
        if (feeds.length === 0) await loadFeeds();
        if (keywords.length === 0) await loadKeywords();
        
        allNews = [];
        let loadedCount = 0;
        
        // Carica tutti i feed in parallelo
        const promises = feeds.map(async (feed) => {
            try {
                const xmlText = await fetchWithFallback(feed.url);
                const items = parseRSS(xmlText, feed.name);
                return items;
            } catch (error) {
                console.error(`Errore feed ${feed.name}:`, error);
                return [];
            }
        });
        
        const results = await Promise.all(promises);
        
        // Unisci tutti i risultati
        results.forEach(items => {
            allNews.push(...items);
            loadedCount += items.length;
        });
        
        // Filtra per keyword
        allNews = filterByKeywords(allNews);
        
        // Filtra per tempo (solo notizie degli ultimi 48 ore)
        const now = Date.now();
        const timeLimit = CONFIG.TIME_FILTER_HOURS * 60 * 60 * 1000; // 48h in millisecondi
        allNews = allNews.filter(item => {
            if (!item.timestamp) return true; // Mantieni se non ha timestamp
            return (now - item.timestamp) <= timeLimit;
        });
        


  
        // Rimuovi duplicati basandosi su link e titolo
        const seen = new Set();
        allNews = allNews.filter(item => {
        // Creiamo una "chiave" unica normalizzando link e titolo
        const key = (item.link.split('?')[0] + '|' + item.title.trim().toLowerCase());
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
        });
        


        // Ordina per data (più recenti prima)
        allNews.sort((a, b) => b.timestamp - a.timestamp);
        
        // Aggiorna stats
        statsTotal.textContent = allNews.length;
        
        // Visualizza
        displayNews();
        
        showStatus(`✅ Caricate ${allNews.length} notizie uniche da ${feeds.length} fonti`, 'success');
        
    } catch (error) {
        console.error('Errore generale:', error);
        showStatus('❌ Errore nel caricamento delle notizie', 'error');
    } finally {
        loadBtn.disabled = false;
        loadBtn.innerHTML = '📰 Carica Notizie';
    }
}

/* ==========================================
   VISUALIZZAZIONE NOTIZIE 1/02/2026 12.25
   ========================================== */

function timeAgo(dateInput) {
    // Parsa il formato DD/MM/YYYY, HH:MM:SS
    const parts = dateInput.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
    if (!parts) return dateInput;

    const date = new Date(parts[3], parts[2] - 1, parts[1], parts[4], parts[5], parts[6]);
    const diffMs = Date.now() - date.getTime();

    if (isNaN(diffMs) || diffMs < 0) return dateInput;

    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Poco fa';
    if (diffMinutes < 60) return `${diffMinutes} min fa`;
    if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? 'ore' : 'ora'} fa`;
    if (diffDays < 7) return `${diffDays} giorno${diffDays > 1 ? 'i' : ''} fa`;

    const weeks = Math.floor(diffDays / 7);
    if (weeks < 4) return `${weeks} settimana${weeks > 1 ? 'ne' : ''} fa`;

    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function displayNews() {
    const newsContainer = document.getElementById('newsContainer');
    
    if (allNews.length === 0) {
        newsContainer.innerHTML = '<div class="status-message info">Nessuna notizia trovata</div>';
        return;
    }
    
    const grouped = groupByKeyword(allNews);
    const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'it'));
    
    let html = '';
    
    for (const group of sortedKeys) {
        const items = grouped[group];

        html += `<div class="news-group">
            <h2>${escapeHTML(group)} <span class="count">(${items.length})</span></h2>`;
        
        items.forEach(item => {
            html += `
                <div class="news-item">
                    <div class="news-title">${escapeHTML(item.title)}</div>
                    <a href="${escapeHTML(item.link)}" target="_blank" class="news-link">
                        🔗 ${escapeHTML(truncateUrl(item.link, 60))}
                    </a>
                    <div class="news-meta">
                        ${item.pubDate ? `<span>📅 ${escapeHTML(timeAgo(item.pubDate))}</span>` : ''}
                        <span class="news-source">${escapeHTML(item.source)}</span>
                    </div>
                </div>`;
        });
        
        html += '</div>';
    }
    
    newsContainer.innerHTML = html;
}

/* ==========================================
   UTILITY
   ========================================== */

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function truncateUrl(url, maxLength) {
    if (!url || url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

function showStatus(message, type = 'info') {
    const container = document.getElementById('newsContainer');
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message ${type}`;
    statusDiv.textContent = message;
    
    container.insertBefore(statusDiv, container.firstChild);
    
    setTimeout(() => statusDiv.remove(), 5000);
}

/* ==========================================
   INIZIALIZZAZIONE
   ========================================== */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Aggregatore Notizie Finanziarie avviato');
    
    // Pre-carica configurazione
    await loadFeeds();
    await loadKeywords();
    await loadBlacklist();
    
    // Event listener
    document.getElementById('loadBtn').addEventListener('click', loadNews);
    
    console.log('✓ Sistema pronto');
});
