const wordsList = [
    "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "i", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

let CONFIG = {
    mode: 'time', // 'time' or 'words'
    value: 30, // 30/60 seconds or 25/50 words
    wordCount: 100 // Default buffer for time mode
};

// Persistent storage for mistakes across sessions
let mistakeHistory = { characters: {}, words: {} };
let keyStats = {}; // { "a": { total: 0, wrong: 0 } }
window.keyStats = keyStats; // Expose for verification

let state = {
    words: [],
    wordIndex: 0,
    charIndex: 0,
    startTime: null,
    timeElapsed: 0,
    timeRemaining: 30,
    timer: null,
    isTyping: false,
    correctChars: 0,
    incorrectChars: 0,
    totalCharsTyped: 0
};

// DOM Elements
const wordsDiv = document.getElementById('words');
const timerEl = document.getElementById('timer');
const modeSelect = document.getElementById('mode-select');
const hiddenInput = document.getElementById('hidden-input');
const caret = document.getElementById('caret');
const resultOverlay = document.getElementById('result-overlay');
const restartBtn = document.getElementById('restart-btn');
const wpmEl = document.getElementById('wpm');
const accEl = document.getElementById('acc');
const errorsEl = document.getElementById('errors');

// --- Helper Functions ---

function parseMode() {
    const val = modeSelect.value;

    if (val === 'weak-words') {
        CONFIG.mode = 'weak';
        CONFIG.value = 25; // Default to 25 words for weak mode
        CONFIG.wordCount = 25;
    } else {
        const parts = val.split('-');
        CONFIG.mode = parts[0];
        CONFIG.value = parseInt(parts[1]);

        if (CONFIG.mode === 'time') {
            CONFIG.wordCount = 100; // Buffer
        } else {
            CONFIG.wordCount = CONFIG.value; // Exact count
        }
    }
}

function generateWords() {
    if (CONFIG.mode === 'weak') {
        const sortedWords = Object.entries(mistakeHistory.words)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        let list = [];

        for (let w of sortedWords) {
            if (list.length >= CONFIG.wordCount) break;
            list.push(w);
        }

        while (list.length < CONFIG.wordCount) {
            list.push(wordsList[Math.floor(Math.random() * wordsList.length)]);
        }

        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }

        return list;
    }

    const list = [];
    for (let i = 0; i < CONFIG.wordCount; i++) {
        list.push(wordsList[Math.floor(Math.random() * wordsList.length)]);
    }
    return list;
}

function renderWords() {
    wordsDiv.innerHTML = '';
    state.words.forEach((word) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        word.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.className = 'letter';
            charSpan.innerText = char;
            wordDiv.appendChild(charSpan);
        });
        wordsDiv.appendChild(wordDiv);
    });

    if (wordsDiv.children.length > 0 && wordsDiv.children[0].children.length > 0) {
        wordsDiv.children[0].children[0].classList.add('active');
    }
}

function resetTest() {
    clearInterval(state.timer);
    parseMode();

    state = {
        words: generateWords(),
        wordIndex: 0,
        charIndex: 0,
        startTime: null,
        timeElapsed: 0,
        timeRemaining: CONFIG.mode === 'time' ? CONFIG.value : 0,
        timer: null,
        isTyping: false,
        correctChars: 0,
        incorrectChars: 0,
        totalCharsTyped: 0
    };

    timerEl.innerText = CONFIG.mode === 'time' ? state.timeRemaining : 0;
    wpmEl.innerText = '0';
    accEl.innerText = '100%';
    errorsEl.innerText = '0';
    document.getElementById('insights').innerHTML = ''; // Clear insights on reset

    resultOverlay.classList.add('hidden');
    hiddenInput.value = '';
    hiddenInput.focus();
    renderWords();
    updateCaretPosition();
}

function startTest() {
    if (!state.isTyping) {
        state.isTyping = true;
        state.startTime = Date.now();
        state.timer = setInterval(() => {
            if (CONFIG.mode === 'time') {
                state.timeRemaining--;
                timerEl.innerText = state.timeRemaining;
                if (state.timeRemaining <= 0) {
                    endGame();
                }
            } else {
                state.timeElapsed++;
                timerEl.innerText = state.timeElapsed;
            }
            updateStats();
        }, 1000);
    }
}

function calculateWPM() {
    let timeInMinutes;
    if (CONFIG.mode === 'time') {
        timeInMinutes = (CONFIG.value - state.timeRemaining) / 60;
    } else {
        const now = Date.now();
        const diffSec = (now - state.startTime) / 1000;
        timeInMinutes = diffSec / 60;
    }
    return Math.round((state.correctChars / 5) / (timeInMinutes || 0.001));
}

function calculateAccuracy() {
    return state.totalCharsTyped > 0 ? Math.round((state.correctChars / state.totalCharsTyped) * 100) : 100;
}

function updateStats() {
    const wpm = calculateWPM();
    const acc = calculateAccuracy();

    wpmEl.innerText = wpm;
    accEl.innerText = acc + '%';
    errorsEl.innerText = state.incorrectChars;
}

