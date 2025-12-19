const wordsList = [
    "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "i", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

const banglaWords = [
    "আমি", "তুমি", "সে", "আমরা", "তারা", "কি", "কেন", "কোথায়", "কখন", "এখন",
    "বাংলাদেশ", "ভাষা", "যুদ্ধ", "কীবোর্ড", "কম্পিউটার", "বিজ্ঞান", "প্রযুক্তি", "জীবন",
    "মানুষ", "সময়", "কাজ", "নতুন", "সুন্দর", "ভালো", "খারাপ", "দিন", "রাত",
    "সূর্য", "চাঁদ", "আকাশ", "জল", "নদী", "পাহাড়", "প্রকৃতি"
];

const banglaEngine = new window.BanglaPhoneticEngine();
window.banglaEngine = banglaEngine; // Verify access

var CONFIG = {
    mode: 'time', // 'time', 'words', or 'bangla'
    value: 30, // 30/60 seconds or 25/50 words
    wordCount: 100, // Default buffer for time mode
    language: 'english' // 'english' or 'bangla'
};
window.CONFIG = CONFIG; // Expose for debugging

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
    totalCharsTyped: 0,
    keystrokeLog: [],
    phoneticBuffer: '', // Stores raw English input for current word in Bangla mode
    convertedBuffer: '' // Stores converted Bangla text for current word
};

// Keyboard Data
const KEYBOARD_LAYOUT = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

const KEY_FINGER_MAP = {
    // Left Hand
    'q': { hand: 'Left', finger: 'Pinky' }, 'a': { hand: 'Left', finger: 'Pinky' }, 'z': { hand: 'Left', finger: 'Pinky' },
    'w': { hand: 'Left', finger: 'Ring' }, 's': { hand: 'Left', finger: 'Ring' }, 'x': { hand: 'Left', finger: 'Ring' },
    'e': { hand: 'Left', finger: 'Middle' }, 'd': { hand: 'Left', finger: 'Middle' }, 'c': { hand: 'Left', finger: 'Middle' },
    'r': { hand: 'Left', finger: 'Index' }, 'f': { hand: 'Left', finger: 'Index' }, 'v': { hand: 'Left', finger: 'Index' },
    't': { hand: 'Left', finger: 'Index' }, 'g': { hand: 'Left', finger: 'Index' }, 'b': { hand: 'Left', finger: 'Index' },

    // Right Hand
    'y': { hand: 'Right', finger: 'Index' }, 'h': { hand: 'Right', finger: 'Index' }, 'n': { hand: 'Right', finger: 'Index' },
    'u': { hand: 'Right', finger: 'Index' }, 'j': { hand: 'Right', finger: 'Index' }, 'm': { hand: 'Right', finger: 'Index' },
    'i': { hand: 'Right', finger: 'Middle' }, 'k': { hand: 'Right', finger: 'Middle' },
    'o': { hand: 'Right', finger: 'Ring' }, 'l': { hand: 'Right', finger: 'Ring' },
    'p': { hand: 'Right', finger: 'Pinky' },

    // Thumbs
    ' ': { hand: 'Thumb', finger: 'Thumb' }
};

function renderKeyboard() {
    const keyboardDiv = document.getElementById('visual-keyboard');
    keyboardDiv.innerHTML = '';

    KEYBOARD_LAYOUT.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.id = `key-${key}`;
            keyDiv.innerText = key;
            rowDiv.appendChild(keyDiv);
        });
        keyboardDiv.appendChild(rowDiv);
    });
}

function updateKeyboardHeatmap() {
    KEYBOARD_LAYOUT.flat().forEach(key => {
        const keyEl = document.getElementById(`key-${key}`);
        if (!keyEl) return;

        keyEl.classList.remove('key-high', 'key-mid', 'key-low');

        const stats = keyStats[key];
        if (stats && stats.total > 0) {
            const accuracy = (stats.total - stats.wrong) / stats.total;
            if (accuracy >= 0.9) {
                keyEl.classList.add('key-high');
            } else if (accuracy >= 0.7) {
                keyEl.classList.add('key-mid');
            } else {
                keyEl.classList.add('key-low');
            }
        }
    });
}

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
let langEnBtn;
let langBnBtn;

// --- Helper Functions ---

function parseMode() {
    const val = modeSelect.value;

    // Config language is now handled separately via toggle
    // Unless we want 'weak-words' to force English?
    // Let's keep language independent unless weak-words has no Bangla support (for now)

    if (val === 'weak-words') {
        CONFIG.mode = 'weak';
        CONFIG.value = 25;
        CONFIG.wordCount = 25;
        // Force English for weak words for now as tracking is language specfic?
        // Or just let it try? Mistake history has "words".
        // If I switch to Bangla, I won't have matched Bangla words in history yet.
        // Let's leave LANGUAGE as is, but if Weak Mode selected in Bangla, 
        // it might show nothing if no history.
    } else {
        const parts = val.split('-');
        CONFIG.mode = parts[0];
        CONFIG.value = parseInt(parts[1]);

        if (CONFIG.mode === 'time') {
            CONFIG.wordCount = 100;
        } else {
            CONFIG.wordCount = CONFIG.value;
        }
    }
}

