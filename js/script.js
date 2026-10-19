let itens = [];
let dailyItem = null;
let guesses = [];
let gameWon = false;
let todayStr = '';

const STORAGE_KEY = 'museudle-progresso';
let feedbackTimeout = null;

// Format current date statically for the day (local time based)
function getTodayString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// Simple seeded PRNG to get the daily item based on date string
function getSeededRandom(seedString) {
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
        seed = seedString.charCodeAt(i) + ((seed << 5) - seed);
    }
    // Mulberry32
    return function() {
        var t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function init() {
    try {
        itens = itensData; // Load from local script
        setupDailyItem();
        populateDatalist();
        populateSidebar();
        setupEventListeners();
        restoreProgress();
    } catch (e) {
        console.error("Failed to initialize game", e);
    }
}

function setupDailyItem() {
    todayStr = getTodayString();
    const rng = getSeededRandom(todayStr);
    const index = Math.floor(rng() * itens.length);
    dailyItem = itens[index];
}

function populateDatalist() {
    const datalist = document.getElementById('guess-datalist');
    itens.forEach(item => {
        const option = document.createElement('option');
        option.value = item.Nome;
        datalist.appendChild(option);
    });
}

function populateSidebar() {
    const list = document.getElementById('available-items-list');
    if (!list) return;
    const sorted = [...itens].sort((a, b) => a.Nome.localeCompare(b.Nome));
    sorted.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.Nome;
        li.dataset.nome = item.Nome;
        li.title = "Clique para usar como palpite";
        li.addEventListener('click', () => {
            const input = document.getElementById('guess-input');
            input.value = item.Nome;
            handleGuess();
        });
        list.appendChild(li);
    });
}

