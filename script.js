// Firebase is loaded via script tag in HTML and exports to window
let auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged;


const wordsList = [
    "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "i", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

const banglaWords = [
    "আমি", "তুমি", "সে", "আমরা", "তারা", "কি", "কেন", "কোথায়", "কখন", "এখন",
    "বাংলাদেশ", "ভাষা", "যুদ্ধ", "কীবোর্ড", "কম্পিউটার", "বিজ্ঞান", "প্রযুক্তি", "জীবন",
    "মানুষ", "সময়", "কাজ", "নতুন", "সুন্দর", "ভালো", "খারাপ", "দিন", "রাত",
    "সূর্য", "চাঁদ", "আকাশ", "জল", "নদী", "পাহাড়", "প্রকৃতি"
];

let banglaEngine;
// window.banglaEngine = banglaEngine; // Will be assigned in init

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
    keystrokeLog: [],
    phoneticBuffer: '', // Stores raw English input for current word in Bangla mode
    convertedBuffer: '', // Stores converted Bangla text for current word
    suggestions: [], // Array of current suggestions
    suggestionIndex: 0 // Currently selected index
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
// DOM Elements (Initialized in init)
// DOM Elements (Initialized in init)
let wordsDiv, timerEl, modeSelect, hiddenInput, caret, resultOverlay, restartBtn, wpmEl, accEl, errorsEl, langEnBtn, langBnBtn, suggestionBox, visualKeyboard;



// --- Helper Functions ---

// Check if AI should be used (logged-in users only)
function isAIEnabled() {
    return window.AIService?.isUserLoggedIn() && CONFIG.language === 'english';
}

function parseMode() {
    const val = modeSelect.value;
    const aiThemeSelect = document.getElementById('ai-theme-select');

    // Show AI theme selector only for logged-in users with English language
    if (aiThemeSelect) {
        if (isAIEnabled()) {
            aiThemeSelect.classList.remove('hidden');
        } else {
            aiThemeSelect.classList.add('hidden');
        }
    }

    if (val === 'weak-words') {
        CONFIG.mode = 'weak';
        CONFIG.value = 25;
        CONFIG.wordCount = 25;
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

function generateWords(fixedList = null) {
    // If a fixed list is provided (for multiplayer), use it directly
    if (fixedList && Array.isArray(fixedList)) {
        return [...fixedList];
    }

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

    // For AI modes, return default words (async generation happens in resetTest)
    const list = [];
    for (let i = 0; i < CONFIG.wordCount; i++) {
        list.push(wordsList[Math.floor(Math.random() * wordsList.length)]);
    }
    return list;
}

// Async word generation for AI-enhanced modes
async function generateWordsAsync() {
    // Only use AI if user is logged in
    if (!isAIEnabled()) {
        return generateWords();
    }

    const aiThemeSelect = document.getElementById('ai-theme-select');
    const theme = aiThemeSelect?.value || 'general';

    try {
        // Get adaptive difficulty level based on session history
        let difficulty = 'medium';
        if (sessionHistory.length >= 3) {
            const diffResult = await window.AIService.getDifficultyLevel(sessionHistory);
            difficulty = diffResult?.level || 'medium';
            console.log('AI Adaptive Difficulty:', difficulty, diffResult?.reason);
        }

        // For Weak Words mode, use personalized practice
        if (CONFIG.mode === 'weak') {
            const result = await window.AIService.getPersonalizedPractice(mistakeHistory, keyStats);
            if (result?.practiceWords && result.practiceWords.length > 0) {
                console.log('AI Personalized Practice:', result.focusAreas);
                if (result.tip) {
                    console.log('AI Tip:', result.tip);
                }
                return result.practiceWords;
            }
        } else {
            // For other modes, use smart text generation
            const words = await window.AIService.generateSmartText(theme, CONFIG.wordCount, difficulty);
            if (words && words.length > 0) {
                console.log('AI Smart Text generated:', words.length, 'words');
                return words;
            }
        }
    } catch (error) {
        console.error('AI word generation failed:', error);
    }

    // Fallback to regular words
    console.log('Falling back to regular word generation');
    return generateWords();
}

function renderWords() {
    wordsDiv.innerHTML = '';
    state.words.forEach((word, wordIdx) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        word.split('').forEach((char, charIdx) => {
            const charSpan = document.createElement('span');
            charSpan.className = 'letter';
            charSpan.innerText = char;
            wordDiv.appendChild(charSpan);
        });
        wordsDiv.appendChild(wordDiv);
    });

    // Set active on first character
    if (wordsDiv.children.length > 0 && wordsDiv.children[0].children.length > 0) {
        wordsDiv.children[0].children[0].classList.add('active');
    }
    document.body.style.borderTop = "5px solid blue"; // DEBUG: Words Rendered
}

// Append new words without clearing existing ones (for time mode)
function appendNewWords(newWords) {
    newWords.forEach((word) => {
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
}

async function resetTest() {
    clearInterval(state.timer);
    parseMode();

    // Show loading for AI-enhanced modes (logged-in users)
    if (isAIEnabled()) {
        wordsDiv.innerHTML = '<div class="loading-ai">🤖 Generating AI words...</div>';
    }

    // Generate words (async if AI is enabled for logged-in users)
    let words;
    if (isAIEnabled()) {
        words = await generateWordsAsync();
    } else {
        words = generateWords();
    }

    state = {
        words: words,
        wordIndex: 0,
        charIndex: 0,
        startTime: null,
        timeElapsed: 0,
        timeRemaining: CONFIG.mode === 'time' ? CONFIG.value : 0,
        timer: null,
        isTyping: false,
        correctChars: 0,
        incorrectChars: 0,
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
    // Hide keyboard during testing (will show in results with heatmap)
    if (visualKeyboard) visualKeyboard.classList.add('hidden');
    hiddenInput.value = '';
    hiddenInput.focus();

    // Reset scroll position
    if (wordsDiv) wordsDiv.style.transform = 'translateY(0)';

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

    // --- Bangla Suggestion Navigation ---
    if (CONFIG.language === 'bangla' && !suggestionBox.classList.contains('hidden') && state.suggestions.length > 0) {
        if (key === 'ArrowDown') {
            e.preventDefault();
            state.suggestionIndex = (state.suggestionIndex + 1) % state.suggestions.length;
            renderSuggestions(state.suggestions);

            // Preview selected
            const candidate = state.suggestions[state.suggestionIndex];
            state.convertedBuffer = candidate;
            renderBanglaBuffer(candidate);
            updateCaretPosition();
            return;
        }
        if (key === 'ArrowUp') {
            e.preventDefault();
            state.suggestionIndex = (state.suggestionIndex - 1 + state.suggestions.length) % state.suggestions.length;
            renderSuggestions(state.suggestions);

            // Preview selected
            const candidate = state.suggestions[state.suggestionIndex];
            state.convertedBuffer = candidate;
            renderBanglaBuffer(candidate);
            updateCaretPosition();
            return;
        }
        if (key === 'Enter') {
            e.preventDefault();
            selectSuggestion(state.suggestionIndex);
            return;
        }
        if (key === 'Escape') {
            e.preventDefault();
            suggestionBox.classList.add('hidden');
            return;
        }
    }

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
                // Async Backspace Update
                // First: Local fast update
                const converted = banglaEngine.convert(state.phoneticBuffer);
                state.convertedBuffer = converted;
                state.charIndex = converted.length;

                // Re-use rendering logic (inline for now, ideally refactor)
                const currentWordStr = state.words[state.wordIndex];
                const currentWordDiv = wordsDiv.children[state.wordIndex];
                Array.from(currentWordDiv.children).forEach(span => span.className = 'letter');
                const len = Math.min(converted.length, currentWordStr.length);
                for (let i = 0; i < len; i++) {
                    const span = currentWordDiv.children[i];
                    if (converted[i] === currentWordStr[i]) span.classList.add('correct');
                    else span.classList.add('incorrect');
                }

                // Second: Google Update (Debounced slightly preferred but just fire it)
                banglaEngine.convertGoogle(state.phoneticBuffer).then(googleConverted => {
                    if (googleConverted !== state.convertedBuffer) {
                        state.convertedBuffer = googleConverted;
                        state.charIndex = googleConverted.length;
                        // Render again
                        Array.from(currentWordDiv.children).forEach(span => span.className = 'letter');
                        const gLen = Math.min(googleConverted.length, currentWordStr.length);
                        for (let i = 0; i < gLen; i++) {
                            const span = currentWordDiv.children[i];
                            if (googleConverted[i] === currentWordStr[i]) span.classList.add('correct');
                            else span.classList.add('incorrect');
                        }
                        updateCaretPosition();
                    }
                }).catch(() => { });
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
            // Commit current suggestion if list is active
            if (!suggestionBox.classList.contains('hidden') && state.suggestions.length > 0) {
                // Already committed to buffer via navigation? Or default top?
                // selectSuggestion updates convertedBuffer.
                // Just ensuring we use the current visual buffer.
                state.convertedBuffer = state.suggestions[state.suggestionIndex] || state.convertedBuffer;
            }
            state.phoneticBuffer = '';
            state.convertedBuffer = '';
            state.suggestions = [];
            state.suggestionIndex = 0;
            if (suggestionBox) suggestionBox.classList.add('hidden');
        }

        state.wordIndex++;
        state.charIndex = 0;

        if (state.wordIndex >= state.words.length) {
            if (CONFIG.mode === 'words' || CONFIG.mode === 'weak') {
                endGame();
                return;
            }
            // In time mode, generate more words when running out
            if (CONFIG.mode === 'time') {
                console.log('Time mode: generating more words...');
                const newWords = generateWords();
                state.words = state.words.concat(newWords);
                appendNewWords(newWords); // Append without clearing existing words
                updateCaretPosition();
            }
        }
    } else {
        if (CONFIG.language === 'bangla') {
            // Bangla Phonetic Mode Logic - Keystroke Log Tracking (Simplified)
            // Note: Correctness is complex in phonetic mode. 
            // We'll log the raw key and whether it *contributed* to a correct state? 
            // For now, let's just log it.
            if (state.isTyping) {
                state.keystrokeLog.push({
                    time: Date.now() - state.startTime,
                    key: key,
                    // Approximate correctness: if converted buffer matches target prefix
                    // This is hard to determine perfectly per key.
                    // Let's mark it correct if it didn't cause an immediate mismatch in the visualized word?
                    // Actually, simplified: just default true for now in Bangla or leave undefined.
                    // The requirement focuses on "errors", so maybe just track if it caused 'incorrect' class?
                    // Let's leave isCorrect undefined for Bangla for now to avoid false data.
                    isCorrect: true
                });
            }

            // ... (rest of Bangla logic) ...

            // 1. Process Input into Buffer
            state.phoneticBuffer += key;

            // 2. Convert Buffer
            // Optimistic Update (Local Engine returns string)
            let converted = banglaEngine.convert(state.phoneticBuffer);
            state.convertedBuffer = converted;

            renderBanglaBuffer(converted);

            // Async Update (Google Input Tools)
            const requestText = state.phoneticBuffer;
            banglaEngine.convertGoogle(requestText).then(results => {
                // Race Condition Check
                if (state.phoneticBuffer === requestText) {
                    if (Array.isArray(results) && results.length > 0) {
                        state.suggestions = results;
                        state.suggestionIndex = 0;

                        // Default to top result
                        if (results[0] !== state.convertedBuffer) {
                            state.convertedBuffer = results[0];
                            renderBanglaBuffer(results[0]);
                        }

                        // Render UI
                        renderSuggestions(results);
                        updateCaretPosition();
                    }
                }
            }).catch(e => console.warn(e));

        } else {
            // Standard Character-by-Character Logic
            if (state.charIndex < currentWordDiv.children.length) {
                const charSpan = currentWordDiv.children[state.charIndex];

                // Track Key Stats
                if (!keyStats[key]) keyStats[key] = { total: 0, wrong: 0 };
                keyStats[key].total++;

                let isCorrect = false;

                if (key === currentWordStr[state.charIndex]) {
                    charSpan.classList.add('correct');
                    state.correctChars++;
                    isCorrect = true;
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

                if (state.isTyping) {
                    state.keystrokeLog.push({
                        time: Date.now() - state.startTime,
                        key: key,
                        isCorrect: isCorrect
                    });
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
        const container = wordsDiv.parentElement; // .typing-display
        const containerRect = container.getBoundingClientRect();

        // First: Check if we need to scroll
        const wordRect = currentWordDiv.getBoundingClientRect();

        // If the current word is below the visible area, scroll down
        if (wordRect.bottom > containerRect.bottom - 20) {
            // Calculate how much to scroll based on offsetTop (not affected by transform)
            const scrollAmount = currentWordDiv.offsetTop - 40; // Keep some padding at top
            wordsDiv.style.transform = `translateY(-${Math.max(0, scrollAmount)}px)`;
        }

        // Second: Calculate caret position AFTER any scroll transform
        // Need to get fresh rect after transform
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

        // Get fresh container rect after transform
        const updatedContainerRect = container.getBoundingClientRect();
        caret.style.left = (targetRect.left - updatedContainerRect.left) + 'px';
        caret.style.top = (targetRect.top - updatedContainerRect.top) + 'px';
    }
}

function renderSuggestions(list) {
    if (!suggestionBox) return;

    if (!list || list.length === 0 || state.phoneticBuffer.length === 0) {
        suggestionBox.classList.add('hidden');
        return;
    }

    suggestionBox.innerHTML = '';

    // Position Update
    // Align with caret (Global Positioning)
    const caretRect = caret.getBoundingClientRect();

    // Calculate position relative to document
    const top = caretRect.bottom + window.scrollY + 5;
    const left = caretRect.left + window.scrollX;

    suggestionBox.style.fixed = ''; // Ensure not fixed context if changed
    suggestionBox.style.left = left + 'px';
    suggestionBox.style.top = top + 'px';

    list.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        if (index === state.suggestionIndex) div.classList.add('active');

        // Use numbers 1-5 for shortcuts if we wanted, for now just index
        div.innerHTML = `<span class="suggestion-index">${index + 1}</span>${item}`;

        // Click to select
        div.onclick = () => {
            selectSuggestion(index);
            hiddenInput.focus();
        };

        // Hover to preview (match keyboard behavior)
        div.onmouseenter = () => {
            state.suggestionIndex = index;
            // Update visuals
            Array.from(suggestionBox.children).forEach((child, i) => {
                if (i === index) child.classList.add('active');
                else child.classList.remove('active');
            });
            // Update preview in editor
            const candidate = state.suggestions[index];
            state.convertedBuffer = candidate;
            renderBanglaBuffer(candidate);
            updateCaretPosition();
        };

        suggestionBox.appendChild(div);
    });

    suggestionBox.classList.remove('hidden');
}

function selectSuggestion(index) {
    if (!state.suggestions || !state.suggestions[index]) return;

    const selected = state.suggestions[index];
    state.convertedBuffer = selected;

    renderBanglaBuffer(selected);
    state.suggestions = []; // Clear suggestions
    suggestionBox.classList.add('hidden');
}

// Extracted helper to avoid scope issues
function renderBanglaBuffer(text) {
    const currentWordStr = state.words[state.wordIndex];

    const div = wordsDiv.children[state.wordIndex];
    if (!div) return;

    // Reset highlighting for this word
    Array.from(div.children).forEach(span => span.className = 'letter');

    const len = Math.min(text.length, currentWordStr.length);

    for (let i = 0; i < len; i++) {
        const charSpan = div.children[i];
        if (text[i] === currentWordStr[i]) {
            charSpan.classList.add('correct');
        } else {
            charSpan.classList.add('incorrect');
        }
    }

    state.charIndex = text.length;
}

// Session History
let sessionHistory = [];
window.sessionHistory = sessionHistory;

function generateInsights() {
    const lines = [];

    // Helper to add insight
    const addFn = (text, type) => lines.push({ text, type });

    // 1. Top Key Errors
    const topKeys = Object.entries(mistakeHistory.characters)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

    if (topKeys.length > 0) {
        addFn(`Most errors on: ${topKeys.join(', ')}`, 'accuracy');
    }

    // 2. Weak Words
    const weakWords = Object.entries(mistakeHistory.words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

    if (weakWords.length > 0) {
        addFn(`Weak words: ${weakWords.join(', ')}`, 'accuracy');
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
                addFn(`Left hand accuracy is ${diffPct}% lower than right hand.`, 'hand');
            } else {
                addFn(`Right hand accuracy is ${diffPct}% lower than left hand.`, 'hand');
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
        addFn(`${weakestFinger} finger shows the highest error rate.`, 'finger');
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
            addFn("Accuracy drops significantly in the second half.", 'fatigue');
        }

        // 40s Threshold
        if (totalDuration > 40000) { // 40 seconds
            const earlyPart = state.keystrokeLog.filter(k => k.time <= 40000);
            const latePart = state.keystrokeLog.filter(k => k.time > 40000);

            const accEarly = calcAcc(earlyPart);
            const accLate = calcAcc(latePart);

            if ((accEarly - accLate) > 0.05) {
                addFn("Accuracy drops after 40 seconds — consider shorter practice sessions.", 'fatigue');
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
                addFn("Accuracy is significantly up!", 'trend');
            } else if (diff <= -5) {
                addFn("Accuracy dropped compared to recent average.", 'trend');
            }
        }
    }

    return lines;
}

function getInsightHtml(lines) {
    return lines.map(l => l.text).join('<br>');
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

    const insightsData = generateInsights();
    const insightsHtml = getInsightHtml(insightsData);
    document.getElementById('insights').innerHTML = insightsHtml;

    // Populate Result Overlay Stats
    document.getElementById('result-wpm').innerText = wpm;
    document.getElementById('result-acc').innerText = acc + '%';
    document.getElementById('result-errors').innerText = state.incorrectChars;

    // Show keyboard with heatmap in result page
    updateKeyboardHeatmap();
    if (visualKeyboard) visualKeyboard.classList.remove('hidden');

    resultOverlay.classList.remove('hidden');
    hiddenInput.blur();

    // Add Gemini Analysis Button if not present
    let geminiBtn = document.getElementById('gemini-btn');
    if (!geminiBtn) {
        const actionsDiv = resultOverlay.querySelector('.actions') || resultOverlay.querySelector('.result-box'); // fallback
        // Create if structure missing, but let's append to .result-box for now if .actions doesn't exist
        // Looking at typical structure: result-box contains stats. restart-btn is usually there.
        // Let's create a container for buttons if needed or just append.

        geminiBtn = document.createElement('button');
        geminiBtn.id = 'gemini-btn';
        geminiBtn.className = 'restart-btn'; // Re-use style
        geminiBtn.style.marginTop = '10px';
        geminiBtn.style.backgroundColor = '#8e44ad'; // Distinct color
        geminiBtn.innerText = 'Analyze Performance';
        geminiBtn.onclick = triggerGeminiAnalysis;

        // Append after restart button
        restartBtn.parentNode.insertBefore(geminiBtn, restartBtn.nextSibling);
    }

    // Reset Analysis Box
    const analysisBox = document.getElementById('gemini-analysis');
    if (analysisBox) analysisBox.innerHTML = '';

    // Save mistake history to Firestore for logged-in users
    saveMistakeHistory();
}

async function triggerGeminiAnalysis() {
    const btn = document.getElementById('gemini-btn');
    let analysisBox = document.getElementById('gemini-analysis');

    if (!analysisBox) {
        analysisBox = document.createElement('div');
        analysisBox.id = 'gemini-analysis';
        analysisBox.style.marginTop = '20px';
        analysisBox.style.textAlign = 'left';
        analysisBox.style.fontSize = '0.9rem';
        analysisBox.style.color = '#ddd';
        btn.parentNode.appendChild(analysisBox);
    }

    btn.disabled = true;
    btn.innerText = 'Analyzing...';
    analysisBox.innerHTML = 'Generating insights...';

    try {
        const summary = getTypingSessionSummary();
        const analysis = await analyzeTypingPerformance(summary);

        // Render Analysis
        let html = `<h3 style="margin-top: 15px; margin-bottom: 10px; color: #f1c40f;">Session Insights</h3>`;

        // Insights List (Max 3)
        html += `<ul style="padding-left: 20px; margin-bottom: 20px;">`;
        const insightsToShow = analysis.insights ? analysis.insights.slice(0, 3) : [];

        insightsToShow.forEach(item => {
            let tagsHtml = '';
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => {
                    let colorClass = 'tag-default';
                    const lowerTag = tag.toLowerCase();
                    if (lowerTag.includes('speed')) colorClass = 'tag-speed';
                    else if (lowerTag.includes('accuracy')) colorClass = 'tag-accuracy';
                    else if (lowerTag.includes('fatigue')) colorClass = 'tag-fatigue';
                    else if (lowerTag.includes('habit')) colorClass = 'tag-habit';
                    else if (lowerTag.includes('bangla') || lowerTag.includes('english')) colorClass = 'tag-lang';

                    tagsHtml += `<span class="insight-tag ${colorClass}">${tag}</span>`;
                });
            }
            html += `<li style="margin-bottom: 8px;">${item.text} ${tagsHtml}</li>`;
        });
        html += `</ul>`;

        // Recommendation Section
        if (analysis.recommendation) {
            html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #f1c40f;">`;
            html += `<h4 style="margin-bottom: 10px; color: #fff;">Coach Recommendation</h4>`;
            html += `<p><strong>Focus:</strong> ${analysis.recommendation.focusArea}</p>`;
            html += `<p><strong>Duration:</strong> ${analysis.recommendation.practiceDuration}</p>`;
            html += `<p style="margin-bottom: 10px;"><strong>Mode:</strong> ${analysis.recommendation.mode.type.toUpperCase()} (${analysis.recommendation.mode.value})</p>`;

            html += `<button id="apply-rec-btn" style="
                background: transparent; 
                border: 1px solid #f1c40f; 
                color: #f1c40f; 
                padding: 6px 12px; 
                cursor: pointer; 
                border-radius: 4px; 
                font-size: 0.8rem;
                margin-top: 5px;">
                Apply Settings
            </button>`;
            html += `</div>`;
        } else {
            // Fallback if recommendation missing (legacy response support)
            html += `<div style="margin-top: 15px;"><p><strong>Suggestion:</strong> ${analysis.suggestion}</p></div>`;
        }

        analysisBox.innerHTML = html;
        btn.innerText = 'Analyze Again';

        // Bind Apply Button
        const applyBtn = document.getElementById('apply-rec-btn');
        if (applyBtn && analysis.recommendation) {
            applyBtn.onclick = () => {
                applyRecommendation(analysis.recommendation.mode);
                applyBtn.innerText = 'Applied!';
                applyBtn.disabled = true;
            };
        }

    } catch (error) {
        console.error(error);

        // --- FALLBACK LOGIC ---
        console.log("Gemini unavailable, using fallback logic.");

        const localInsights = generateInsights(); // Array of {text, type}

        // Render Fallback
        let html = `<h3 style="margin-top: 15px; margin-bottom: 10px; color: #95a5a6;">Basic Analysis</h3>`;
        html += `<ul style="padding-left: 20px; margin-bottom: 20px;">`;

        if (localInsights.length > 0) {
            localInsights.slice(0, 3).forEach(item => {
                // Map local types to css classes
                let colorClass = 'tag-default';
                if (item.type === 'accuracy') colorClass = 'tag-accuracy';
                else if (item.type === 'fatigue') colorClass = 'tag-fatigue';
                else if (item.type === 'hand' || item.type === 'finger') colorClass = 'tag-habit';
                else if (item.type === 'trend') colorClass = 'tag-speed';

                html += `<li style="margin-bottom: 8px;">${item.text} <span class="insight-tag ${colorClass}">${item.type.toUpperCase()}</span></li>`;
            });
        } else {
            html += `<li>No significant patterns detected yet. Keep practicing!</li>`;
        }
        html += `</ul>`;

        html += `<div style="margin-top: 20px; padding: 10px; border-top: 1px solid #444; font-size: 0.8rem; color: #7f8c8d;">
            <em>Advanced coaching is currently unavailable. Showing rule-based insights.</em>
        </div>`;

        analysisBox.innerHTML = html;
        btn.innerText = 'Analyze Again'; // Reset button state so user can retry

        // Do not display error in analysis box, handled gracefully above.
    } finally {
        btn.disabled = false;
    }
}

function applyRecommendation(modeConfig) {
    if (!modeConfig) return;

    // Update Config
    const type = modeConfig.type.toLowerCase();

    // Map 'weak' to correct value if needed, though existing parser handles string
    // Update Select Dropdown
    let selectVal = '';
    if (type === 'time') {
        selectVal = `time-${modeConfig.value}`;
    } else if (type === 'words') {
        selectVal = `words-${modeConfig.value}`;
    } else if (type === 'weak') {
        selectVal = 'weak-words';
    }

    if (selectVal) {
        // Check if option exists, otherwise fall back or create?
        // Existing options: time-15, time-30, time-60, words-10, words-25, words-50, weak-words
        // Use closest match or just set CONFIG directly and update UI visually if strictly needed.
        // For now, let's set CONFIG directly and try to match dropdown.

        modeSelect.value = selectVal;

        // If exact value not in dropdown, we might need manual override logic.
        // But let's assume valid standard values for now or just set internal config.
        // Actually, parseMode() reads from dropdown. Improving this structure would require refactoring parseMode.
        // Let's just set the dropdown if it exists.

        const option = Array.from(modeSelect.options).find(opt => opt.value === selectVal);
        if (option) {
            modeSelect.value = selectVal;
        } else {
            // If custom value, we might need to manually set Config and trick UI
            // But let's stick to standard options in prompt instructions if possible.
        }
    }

    // Trigger Mode Change
    const event = new Event('change');
    modeSelect.dispatchEvent(event);
}

async function analyzeTypingPerformance(data) {
    const API_KEY = window.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');

    if (!API_KEY) {
        throw new Error('Missing API Key. Set window.GEMINI_API_KEY or localStorage item.');
    }

    const prompt = `
    Analyze this typing performance data for "Keyboard Joddha":
    ${JSON.stringify(data)}

    Return a JSON response with:
    - insights: Array of objects (MAX 3 ITEMS), each having:
        - text: string (MAX 120 CHARACTERS. Calm, coaching tone. No "Gemini", "AI", "Bot" words.)
        - tags: array of strings (Categories: Speed, Accuracy, Fatigue, Habit, Language)
    - recommendation: object containing:
        - practiceDuration: string (e.g. "15 minutes")
        - mode: object { type: "time" | "words" | "weak", value: number } (Choose standard values if possible: time: 15/30/60, words: 10/25/50)
        - focusArea: string
    - rootCause: string
    
    Rules:
    - STRICTLY max 3 insights.
    - Insight text must be < 120 chars.
    - Tone: Helpful coach, not robotic.
    - NEVER mention "AI", "Gemini", or "analyzing".
    - STRICT JSON output.
    
    Scope Control:
    - Analyze ONLY the provided data. Do not hallucinate or assume external context.
    - Do NOT suggest new UI features, code changes, or website improvements.
    - Do NOT ask for more data.
    - Stateless analysis: Do not refer to previous conversations or store user data.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const result = await response.json();
    try {
        let text = result.candidates[0].content.parts[0].text;
        // Clean markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        throw new Error('Failed to parse Gemini response.');
    }
}


// Event Listeners are now properly initialized inside init() function


// Init
function init() {
    console.log("Initializing Keyboard Joddha...");

    // 1. Initialize DOM Elements
    wordsDiv = document.getElementById('words');
    timerEl = document.getElementById('timer');
    modeSelect = document.getElementById('mode-select');
    hiddenInput = document.getElementById('hidden-input');
    caret = document.getElementById('caret');
    suggestionBox = document.getElementById('suggestion-box'); // NEW
    resultOverlay = document.getElementById('result-overlay');
    restartBtn = document.getElementById('restart-btn');
    wpmEl = document.getElementById('wpm');
    accEl = document.getElementById('acc');
    errorsEl = document.getElementById('errors');
    langEnBtn = document.getElementById('lang-en');
    langEnBtn = document.getElementById('lang-en');
    langBnBtn = document.getElementById('lang-bn');
    visualKeyboard = document.getElementById('visual-keyboard');

    // 2. Initialize Bangla Engine safely
    if (window.BanglaPhoneticEngine) {
        banglaEngine = new window.BanglaPhoneticEngine();
        window.banglaEngine = banglaEngine;
        console.log("Bangla Engine Loaded.");
    } else {
        console.warn("BanglaPhoneticEngine not found. Using Fallback.");
        // Fallback Engine to prevent crash
        banglaEngine = {
            convert: (text) => text // Pass-through
        };
    }

    renderKeyboard();

    // Bind listeners
    if (hiddenInput) {
        hiddenInput.addEventListener('keydown', handleInput);
        document.addEventListener('click', (e) => {
            if (e.target === modeSelect) return;

            // Don't steal focus when multiplayer overlays are open
            const lobbyOverlay = document.getElementById('lobby-overlay');
            const leaderboardOverlay = document.getElementById('leaderboard-overlay');
            if (lobbyOverlay && !lobbyOverlay.classList.contains('hidden')) return;
            if (leaderboardOverlay && !leaderboardOverlay.classList.contains('hidden')) return;

            // Don't steal focus from input elements
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (resultOverlay && resultOverlay.classList.contains('hidden')) {
                hiddenInput.focus();
            }
        });
    }

    // Config Listener
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            resetTest();
            if (hiddenInput) hiddenInput.focus();
        });
    }

    if (restartBtn) restartBtn.addEventListener('click', resetTest);

    // AI Theme Selector (for logged-in users)
    const aiThemeSelect = document.getElementById('ai-theme-select');
    if (aiThemeSelect) {
        aiThemeSelect.addEventListener('change', () => {
            if (isAIEnabled()) resetTest();
        });
    }

    window.addEventListener('resize', updateCaretPosition);

    if (langEnBtn) langEnBtn.addEventListener('click', () => setLanguage('english'));
    if (langBnBtn) langBnBtn.addEventListener('click', () => setLanguage('bangla'));

    // Start Test
    // Start Test
    resetTest();
    console.log("Initialization Complete.");
    document.body.style.border = "5px solid green"; // DEBUG: Init Success
}

// Data Summary for LLM Analysis
function getTypingSessionSummary() {
    // 1. Recent Sessions
    const recentSessions = sessionHistory.slice(-10).map(s => ({
        wpm: s.wpm,
        acc: s.accuracy,
        err: s.errors,
        dur: s.duration,
        ts: s.timestamp
    }));

    // 2. Mistake Trends
    const topCharMistakes = Object.entries(mistakeHistory.characters)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([char, count]) => ({ char, count }));

    const topWordMistakes = Object.entries(mistakeHistory.words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => ({ word, count }));

    // 3. Key Accuracy (Problematic Keys < 80%)
    const problematicKeys = [];
    Object.entries(keyStats).forEach(([key, stats]) => {
        if (stats.total > 5) {
            const acc = (stats.total - stats.wrong) / stats.total;
            if (acc < 0.8) {
                problematicKeys.push({ key, acc: Math.round(acc * 100) + '%' });
            }
        }
    });

    // 4. Current Session Segments (if data exists)
    let currentSessionSegments = null;
    if (state.keystrokeLog.length > 10) {
        const totalTime = state.keystrokeLog[state.keystrokeLog.length - 1].time;
        const midPoint = totalTime / 2;

        const firstHalf = state.keystrokeLog.filter(k => k.time <= midPoint);
        const secondHalf = state.keystrokeLog.filter(k => k.time > midPoint);

        const calcAcc = (log) => {
            if (log.length === 0) return 0;
            const correct = log.filter(k => k.isCorrect).length;
            return Math.round((correct / log.length) * 100);
        };

        currentSessionSegments = {
            firstHalfAcc: calcAcc(firstHalf) + '%',
            secondHalfAcc: calcAcc(secondHalf) + '%',
            duration: Math.round(totalTime / 1000) + 's'
        };
    }

    return {
        recentSessions,
        mistakeTrends: {
            characters: topCharMistakes,
            words: topWordMistakes
        },
        problematicKeys,
        currentSessionSegments,
        activeMode: CONFIG.mode,
        activeLanguage: CONFIG.language
    };
}

window.getTypingSessionSummary = getTypingSessionSummary;

// --- User-Specific Mistake History Storage ---

// Save mistake history to Firestore for the current user
async function saveMistakeHistory() {
    const user = window.auth?.currentUser;
    if (!user || !window.firestore) {
        console.log("Cannot save mistake history: user not logged in or Firestore unavailable");
        return;
    }

    try {
        await window.firestore.collection('users').doc(user.uid).set({
            mistakeHistory: mistakeHistory,
            keyStats: keyStats,
            updatedAt: Date.now()
        }, { merge: true });
        console.log("Mistake history saved for user:", user.uid);
    } catch (error) {
        console.error("Failed to save mistake history:", error);
    }
}

// Load mistake history from Firestore for the current user
async function loadMistakeHistory() {
    const user = window.auth?.currentUser;
    if (!user || !window.firestore) {
        console.log("Cannot load mistake history: user not logged in or Firestore unavailable");
        return;
    }

    try {
        const doc = await window.firestore.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();

            // Merge with existing in-memory data
            if (data.mistakeHistory) {
                if (data.mistakeHistory.characters) {
                    Object.entries(data.mistakeHistory.characters).forEach(([char, count]) => {
                        mistakeHistory.characters[char] = (mistakeHistory.characters[char] || 0) + count;
                    });
                }
                if (data.mistakeHistory.words) {
                    Object.entries(data.mistakeHistory.words).forEach(([word, count]) => {
                        mistakeHistory.words[word] = (mistakeHistory.words[word] || 0) + count;
                    });
                }
            }

            if (data.keyStats) {
                Object.entries(data.keyStats).forEach(([key, stats]) => {
                    if (!keyStats[key]) {
                        keyStats[key] = { total: 0, wrong: 0 };
                    }
                    keyStats[key].total += stats.total || 0;
                    keyStats[key].wrong += stats.wrong || 0;
                });
            }

            console.log("Mistake history loaded for user:", user.uid);
            updateKeyboardHeatmap(); // Update keyboard colors with loaded data
        } else {
            console.log("No saved mistake history found for user:", user.uid);
        }
    } catch (error) {
        console.error("Failed to load mistake history:", error);
    }
}

// Clear in-memory mistake history (called on logout for privacy)
function clearMistakeHistory() {
    mistakeHistory = { characters: {}, words: {} };
    keyStats = {};
    window.keyStats = keyStats;
    console.log("Mistake history cleared");
}

// --- Authentication Logic ---
function initAuth() {
    // Wait for Firebase module to load (it loads asynchronously as a module)
    if (!window.auth) {
        console.log("Waiting for Firebase to load...");
        setTimeout(initAuth, 100); // Retry after 100ms
        return;
    }

    try {
        // Firebase is loaded globally from firebase_config.js script tag
        auth = window.auth;
        googleProvider = window.googleProvider;
        signInWithPopup = window.signInWithPopup;
        signOut = window.signOut;
        onAuthStateChanged = window.onAuthStateChanged;

        console.log("Firebase Auth loaded successfully.");

        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const authInfo = document.getElementById('auth-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                console.log("Login button clicked");
                if (!signInWithPopup) {
                    console.error("signInWithPopup not available");
                    return;
                }
                try {
                    await signInWithPopup(auth, googleProvider);
                } catch (error) {
                    console.error("Login Failed:", error);
                    alert("Login failed: " + error.message);
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (!signOut) return;
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error("Logout Failed:", error);
                }
            });
        }

        // Auth State Monitor
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("User signed in:", user.displayName);
                if (loginBtn) loginBtn.style.display = 'none';
                if (authInfo) {
                    authInfo.classList.remove('hidden');
                    authInfo.style.display = 'flex';
                }
                if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
                if (userName) userName.innerText = user.displayName ? user.displayName.split(' ')[0] : 'User';

                // Load user's mistake history from Firestore
                await loadMistakeHistory();
            } else {
                console.log("User signed out");
                if (loginBtn) {
                    loginBtn.classList.remove('hidden');
                    loginBtn.style.display = 'flex';
                }
                if (authInfo) {
                    authInfo.classList.add('hidden');
                    authInfo.style.display = 'none';
                }

                // Clear mistake history for privacy
                clearMistakeHistory();
            }
        });

    } catch (e) {
        console.warn("Firebase initialization failed.", e);
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.title = "Authentication unavailable";
        }
    }
}

// Init call
// Init call (Wait for DOM)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        initAuth();
        initMultiplayer();
    });
} else {
    init();
    initAuth();
    initMultiplayer();
}

// ==================== MULTIPLAYER SYSTEM ====================

// Multiplayer State
let multiplayerState = {
    isActive: false,
    roomId: null,
    roomCode: null,
    isHost: false,
    playerId: null,
    playerName: 'Guest',
    playerAvatar: null,
    players: {},
    roomData: null,
    unsubscribeRoom: null,
    unsubscribePlayers: null,
    raceStarted: false, // Guard to prevent multiple startMultiplayerGame calls
    leaderboardShown: false // Guard to prevent multiple showLeaderboard calls
};

// Firebase is accessed via window.db and window.firestore (compat API)

// Generate a 6-character room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding ambiguous characters
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate words for a room (with seed for consistency)
function generateRoomWords(count = 50) {
    const list = [];
    for (let i = 0; i < count; i++) {
        list.push(wordsList[Math.floor(Math.random() * wordsList.length)]);
    }
    return list;
}

// Initialize Multiplayer System
function initMultiplayer() {
    console.log("Initializing Multiplayer System...");

    // Try to load Firebase modules
    loadFirebaseModules();

    // Get DOM Elements
    const multiplayerBtn = document.getElementById('multiplayer-btn');
    const lobbyOverlay = document.getElementById('lobby-overlay');
    const lobbyClose = document.getElementById('lobby-close');
    const tabCreate = document.getElementById('tab-create');
    const tabJoin = document.getElementById('tab-join');
    const panelCreate = document.getElementById('panel-create');
    const panelJoin = document.getElementById('panel-join');
    const waitingRoom = document.getElementById('waiting-room');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const startRaceBtn = document.getElementById('start-race-btn');
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    const leaderboardOverlay = document.getElementById('leaderboard-overlay');
    const playAgainBtn = document.getElementById('play-again-btn');
    const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
    const exitMultiplayerBtn = document.getElementById('exit-multiplayer-btn');

    // Open Lobby
    if (multiplayerBtn) {
        multiplayerBtn.addEventListener('click', () => {
            if (!window.auth?.currentUser) {
                alert('Please sign in to play multiplayer!');
                return;
            }
            updatePlayerInfo();
            showLobby();
        });
    }

    // Close Lobby
    if (lobbyClose) {
        lobbyClose.addEventListener('click', () => {
            if (multiplayerState.roomId) {
                if (confirm('Leave the room?')) {
                    leaveRoom();
                    hideLobby();
                }
            } else {
                hideLobby();
            }
        });
    }

    // Tab Switching
    if (tabCreate) {
        tabCreate.addEventListener('click', () => {
            tabCreate.classList.add('active');
            tabJoin.classList.remove('active');
            panelCreate.classList.remove('hidden');
            panelJoin.classList.add('hidden');
        });
    }

    if (tabJoin) {
        tabJoin.addEventListener('click', () => {
            tabJoin.classList.add('active');
            tabCreate.classList.remove('active');
            panelJoin.classList.remove('hidden');
            panelCreate.classList.add('hidden');
        });
    }

    // Create Room
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', createRoom);
    }

    // Join Room
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            const code = roomCodeInput.value.trim().toUpperCase();
            if (code.length !== 6) {
                alert('Please enter a valid 6-character room code');
                return;
            }
            joinRoom(code);
        });
    }

    // Copy Room Code
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(multiplayerState.roomCode);
            copyCodeBtn.textContent = '✓';
            setTimeout(() => copyCodeBtn.textContent = '📋', 1500);
        });
    }

    // Start Race (Host Only)
    if (startRaceBtn) {
        startRaceBtn.addEventListener('click', startMultiplayerRace);
    }

    // Leave Room
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', () => {
            leaveRoom();
            showCreateJoinPanels();
        });
    }

    // Leaderboard Actions
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            if (multiplayerState.isHost) {
                resetRoomForNewRace();
            }
        });
    }

    if (backToLobbyBtn) {
        backToLobbyBtn.addEventListener('click', () => {
            leaderboardOverlay.classList.add('hidden');
            showLobby();
            showWaitingRoom();
        });
    }

    if (exitMultiplayerBtn) {
        exitMultiplayerBtn.addEventListener('click', () => {
            leaveRoom();
            leaderboardOverlay.classList.add('hidden');
        });
    }

    // Auto-uppercase room code input
    if (roomCodeInput) {
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    console.log("Multiplayer System Initialized.");
}

// Load Firebase modules from global exports
function loadFirebaseModules() {
    // These are exported from firebase_config.js
    if (window.db) {
        dbRef = window.ref;
        dbSet = window.set;
        dbGet = window.get;
        dbPush = window.push;
        dbOnValue = window.onValue;
        dbUpdate = window.update;
        dbRemove = window.remove;
        dbChild = window.child;
        dbServerTimestamp = window.serverTimestamp;
    }
    if (window.firestore) {
        fsFirestore = window.firestore;
        fsCollection = window.collection;
        fsDoc = window.doc;
        fsSetDoc = window.setDoc;
        fsGetDoc = window.getDoc;
        fsAddDoc = window.addDoc;
    }
}

// Update player info from auth
function updatePlayerInfo() {
    const user = window.auth?.currentUser;
    if (user) {
        multiplayerState.playerId = user.uid;
        multiplayerState.playerName = user.displayName || 'Player';
        multiplayerState.playerAvatar = user.photoURL || 'https://via.placeholder.com/32';
    } else {
        multiplayerState.playerId = 'guest_' + Math.random().toString(36).substr(2, 9);
        multiplayerState.playerName = 'Guest';
        multiplayerState.playerAvatar = 'https://via.placeholder.com/32';
    }
}

// Show/Hide Lobby
function showLobby() {
    document.getElementById('lobby-overlay').classList.remove('hidden');
}

function hideLobby() {
    document.getElementById('lobby-overlay').classList.add('hidden');
}

function showCreateJoinPanels() {
    document.getElementById('panel-create').classList.remove('hidden');
    document.getElementById('panel-join').classList.add('hidden');
    document.getElementById('waiting-room').classList.add('hidden');
    document.getElementById('tab-create').classList.add('active');
    document.getElementById('tab-join').classList.remove('active');
    document.querySelector('.lobby-tabs').style.display = 'flex';
}

function showWaitingRoom() {
    document.getElementById('panel-create').classList.add('hidden');
    document.getElementById('panel-join').classList.add('hidden');
    document.getElementById('waiting-room').classList.remove('hidden');
    document.querySelector('.lobby-tabs').style.display = 'none';
}

// Create Room
async function createRoom() {
    if (!window.db) {
        alert('Firebase not available. Please refresh and try again.');
        return;
    }

    const roomCode = generateRoomCode();
    const roomId = roomCode.toLowerCase();
    const words = generateRoomWords(50);

    const roomData = {
        code: roomCode,
        hostId: multiplayerState.playerId,
        hostName: multiplayerState.playerName,
        state: 'waiting', // waiting, countdown, playing, finished
        words: words,
        createdAt: Date.now(),
        startTime: null,
        settings: {
            mode: 'time',
            duration: 30,
            wordCount: 50
        }
    };

    try {
        // Using compat API: db.ref(path).set(data)
        await window.db.ref(`rooms/${roomId}`).set(roomData);

        // Add self as player
        await window.db.ref(`rooms/${roomId}/players/${multiplayerState.playerId}`).set({
            name: multiplayerState.playerName,
            avatar: multiplayerState.playerAvatar,
            isHost: true,
            joinedAt: Date.now(),
            progress: 0,
            wpm: 0,
            accuracy: 100,
            finished: false,
            finishTime: null
        });

        multiplayerState.roomId = roomId;
        multiplayerState.roomCode = roomCode;
        multiplayerState.isHost = true;
        multiplayerState.isActive = true;

        document.getElementById('display-room-code').textContent = roomCode;
        document.getElementById('start-race-btn').classList.remove('hidden');

        showWaitingRoom();
        subscribeToRoom(roomId);

        console.log("Room created:", roomCode);
    } catch (error) {
        console.error("Failed to create room:", error);
        alert('Failed to create room: ' + error.message);
    }
}

// Join Room
async function joinRoom(code) {
    if (!window.db) {
        alert('Firebase not available. Please refresh and try again.');
        return;
    }

    const roomId = code.toLowerCase();

    try {
        // Using compat API
        const snapshot = await window.db.ref(`rooms/${roomId}`).get();

        if (!snapshot.exists()) {
            alert('Room not found. Please check the code and try again.');
            return;
        }

        const roomData = snapshot.val();

        if (roomData.state !== 'waiting') {
            alert('This room has already started. Please try another room.');
            return;
        }

        // Count players
        const playersSnapshot = await window.db.ref(`rooms/${roomId}/players`).get();
        const playerCount = playersSnapshot.exists() ? Object.keys(playersSnapshot.val()).length : 0;

        if (playerCount >= 10) {
            alert('This room is full (max 10 players).');
            return;
        }

        // Add self as player
        await window.db.ref(`rooms/${roomId}/players/${multiplayerState.playerId}`).set({
            name: multiplayerState.playerName,
            avatar: multiplayerState.playerAvatar,
            isHost: false,
            joinedAt: Date.now(),
            progress: 0,
            wpm: 0,
            accuracy: 100,
            finished: false,
            finishTime: null
        });

        multiplayerState.roomId = roomId;
        multiplayerState.roomCode = code.toUpperCase();
        multiplayerState.isHost = false;
        multiplayerState.isActive = true;

        document.getElementById('display-room-code').textContent = code.toUpperCase();
        document.getElementById('start-race-btn').classList.add('hidden');

        showWaitingRoom();
        subscribeToRoom(roomId);

        console.log("Joined room:", code);
    } catch (error) {
        console.error("Failed to join room:", error);
        alert('Failed to join room: ' + error.message);
    }
}

// Leave Room
async function leaveRoom() {
    if (!multiplayerState.roomId) return;

    try {
        // Remove self from players using compat API
        await window.db.ref(`rooms/${multiplayerState.roomId}/players/${multiplayerState.playerId}`).remove();

        // If host, delete the room
        if (multiplayerState.isHost) {
            await window.db.ref(`rooms/${multiplayerState.roomId}`).remove();
        }
    } catch (error) {
        console.error("Error leaving room:", error);
    }

    // Unsubscribe from listeners
    if (multiplayerState.unsubscribeRoom) {
        multiplayerState.unsubscribeRoom();
    }

    // Reset state
    multiplayerState.roomId = null;
    multiplayerState.roomCode = null;
    multiplayerState.isHost = false;
    multiplayerState.isActive = false;
    multiplayerState.players = {};
    multiplayerState.roomData = null;

    console.log("Left room");
}

// Subscribe to Room Updates - using compat API
function subscribeToRoom(roomId) {
    // Subscribe to room data using compat API: db.ref(path).on('value', callback)
    const roomRef = window.db.ref(`rooms/${roomId}`);
    let lastState = null; // Track last state to prevent duplicate actions

    roomRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Room was deleted
            alert('The room has been closed.');
            leaveRoom();
            hideLobby();
            return;
        }

        const data = snapshot.val();
        multiplayerState.roomData = data;

        // Only trigger state changes if state actually changed
        if (data.state !== lastState) {
            console.log('Room state changed:', lastState, '->', data.state);
            lastState = data.state;

            // Handle state changes
            if (data.state === 'countdown') {
                const countdownEl = document.getElementById('countdown-display');
                if (!countdownEl.classList.contains('visible')) {
                    startCountdown(data.countdownEnd);
                }
            } else if (data.state === 'playing') {
                if (!state.isTyping && !multiplayerState.raceStarted) {
                    multiplayerState.raceStarted = true;
                    startMultiplayerGame(data.words);
                }
            } else if (data.state === 'finished') {
                // Don't call showLeaderboard here - let finishMultiplayerRace handle it
                // This prevents duplicate calls
            } else if (data.state === 'waiting') {
                // Reset race flag when back to waiting
                multiplayerState.raceStarted = false;
            }
        }

        // Update players list
        if (data.players) {
            multiplayerState.players = data.players;
            renderPlayersList(data.players, data.hostId);
        }
    });

    // Store unsubscribe function
    multiplayerState.unsubscribeRoom = () => roomRef.off('value');
}

// Render Players List
function renderPlayersList(players, hostId) {
    const playersList = document.getElementById('players-list');
    const playerCount = document.getElementById('player-count');

    if (!playersList) return;

    const playerArray = Object.entries(players);
    playerCount.textContent = `(${playerArray.length}/10)`;

    playersList.innerHTML = playerArray.map(([id, player]) => `
        <li>
            <img src="${player.avatar || 'https://via.placeholder.com/32'}" alt="${player.name}" class="player-avatar">
            <span class="player-name">${player.name}${id === multiplayerState.playerId ? ' (You)' : ''}</span>
            ${player.isHost ? '<span class="host-badge">Host</span>' : ''}
            ${player.finished ? '<span class="ready-status">✓ Finished</span>' : ''}
        </li>
    `).join('');
}

// Start Multiplayer Race (Host Only)
async function startMultiplayerRace() {
    if (!multiplayerState.isHost || !multiplayerState.roomId) return;

    const countdownEnd = Date.now() + 4000; // 3 second countdown

    try {
        // Using compat API
        await window.db.ref(`rooms/${multiplayerState.roomId}`).update({
            state: 'countdown',
            countdownEnd: countdownEnd
        });
    } catch (error) {
        console.error("Failed to start race:", error);
        alert('Failed to start race: ' + error.message);
    }
}

// Start Countdown
function startCountdown(endTime) {
    const countdownDisplay = document.getElementById('countdown-display');
    const countdownNumber = document.getElementById('countdown-number');

    countdownDisplay.classList.remove('hidden');
    countdownDisplay.classList.add('visible');

    const updateCountdown = () => {
        const remaining = Math.ceil((endTime - Date.now()) / 1000);

        if (remaining > 0) {
            countdownNumber.textContent = remaining;
            setTimeout(updateCountdown, 100);
        } else {
            countdownNumber.textContent = 'GO!';
            setTimeout(() => {
                countdownDisplay.classList.add('hidden');
                countdownDisplay.classList.remove('visible');

                // Host updates state to playing - using compat API
                if (multiplayerState.isHost) {
                    window.db.ref(`rooms/${multiplayerState.roomId}`).update({
                        state: 'playing',
                        startTime: Date.now()
                    });
                }
            }, 500);
        }
    };

    updateCountdown();
}

// Start Multiplayer Game
function startMultiplayerGame(words) {
    // Hide lobby
    hideLobby();

    // Configure for multiplayer
    CONFIG.mode = 'time';
    CONFIG.value = 30;
    CONFIG.wordCount = words.length;

    // Reset with room words
    clearInterval(state.timer);
    state = {
        words: [...words],
        wordIndex: 0,
        charIndex: 0,
        startTime: Date.now(),
        timeElapsed: 0,
        timeRemaining: 30,
        timer: null,
        isTyping: true,
        correctChars: 0,
        incorrectChars: 0,
        totalCharsTyped: 0,
        keystrokeLog: [],
        phoneticBuffer: '',
        convertedBuffer: ''
    };

    timerEl.innerText = state.timeRemaining;
    wpmEl.innerText = '0';
    accEl.innerText = '100%';
    errorsEl.innerText = '0';
    resultOverlay.classList.add('hidden');

    renderWords();
    updateCaretPosition();
    hiddenInput.value = '';
    hiddenInput.focus();

    // Start timer
    state.timer = setInterval(() => {
        state.timeRemaining--;
        timerEl.innerText = state.timeRemaining;
        updateStats();

        // Update progress in room
        updatePlayerProgress();

        if (state.timeRemaining <= 0) {
            finishMultiplayerRace();
        }
    }, 1000);
}

// Update Player Progress in Room
async function updatePlayerProgress() {
    if (!multiplayerState.roomId || !multiplayerState.isActive) return;

    const progress = Math.round((state.wordIndex / state.words.length) * 100);
    const wpm = calculateWPM();
    const accuracy = calculateAccuracy();

    try {
        // Using compat API
        await window.db.ref(`rooms/${multiplayerState.roomId}/players/${multiplayerState.playerId}`).update({
            progress: progress,
            wpm: wpm,
            accuracy: accuracy
        });
    } catch (error) {
        console.error("Failed to update progress:", error);
    }
}

// Finish Multiplayer Race
async function finishMultiplayerRace() {
    clearInterval(state.timer);
    state.isTyping = false;

    const wpm = calculateWPM();
    const accuracy = calculateAccuracy();

    try {
        // Using compat API
        await window.db.ref(`rooms/${multiplayerState.roomId}/players/${multiplayerState.playerId}`).update({
            finished: true,
            finishTime: Date.now(),
            wpm: wpm,
            accuracy: accuracy,
            progress: 100
        });

        // Check if all players finished
        const snapshot = await window.db.ref(`rooms/${multiplayerState.roomId}/players`).get();
        if (snapshot.exists()) {
            const players = snapshot.val();
            const allFinished = Object.values(players).every(p => p.finished);

            if (allFinished && multiplayerState.isHost) {
                await window.db.ref(`rooms/${multiplayerState.roomId}`).update({
                    state: 'finished'
                });
            }
        }

        // Save to Firestore history
        saveMatchHistory(wpm, accuracy);

    } catch (error) {
        console.error("Failed to finish race:", error);
    }

    // Show leaderboard after delay to allow Firebase sync
    setTimeout(() => {
        showLeaderboard();
    }, 2000); // 2 second delay to ensure all players' data is synced
}

// Save Match History to Firestore - using compat API
async function saveMatchHistory(wpm, accuracy) {
    if (!window.firestore || !multiplayerState.playerId) return;

    try {
        // Using compat API: firestore.collection(path).add(data)
        await window.firestore.collection('matchHistory').add({
            odId: window.auth?.currentUser?.uid || multiplayerState.playerId,
            odName: multiplayerState.playerName,
            roomCode: multiplayerState.roomCode,
            wpm: wpm,
            accuracy: accuracy,
            timestamp: Date.now(),
            playerCount: Object.keys(multiplayerState.players).length
        });
        console.log("Match history saved");
    } catch (error) {
        console.error("Failed to save match history:", error);
    }
}

// Show Leaderboard - fetches fresh data from Firebase to ensure sync
async function showLeaderboard() {
    // Guard: prevent multiple calls
    if (multiplayerState.leaderboardShown) {
        console.log("Leaderboard already shown, skipping");
        return;
    }
    multiplayerState.leaderboardShown = true;

    const leaderboardOverlay = document.getElementById('leaderboard-overlay');
    const leaderboardBody = document.getElementById('leaderboard-body');
    const playAgainBtn = document.getElementById('play-again-btn');

    if (!leaderboardBody) return;

    // Fetch fresh player data from Firebase to ensure sync
    let playersData = multiplayerState.players;
    try {
        const snapshot = await window.db.ref(`rooms/${multiplayerState.roomId}/players`).get();
        if (snapshot.exists()) {
            playersData = snapshot.val();
            multiplayerState.players = playersData; // Update local state
            console.log("Leaderboard: Fetched fresh player data", playersData);
        }
    } catch (error) {
        console.error("Failed to fetch fresh leaderboard data:", error);
    }

    // Sort players by WPM
    const sortedPlayers = Object.entries(playersData)
        .sort((a, b) => b[1].wpm - a[1].wpm);

    leaderboardBody.innerHTML = sortedPlayers.map(([id, player], index) => {
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
        const isYou = id === multiplayerState.playerId;

        return `
            <tr>
                <td class="rank-cell">${rankEmoji}</td>
                <td class="player-cell">
                    <img src="${player.avatar || 'https://via.placeholder.com/28'}" alt="${player.name}">
                    ${player.name}
                    ${isYou ? '<span class="you-badge">YOU</span>' : ''}
                </td>
                <td class="wpm-cell">${player.wpm}</td>
                <td>${player.accuracy}%</td>
            </tr>
        `;
    }).join('');

    // Show/hide host buttons
    if (multiplayerState.isHost) {
        playAgainBtn.classList.remove('hidden');
    } else {
        playAgainBtn.classList.add('hidden');
    }

    leaderboardOverlay.classList.remove('hidden');
}

// Reset Room for New Race (Host Only)
async function resetRoomForNewRace() {
    if (!multiplayerState.isHost || !multiplayerState.roomId) return;

    const newWords = generateRoomWords(50);

    try {
        // Reset room state - using compat API
        await window.db.ref(`rooms/${multiplayerState.roomId}`).update({
            state: 'waiting',
            words: newWords,
            startTime: null
        });

        // Reset all players
        const playersSnapshot = await window.db.ref(`rooms/${multiplayerState.roomId}/players`).get();
        if (playersSnapshot.exists()) {
            const players = playersSnapshot.val();
            for (const playerId of Object.keys(players)) {
                await window.db.ref(`rooms/${multiplayerState.roomId}/players/${playerId}`).update({
                    progress: 0,
                    wpm: 0,
                    accuracy: 100,
                    finished: false,
                    finishTime: null
                });
            }
        }

        document.getElementById('leaderboard-overlay').classList.add('hidden');

        // Reset guard flags for new race
        multiplayerState.raceStarted = false;
        multiplayerState.leaderboardShown = false;

        showLobby();
        showWaitingRoom();

    } catch (error) {
        console.error("Failed to reset room:", error);
        alert('Failed to reset room: ' + error.message);
    }
}

// Export for global access
window.multiplayerState = multiplayerState;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.leaveRoom = leaveRoom;