function handleInput(e) {
    const key = e.key;

    if (key === 'Tab') {
        e.preventDefault();
        resetTest();
        return;
    }

    if (!resultOverlay.classList.contains('hidden')) {
        if (key === 'Enter') resetTest();
        return;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (key.length !== 1 && key !== 'Backspace' && key !== ' ') return;

    if (!state.isTyping) {
        startTest();
    }

    e.preventDefault();

    const currentWordDiv = wordsDiv.children[state.wordIndex];
    if (!currentWordDiv) return;

    const currentWordStr = state.words[state.wordIndex];

    if (key === 'Backspace') {
        if (state.charIndex > 0) {
            state.charIndex--;
            const charSpan = currentWordDiv.children[state.charIndex];
            if (charSpan.classList.contains('correct')) state.correctChars--;
            if (charSpan.classList.contains('incorrect')) state.incorrectChars--;
            charSpan.className = 'letter';
        }
    } else if (key === ' ') {
        if (CONFIG.mode === 'words' && state.wordIndex === CONFIG.wordCount - 1) {
            endGame();
            return;
        }
        if (CONFIG.mode === 'weak' && state.wordIndex === CONFIG.wordCount - 1) {
            endGame();
            return;
        }

        state.wordIndex++;
        state.charIndex = 0;

        if (state.wordIndex >= state.words.length) {
            if (CONFIG.mode === 'words' || CONFIG.mode === 'weak') {
                endGame();
            }
            return;
        }
    } else {
        if (state.charIndex < currentWordDiv.children.length) {
            const charSpan = currentWordDiv.children[state.charIndex];

            // Track Key Stats
            if (!keyStats[key]) keyStats[key] = { total: 0, wrong: 0 };
            keyStats[key].total++;

            if (key === currentWordStr[state.charIndex]) {
                charSpan.classList.add('correct');
                state.correctChars++;
            } else {
                charSpan.classList.add('incorrect');
                state.incorrectChars++;

                // Track Key Wrong
                keyStats[key].wrong++;

                // Track Mistakes (Global)
                const targetChar = currentWordStr[state.charIndex];
                if (targetChar) {
                    mistakeHistory.characters[targetChar] = (mistakeHistory.characters[targetChar] || 0) + 1;
                }
                mistakeHistory.words[currentWordStr] = (mistakeHistory.words[currentWordStr] || 0) + 1;
            }
            state.charIndex++;
            state.totalCharsTyped++;

            if ((CONFIG.mode === 'words' || CONFIG.mode === 'weak') &&
                state.wordIndex === CONFIG.wordCount - 1 &&
                state.charIndex === currentWordDiv.children.length) {
                endGame();
                return;
            }
        }
    }

    updateStats();
    updateCaretPosition();
}

function updateCaretPosition() {
    const currentWordDiv = wordsDiv.children[state.wordIndex];
    if (currentWordDiv) {
        const containerRect = wordsDiv.parentElement.getBoundingClientRect();
        let targetRect;

        if (state.charIndex < currentWordDiv.children.length) {
            const charSpan = currentWordDiv.children[state.charIndex];
            targetRect = charSpan.getBoundingClientRect();
        } else {
            const lastChar = currentWordDiv.children[currentWordDiv.children.length - 1];
            if (lastChar) {
                const rect = lastChar.getBoundingClientRect();
                targetRect = {
                    left: rect.right,
                    top: rect.top,
                    height: rect.height
                };
            } else {
                // Should not happen for non-empty word
                const rect = currentWordDiv.getBoundingClientRect();
                targetRect = { left: rect.left, top: rect.top, height: 24 }; // Fallback
            }
        }

        caret.style.left = (targetRect.left - containerRect.left) + 'px';
        caret.style.top = (targetRect.top - containerRect.top) + 'px';
    }
}

// Session History
let sessionHistory = [];
window.sessionHistory = sessionHistory;

function generateInsights() {
    const lines = [];

    // 1. Top Key Errors
    const topKeys = Object.entries(mistakeHistory.characters)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

    if (topKeys.length > 0) {
        lines.push(`Most errors on: ${topKeys.join(', ')}`);
    }

    // 2. Weak Words
    const weakWords = Object.entries(mistakeHistory.words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

    if (weakWords.length > 0) {
        lines.push(`Weak words: ${weakWords.join(', ')}`);
    }

    // 3. Trend
    if (sessionHistory.length >= 2) {
        const currentParams = sessionHistory[sessionHistory.length - 1];
        const prevSessions = sessionHistory.slice(Math.max(0, sessionHistory.length - 6), sessionHistory.length - 1);

        if (prevSessions.length > 0) {
            const avgAcc = prevSessions.reduce((sum, s) => sum + s.accuracy, 0) / prevSessions.length;
            const diff = currentParams.accuracy - avgAcc;

            if (diff >= 5) {
                lines.push("Accuracy is significantly up!");
            } else if (diff <= -5) {
                lines.push("Accuracy dropped compared to recent average.");
            }
        }
    }

    return lines.join('<br>');
}

window.endGame = endGame;

function endGame() {
    clearInterval(state.timer);
    state.isTyping = false;

    const wpm = calculateWPM();
    const acc = calculateAccuracy();

    let duration;
    if (CONFIG.mode === 'time') {
        duration = CONFIG.value - Math.max(0, state.timeRemaining);
    } else {
        duration = state.timeElapsed;
    }

    const session = {
        wpm: wpm,
        accuracy: acc,
        errors: state.incorrectChars,
        duration: duration,
        timestamp: Date.now()
    };

    sessionHistory.push(session);
    if (sessionHistory.length > 10) {
        sessionHistory.shift();
    }

    const insightsHtml = generateInsights();
    document.getElementById('insights').innerHTML = insightsHtml;

    resultOverlay.classList.remove('hidden');
    hiddenInput.blur();
}

// Event Listeners
hiddenInput.addEventListener('keydown', handleInput);

document.addEventListener('click', (e) => {
    if (e.target === modeSelect) return;
    if (resultOverlay.classList.contains('hidden')) {
        hiddenInput.focus();
    }
});

modeSelect.addEventListener('change', () => {
    resetTest();
    hiddenInput.focus();
});

restartBtn.addEventListener('click', resetTest);
window.addEventListener('resize', updateCaretPosition);

// Init
resetTest();