function setLanguage(lang) {
    window.CONFIG.language = lang;
    if (lang === 'bangla') {
        langEnBtn.classList.remove('active');
        langBnBtn.classList.add('active');
    } else {
        langBnBtn.classList.remove('active');
        langEnBtn.classList.add('active');
    }
    resetTest();
    hiddenInput.focus();
}

function generateWords() {
    if (CONFIG.language === 'bangla') {
        const list = [];
        for (let i = 0; i < CONFIG.wordCount; i++) {
            list.push(banglaWords[Math.floor(Math.random() * banglaWords.length)]);
        }
        return list;
    }

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
        completedCorrectChars: 0,
        completedIncorrectChars: 0,
        totalCharsTyped: 0,
        keystrokeLog: [],
        phoneticBuffer: '',
        convertedBuffer: ''
    };

    timerEl.innerText = CONFIG.mode === 'time' ? state.timeRemaining : 0;
    wpmEl.innerText = '0';
    accEl.innerText = '100%';
    errorsEl.innerText = '0';
    document.getElementById('insights').innerHTML = '';

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
        if (CONFIG.language === 'bangla') {
            if (state.phoneticBuffer.length > 0) {
                state.phoneticBuffer = state.phoneticBuffer.slice(0, -1);
                // Trigger re-conversion logic via fake recursion or refactoring
                // For now, simpler to just copy the conversion logic here or extract it function.
                // Let's DRY this by extracting "processBanglaInput"

                // ...Actually, simpler inline for now to avoid refactoring huge blocks.
                const converted = banglaEngine.convert(state.phoneticBuffer);
                state.convertedBuffer = converted;
                state.charIndex = converted.length;

                const currentWordStr = state.words[state.wordIndex];
                const currentWordDiv = wordsDiv.children[state.wordIndex];
                Array.from(currentWordDiv.children).forEach(span => span.className = 'letter');

                const len = Math.min(converted.length, currentWordStr.length);
                let matchLen = 0;
                for (let i = 0; i < len; i++) {
                    const span = currentWordDiv.children[i];
                    if (converted[i] === currentWordStr[i]) {
                        span.classList.add('correct');
                        matchLen++;
                    } else {
                        span.classList.add('incorrect');
                    }
                }

                const mismatchLen = converted.length - matchLen;
                state.correctChars = state.completedCorrectChars + matchLen;
                state.incorrectChars = state.completedIncorrectChars + mismatchLen;
            }
        } else {
            if (state.charIndex > 0) {
                state.charIndex--;
                const charSpan = currentWordDiv.children[state.charIndex];
                if (charSpan.classList.contains('correct')) state.correctChars--;
                if (charSpan.classList.contains('incorrect')) state.incorrectChars--;
                charSpan.className = 'letter';
            }
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

        if (CONFIG.language === 'bangla') {
            // Calculate final correctness for the completed word
            const currentWordStr = state.words[state.wordIndex];
            const converted = state.convertedBuffer;
            let matchLen = 0;
            const len = Math.min(converted.length, currentWordStr.length);
            for (let i = 0; i < len; i++) {
                if (converted[i] === currentWordStr[i]) matchLen++;
            }
            const mismatchLen = converted.length - matchLen;

            state.completedCorrectChars += matchLen;
            state.completedIncorrectChars += mismatchLen;

            state.phoneticBuffer = '';
            state.convertedBuffer = '';
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
        if (CONFIG.language === 'bangla') {
            // Bangla Phonetic Mode Logic

            // 1. Process Input into Buffer
            state.phoneticBuffer += key;

            // 2. Convert Buffer to Bangla
            const converted = banglaEngine.convert(state.phoneticBuffer);
            state.convertedBuffer = converted;

            // 3. Compare with Target
            const currentWordStr = state.words[state.wordIndex];
            const currentWordDiv = wordsDiv.children[state.wordIndex];

            // Reset highlighting for this word
            Array.from(currentWordDiv.children).forEach(span => span.className = 'letter');

            let matchLen = 0;
            const len = Math.min(converted.length, currentWordStr.length);

            for (let i = 0; i < len; i++) {
                const charSpan = currentWordDiv.children[i];
                if (converted[i] === currentWordStr[i]) {
                    charSpan.classList.add('correct');
                    matchLen++;
                } else {
                    charSpan.classList.add('incorrect');
                }
            }

            // Handle overflow (converted longer than target)
            if (converted.length > currentWordStr.length) {
                // Could act as incorrect chars. For now, visual feedback stops at word end.
                // Or we could mark the last char as incorrect or add extra feedback.
                // Simple approach: Just mark last char incorrect if overflow.
            }

            // Sync charIndex for cursor and logic
            state.charIndex = converted.length;

            // Update Stats
            const mismatchLen = converted.length - matchLen;
            state.correctChars = state.completedCorrectChars + matchLen;
            state.incorrectChars = state.completedIncorrectChars + mismatchLen;
        } else {
            // Standard Character-by-Character Logic
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
            }
        }

        state.totalCharsTyped++;

        // Shared Logic for End of Word (Bangla needs specific check)
        if (CONFIG.language === 'bangla') {
            // Check if word is complete?
            // Usually we wait for Space.
            // Logic handled in Space block (line 294).
        } else {
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
                const rect = currentWordDiv.getBoundingClientRect();
                targetRect = { left: rect.left, top: rect.top, height: 24 };
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

    // 3. Hand & Finger Analysis
    let handStats = { 'Left': { total: 0, wrong: 0 }, 'Right': { total: 0, wrong: 0 } };
    let fingerStats = {};

    Object.keys(keyStats).forEach(key => {
        const stats = keyStats[key];
        if (!stats || stats.total < 1) return;

        const map = KEY_FINGER_MAP[key.toLowerCase()];
        if (map) {
            // Hand Stats (ignore Thumbs for L/R comparison)
            if (map.hand === 'Left' || map.hand === 'Right') {
                handStats[map.hand].total += stats.total;
                handStats[map.hand].wrong += stats.wrong;
            }

            // Finger Stats
            const fingerName = map.finger === 'Thumb' ? 'Thumb' : `${map.hand} ${map.finger}`;
            if (!fingerStats[fingerName]) fingerStats[fingerName] = { total: 0, wrong: 0 };
            fingerStats[fingerName].total += stats.total;
            fingerStats[fingerName].wrong += stats.wrong;
        }
    });

    // Generate Hand Insight
    const leftTotal = handStats['Left'].total;
    const rightTotal = handStats['Right'].total;

    // Reduced threshold for easier testing
    if (leftTotal > 5 && rightTotal > 5) {
        const leftAcc = (leftTotal - handStats['Left'].wrong) / leftTotal;
        const rightAcc = (rightTotal - handStats['Right'].wrong) / rightTotal;
        const diff = Math.abs(leftAcc - rightAcc);

        if (diff > 0.05) { // 5% difference threshold
            const diffPct = Math.round(diff * 100);
            if (leftAcc < rightAcc) {
                lines.push(`Left hand accuracy is ${diffPct}% lower than right hand.`);
            } else {
                lines.push(`Right hand accuracy is ${diffPct}% lower than left hand.`);
            }
        }
    }

    // Generate Weakest Finger Insight
    let weakestFinger = null;
    let minAcc = 1.0;

    Object.entries(fingerStats).forEach(([finger, stats]) => {
        if (stats.total > 5) { // Reduced threshold
            const acc = (stats.total - stats.wrong) / stats.total;
            if (acc < minAcc) {
                minAcc = acc;
                weakestFinger = finger;
            }
        }
    });

    if (weakestFinger && minAcc < 0.95) {
        lines.push(`${weakestFinger} finger shows the highest error rate.`);
    }

    // 4. Fatigue Analysis (Time Segments)
    if (state.keystrokeLog.length > 20) {
        const totalDuration = state.keystrokeLog[state.keystrokeLog.length - 1].time;
        const halfDuration = totalDuration / 2;

        const firstHalf = state.keystrokeLog.filter(k => k.time <= halfDuration);
        const secondHalf = state.keystrokeLog.filter(k => k.time > halfDuration);

        const calcAcc = (log) => {
            if (log.length === 0) return 0;
            const correct = log.filter(k => k.isCorrect).length;
            return correct / log.length;
        };

        const acc1 = calcAcc(firstHalf);
        const acc2 = calcAcc(secondHalf);

        if ((acc1 - acc2) > 0.05) { // 5% drop
            lines.push("Accuracy drops significantly in the second half.");
        }

        // 40s Threshold
        if (totalDuration > 40000) { // 40 seconds
            const earlyPart = state.keystrokeLog.filter(k => k.time <= 40000);
            const latePart = state.keystrokeLog.filter(k => k.time > 40000);

            const accEarly = calcAcc(earlyPart);
            const accLate = calcAcc(latePart);

            if ((accEarly - accLate) > 0.05) {
                lines.push("Accuracy drops after 40 seconds — consider shorter practice sessions.");
            }
        }
    }

    // 5. Trend
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

    // Populate Result Overlay Stats
    document.getElementById('result-wpm').innerText = wpm;
    document.getElementById('result-acc').innerText = acc + '%';
    document.getElementById('result-errors').innerText = state.incorrectChars;

    updateKeyboardHeatmap(); // Update visual keyboard

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
function init() {
    langEnBtn = document.getElementById('lang-en');
    langBnBtn = document.getElementById('lang-bn');

    renderKeyboard();

    // Bind listeners
    if (langEnBtn) langEnBtn.addEventListener('click', () => setLanguage('english'));
    if (langBnBtn) langBnBtn.addEventListener('click', () => setLanguage('bangla'));

    // Start Test
    resetTest();
}

document.addEventListener('DOMContentLoaded', init);