function showArtifactInfo() {
    document.getElementById('modal-primary-content').classList.add('hidden');
    document.getElementById('modal-secondary-content').classList.remove('hidden');
    
    document.getElementById('info-nome').textContent = dailyItem.Nome;
    document.getElementById('info-categoria').textContent = dailyItem.Categoria;
    document.getElementById('info-ano').textContent = dailyItem.Ano;
    document.getElementById('info-criador').textContent = dailyItem["Criador/Empresa"];
    
    const searchLink = document.getElementById('info-search-link');
    if (dailyItem.Link) {
        searchLink.href = dailyItem.Link;
        if (dailyItem.Link.includes("tainacan.facom.ufu.br")) {
            searchLink.textContent = "Ver no Acervo (Tainacan)";
        } else {
            searchLink.textContent = "Saber mais sobre o item";
        }
        searchLink.style.backgroundColor = "var(--verde)";
    } else {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(dailyItem.Nome + " computação história")}`;
        searchLink.href = searchUrl;
        searchLink.textContent = "Pesquisar no Google";
        searchLink.style.backgroundColor = "var(--amarelo)";
    }
}

function hideArtifactInfo() {
    document.getElementById('modal-secondary-content').classList.add('hidden');
    document.getElementById('modal-primary-content').classList.remove('hidden');
}

function setupEventListeners() {
    const btn = document.getElementById('submit-btn');
    const input = document.getElementById('guess-input');
    const closeBtn = document.getElementById('close-modal-btn');
    const saibaMaisBtn = document.getElementById('saiba-mais-btn');
    const backBtn = document.getElementById('back-modal-btn');

    btn.addEventListener('click', handleGuess);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGuess();
    });
    
    closeBtn.addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        hideArtifactInfo();
    });

    if (saibaMaisBtn) saibaMaisBtn.addEventListener('click', showArtifactInfo);
    if (backBtn) backBtn.addEventListener('click', hideArtifactInfo);
    
    // Select input on load
    input.focus();
}

function handleGuess() {
    if (gameWon) {
        showGameOverModal(true, false);
        return;
    }

    const input = document.getElementById('guess-input');
    const guessName = input.value.trim();
    if (!guessName) return;

    const guessItem = itens.find(i => i.Nome.toLowerCase() === guessName.toLowerCase());
    if (!guessItem) {
        showFeedback("Artefato não encontrado no museu. Escolha um item da lista de sugestões.");
        return;
    }

    // Check if already guessed
    if (guesses.find(g => g.Nome.toLowerCase() === guessItem.Nome.toLowerCase())) {
        showFeedback("Você já analisou este artefato hoje.");
        input.value = '';
        return;
    }

    guesses.push(guessItem);
    saveProgress();
    clearFeedback();

    const isCorrect = guessItem.Nome.toLowerCase() === dailyItem.Nome.toLowerCase();
    markSidebarItem(guessItem, isCorrect);

    renderRow(guessItem, true);
    updateSidebar();
    input.value = '';
    input.focus();

    if (guessItem.Nome.toLowerCase() === dailyItem.Nome.toLowerCase()) {
        gameWon = true;
        setTimeout(() => showGameOverModal(true, true), 2400); // Wait for animations
    }
}

function checkCreator(guessCreator, dailyCreator) {
    if (guessCreator === dailyCreator) return 'verde';
    if (guessCreator === 'N/A' || dailyCreator === 'N/A') return 'cinza';
    
    const gParts = guessCreator.split('/').map(s => s.trim());
    const dParts = dailyCreator.split('/').map(s => s.trim());
    
    const overlap = gParts.filter(p => dParts.includes(p));
    if (overlap.length > 0) return 'amarelo';
    
    return 'cinza';
}

function updateSidebar() {
    const listItems = document.querySelectorAll('#available-items-list li');
    
    listItems.forEach(li => {
        const itemName = li.dataset.nome;
        const itemObj = itens.find(i => i.Nome === itemName);
        if (!itemObj) return;

        let possible = true;

        for (const g of guesses) {
            // Categoria
            if (g.Categoria === dailyItem.Categoria) {
                if (itemObj.Categoria !== g.Categoria) possible = false;
            } else {
                if (itemObj.Categoria === g.Categoria) possible = false;
            }

            // Ano
            if (g.Ano === dailyItem.Ano) {
                if (itemObj.Ano !== g.Ano) possible = false;
            } else if (g.Ano < dailyItem.Ano) {
                if (itemObj.Ano <= g.Ano) possible = false;
            } else if (g.Ano > dailyItem.Ano) {
                if (itemObj.Ano >= g.Ano) possible = false;
            }
            
            // Criador/Empresa
            if (g["Criador/Empresa"] === dailyItem["Criador/Empresa"]) {
                if (itemObj["Criador/Empresa"] !== g["Criador/Empresa"]) possible = false;
            }
        }

        if (!possible && !li.classList.contains('guessed-wrong') && !li.classList.contains('guessed-correct')) {
            li.classList.add('eliminated');
        }
    });
}

function renderRow(guessItem, animate = true) {
    const grid = document.getElementById('guesses-grid');
    const row = document.createElement('div');
    row.className = 'guess-row';

    const cols = [
        { label: guessItem.Nome, color: (guessItem.Nome === dailyItem.Nome) ? 'verde' : 'cinza' },
        { label: guessItem.Categoria, color: (guessItem.Categoria === dailyItem.Categoria) ? 'verde' : 'cinza' }
    ];

    // Ano validation
    let anoColor = 'cinza';
    let anoLabel = guessItem.Ano;
    if (guessItem.Ano === dailyItem.Ano) {
        anoColor = 'verde';
    } else if (guessItem.Ano < dailyItem.Ano) {
        anoLabel += ' ⬆️';
    } else {
        anoLabel += ' ⬇️';
    }
    cols.push({ label: anoLabel, color: anoColor });

    // Criador validation
    const criadorColor = checkCreator(guessItem["Criador/Empresa"], dailyItem["Criador/Empresa"]);
    cols.push({ label: guessItem["Criador/Empresa"], color: criadorColor });

    cols.forEach((col, idx) => {
        const cardContainer = document.createElement('div');
        cardContainer.className = `guess-card-container ${col.color}`;
        
        const card = document.createElement('div');
        card.className = 'guess-card';
        ['card-front', 'card-back'].forEach(side => {
            const face = document.createElement('div');
            face.className = `card-face ${side}`;
            face.textContent = col.label;
            card.appendChild(face);
        });
        cardContainer.appendChild(card);

        row.appendChild(cardContainer);
        if (animate) {
            setTimeout(() => {
                card.classList.add('flipped');
            }, idx * 400); // Staggered flip
        } else {
            // No animation for loaded state
            card.style.transition = 'none';
            card.classList.add('flipped');
            // Flush layout and restore transition
            card.offsetHeight; 
            card.style.transition = '';
        }
    });

    // Make newest guesses appear at the top
    grid.prepend(row);
}

let countdownInterval = null;

function showGameOverModal(won, animate) {
    const modal = document.getElementById('game-over-modal');
    const title = document.getElementById('modal-title');
    const msg = document.getElementById('modal-message');
    
    title.textContent = "Parabéns!";
    title.style.color = "var(--verde)";
    msg.innerHTML = `Você revelou o artefato de hoje:<br><strong>${dailyItem.Nome}</strong><br><br>Tentativas: ${guesses.length}`;
    
    modal.classList.remove('hidden');
    
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date();
    // Next day at 00:00:00
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow - now;
    
    if (diff <= 0) {
        // Force refresh if it passes midnight while viewing
        window.location.reload();
        return;
    }
    
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        countdownEl.textContent = 
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
}

// ---------- Progresso do dia (localStorage) ----------
// Salva os palpites do dia para que o jogador não perca o progresso ao recarregar a página.
function saveProgress() {
    try {
        const data = { data: todayStr, palpites: guesses.map(g => g.Nome) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        // Navegação privada ou armazenamento bloqueado: o jogo continua funcionando sem salvar
    }
}

function restoreProgress() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
        return;
    }
    // Progresso de outro dia é descartado
    if (!saved || saved.data !== todayStr || !Array.isArray(saved.palpites)) return;

    saved.palpites.forEach(nome => {
        const item = itens.find(i => i.Nome === nome);
        if (!item || guesses.includes(item)) return;
        guesses.push(item);
        const isCorrect = item.Nome === dailyItem.Nome;
        markSidebarItem(item, isCorrect);
        renderRow(item, false);
        if (isCorrect) gameWon = true;
    });
    updateSidebar();

    if (gameWon) showGameOverModal(true, false);
}

function markSidebarItem(item, isCorrect) {
    const listItems = document.querySelectorAll('#available-items-list li');
    listItems.forEach(li => {
        if (li.dataset.nome === item.Nome) {
            li.classList.add(isCorrect ? 'guessed-correct' : 'guessed-wrong');
        }
    });
}

// ---------- Mensagens na tela ----------
function showFeedback(message) {
    const el = document.getElementById('feedback');
    if (!el) return;
    el.textContent = message;
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(clearFeedback, 4000);
}

function clearFeedback() {
    const el = document.getElementById('feedback');
    if (el) el.textContent = '';
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
