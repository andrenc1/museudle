let itens = [];
let dailyItem = null;
let guesses = [];
let gameWon = false;

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

async function init() {
    try {
        const response = await fetch('data/itens.json');
        itens = await response.json();
        setupDailyItem();
        populateDatalist();
        loadState();
        setupEventListeners();
    } catch (e) {
        console.error("Failed to load itens.json", e);
    }
}

function setupDailyItem() {
    const todayStr = getTodayString();
    const rng = getSeededRandom(todayStr);
    const index = Math.floor(rng() * itens.length);
    dailyItem = itens[index];
    console.log("Daily Item (Debug):", dailyItem.Nome);
}

function populateDatalist() {
    const datalist = document.getElementById('guess-datalist');
    itens.forEach(item => {
        const option = document.createElement('option');
        option.value = item.Nome;
        datalist.appendChild(option);
    });
}

function loadState() {
    const todayStr = getTodayString();
    const saved = localStorage.getItem('museudle_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            if (state.date === todayStr) {
                guesses = state.guesses || [];
                guesses.forEach(guessObj => renderRow(guessObj, false));
                
                if (guesses.length > 0) {
                    const lastGuess = guesses[guesses.length - 1];
                    if (lastGuess.Nome.toLowerCase() === dailyItem.Nome.toLowerCase()) {
                        gameWon = true;
                        showGameOverModal(true, false);
                    }
                }
            } else {
                localStorage.removeItem('museudle_state');
            }
        } catch (e) {
            localStorage.removeItem('museudle_state');
        }
    }
}

function saveState() {
    const state = {
        date: getTodayString(),
        guesses: guesses
    };
    localStorage.setItem('museudle_state', JSON.stringify(state));
}

function setupEventListeners() {
    const btn = document.getElementById('submit-btn');
    const input = document.getElementById('guess-input');
    const closeBtn = document.getElementById('close-modal-btn');

    btn.addEventListener('click', handleGuess);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGuess();
    });
    
    closeBtn.addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
    });
    
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
        alert("Artefato não encontrado no museu. Verifique a lista de sugestões.");
        return;
    }

    // Check if already guessed
    if (guesses.find(g => g.Nome.toLowerCase() === guessItem.Nome.toLowerCase())) {
        alert("Você já analisou este artefato hoje.");
        input.value = '';
        return;
    }

    guesses.push(guessItem);
    saveState();
    
    renderRow(guessItem, true);
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
        
        cardContainer.innerHTML = `
            <div class="guess-card">
                <div class="card-face card-front">${col.label}</div>
                <div class="card-face card-back">${col.label}</div>
            </div>
        `;

        row.appendChild(cardContainer);

        const card = cardContainer.querySelector('.guess-card');
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
