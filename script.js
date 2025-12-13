const wordsList = [
    "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "i", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

const CONFIG = {
    timeLimit: 30,
    wordCount: 100
};

let state = {
    words: [],
    wordIndex: 0,
    charIndex: 0,
    startTime: null,
    timeRemaining: CONFIG.timeLimit,
    timer: null,
    isTyping: false,
    correctChars: 0,
    incorrectChars: 0,
    totalCharsTyped: 0
};

// DOM Elements
const wordsDiv = document.getElementById('words');
const timerEl = document.getElementById('timer');
const wpmEl = document.getElementById('wpm');
const typingArea = document.getElementById('typing-area');
const caret = document.getElementById('caret');
const restartBtn = document.getElementById('restart-btn');
const overlay = document.getElementById('result-overlay');
const restartOverlayBtn = document.getElementById('restart-overlay-btn');
// Result Els
const finalWpmEl = document.getElementById('final-wpm');
const finalAccEl = document.getElementById('final-acc');
const finalCharsEl = document.getElementById('final-chars');

function initGame() {
    clearInterval(state.timer);
    state = {
        words: generateWords(),
        wordIndex: 0,
        charIndex: 0,
        startTime: null,
        timeRemaining: CONFIG.timeLimit,
        timer: null,
        isTyping: false,
        correctChars: 0,
        incorrectChars: 0,
        totalCharsTyped: 0
    };

    timerEl.innerText = CONFIG.timeLimit;
    wpmEl.innerText = '0';
    overlay.classList.add('hidden');
    typingArea.focus();
    renderWords();
    updateCaretPosition();
}

function generateWords() {
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
}

function startTimer() {
    if (!state.isTyping) {
        state.isTyping = true;
        state.startTime = Date.now();
        state.timer = setInterval(() => {
            state.timeRemaining--;
            timerEl.innerText = state.timeRemaining;

            // Calculate WPM on the fly
            const elapsed = (30 - state.timeRemaining) / 60;
            // Standard WPM: (all typed chars / 5) / time in minutes
            // But usually for live WPM we might want only correct ones or raw
            const wpm = Math.round((state.correctChars / 5) / (elapsed || 0.001));
            wpmEl.innerText = wpm;

            if (state.timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
    }
}

function endGame() {
    clearInterval(state.timer);
    state.isTyping = false;
    overlay.classList.remove('hidden');

    const timeSpent = (CONFIG.timeLimit - state.timeRemaining) / 60; // should be 0.5 usually
    // Final WPM calc
    // Net WPM = ((All Pairs - Uncorrected Errors) / 5) / Time
    // Simplifying to: (Correct Chars / 5) / Time
    const wpm = Math.round((state.correctChars / 5) / (0.5)); // Fixed 30s
    const acc = state.totalCharsTyped > 0 ? Math.round((state.correctChars / state.totalCharsTyped) * 100) : 0;

    finalWpmEl.innerText = wpm;
    finalAccEl.innerText = acc + '%';
    finalCharsEl.innerText = `${state.correctChars}/${state.incorrectChars}/${0}/${0}`;
    // Format: Correct / Incorrect / Extra / Missed (Simplified for now)
}

// Input Handling
window.addEventListener('keydown', (e) => {
    // Shortcuts
    if (e.key === 'Tab') {
        e.preventDefault();
        initGame();
        return;
    }

    if (overlay.classList.contains('hidden') === false) {
        // Overlay is open
        if (e.key === 'Enter' || e.key === ' ') {
            initGame();
        }
        return;
    }

    // Ignore non-printable keys unless backspace
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length !== 1 && e.key !== 'Backspace') return;

    if (!state.isTyping && state.timeRemaining > 0) {
        startTimer();
    }

    const currentWordDiv = wordsDiv.children[state.wordIndex];
    if (!currentWordDiv) return; // End of list

    const currentWordStr = state.words[state.wordIndex];

    if (e.key === 'Backspace') {
        // Handle Backspace
        if (state.charIndex > 0) {
            state.charIndex--;
            const charSpan = currentWordDiv.children[state.charIndex];
            // Revert status
            if (charSpan.classList.contains('correct')) state.correctChars--;
            if (charSpan.classList.contains('incorrect')) state.incorrectChars--;

            charSpan.className = 'letter';
        } else if (state.wordIndex > 0) {
            // Check if we can go back to previous word
            // Usually type racers don't allow going back to previous word if space was pressed? 
            // Monkeytype DOES allow it. Complex logic.
            // Simplified: Block going back to previous word for MVP to keep logic simple
        }
    } else {
        // Handle Character

        // Handle Space -> Next Word
        if (e.key === ' ') {
            e.preventDefault(); // Prevent scrolling
            if (state.charIndex === 0) return; // Don't skip if nothing typed (optional choice)

            // Mark remaining letters as missed (optional, usually monkeytype just ignores or marks red)
            // Move to next word
            state.wordIndex++;
            state.charIndex = 0;

            // Scroll if needed (Simple scroll logic: if word index is high enough, scroll div)
            // For MVP: Check caret position relative to container
            const wordRect = currentWordDiv.getBoundingClientRect();
            const containerRect = typingArea.getBoundingClientRect();
            if (wordRect.top > containerRect.top + 50) {
                // Scroll Logic could be implemented by filtering `renderWords` or `marginTop`
                // Let's implement row-based scrolling later if needed.
                // For now, let's just slide the whole word container up?
                // Or simple: don't support infinite scrolling yet, just static list.
                // The hardcoded list is 100 words, might overflow.
            }

        } else {
            // Regular Char
            // Prevent going out of bounds of current word
            if (state.charIndex < currentWordDiv.children.length) {
                const charSpan = currentWordDiv.children[state.charIndex];
                if (e.key === currentWordStr[state.charIndex]) {
                    charSpan.classList.add('correct');
                    state.correctChars++;
                } else {
                    charSpan.classList.add('incorrect');
                    state.incorrectChars++;
                }
                state.charIndex++;
                state.totalCharsTyped++;
            } else {
                // Typo extra characters?
                // Monkeytype handles extra chars. For now, let's just ignore or cap it.
            }
        }
    }
    updateCaretPosition();
});

function updateCaretPosition() {
    const currentWordDiv = wordsDiv.children[state.wordIndex];
    if (currentWordDiv) {
        // Since .word is position: relative, logic depends on where caret is.
        // Caret is in #typing-area (relative).
        // Word is in #words (static block).
        // We need the position of the character relative to #typing-area.

        // Easiest is to use getBoundingClientRect for absolute coords and convert to relative
        const containerRect = typingArea.getBoundingClientRect();

        let targetRect;

        if (state.charIndex < currentWordDiv.children.length) {
            const charSpan = currentWordDiv.children[state.charIndex];
            targetRect = charSpan.getBoundingClientRect();
        } else {
            // End of word, append to last char
            const lastChar = currentWordDiv.children[currentWordDiv.children.length - 1];
            const rect = lastChar.getBoundingClientRect();
            // Mock a rect after the last char
            targetRect = {
                left: rect.right,
                top: rect.top,
                height: rect.height
            };
        }

        caret.style.left = (targetRect.left - containerRect.left) + 'px';
        caret.style.top = (targetRect.top - containerRect.top + 5) + 'px'; // +5 adjustment
    }
}

// Events
restartBtn.addEventListener('click', initGame);
restartOverlayBtn.addEventListener('click', initGame);
window.addEventListener('resize', () => {
    // Recalculate caret on resize
    updateCaretPosition();
});

// Init
initGame();
