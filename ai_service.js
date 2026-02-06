// AI Service for Keyboard Joddha
// Provides AI-powered features using Gemini API
// All features require user to be logged in

// Check if user is logged in
function isUserLoggedIn() {
    return !!window.auth?.currentUser;
}

// Get API key
function getApiKey() {
    return window.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
}

// Base Gemini API call
async function callGemini(prompt, maxTokens = 1024) {
    if (!isUserLoggedIn()) {
        throw new Error('Please sign in to use AI features');
    }

    const API_KEY = getApiKey();
    if (!API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens }
        })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const result = await response.json();
    let text = result.candidates[0].content.parts[0].text;
    // Clean markdown code blocks if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return text;
}

// ===========================================
// FEATURE 1: Smart Word Generation
// ===========================================

const THEMES = {
    general: 'common everyday words and phrases',
    tech: 'technology, programming, and computer science terms',
    academic: 'academic and scientific vocabulary',
    creative: 'creative writing, storytelling, and artistic expressions',
    business: 'business, finance, and professional terminology'
};

async function generateSmartText(theme = 'general', wordCount = 50, difficulty = 'medium') {
    const themeDescription = THEMES[theme] || THEMES.general;

    const prompt = `Generate exactly ${wordCount} words for a typing practice exercise.
Theme: ${themeDescription}
Difficulty: ${difficulty} (easy=short common words, medium=mixed, hard=longer complex words)

Rules:
- Return ONLY a JSON array of words, nothing else
- Words should be lowercase
- No punctuation in words
- Mix of word lengths appropriate for difficulty
- Words should feel natural and related to the theme

Example format: ["word1", "word2", "word3"]`;

    const response = await callGemini(prompt, 512);

    try {
        const words = JSON.parse(response);
        if (Array.isArray(words) && words.length > 0) {
            return words.slice(0, wordCount);
        }
        throw new Error('Invalid response format');
    } catch (e) {
        console.error('Smart text generation failed:', e);
        return null; // Fallback to regular word list
    }
}

// ===========================================
// FEATURE 2: Personalized Practice
// ===========================================

async function getPersonalizedPractice(mistakeHistory, keyStats) {
    const topCharMistakes = Object.entries(mistakeHistory.characters || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([char, count]) => ({ char, count }));

    const topWordMistakes = Object.entries(mistakeHistory.words || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

    const weakKeys = Object.entries(keyStats || {})
        .filter(([key, stats]) => stats.total > 5 && (stats.wrong / stats.total) > 0.2)
        .map(([key, stats]) => ({ key, accuracy: Math.round((1 - stats.wrong / stats.total) * 100) }));

    const prompt = `Analyze this typing data and generate personalized practice words.

Mistake Data:
- Character errors: ${JSON.stringify(topCharMistakes)}
- Word errors: ${JSON.stringify(topWordMistakes)}
- Weak keys (under 80% accuracy): ${JSON.stringify(weakKeys)}

Generate a JSON response with:
{
    "focusAreas": ["area1", "area2"], // Max 3 areas to focus on
    "practiceWords": ["word1", "word2", ...], // 30 words targeting weak areas
    "tip": "Short coaching tip (max 100 chars)"
}

Rules:
- Practice words should heavily feature the weak keys/characters
- Include variations of commonly mistaken words
- Words should be real English words
- Return ONLY valid JSON`;

    const response = await callGemini(prompt, 1024);

    try {
        return JSON.parse(response);
    } catch (e) {
        console.error('Personalized practice generation failed:', e);
        return null;
    }
}

// ===========================================
// FEATURE 3: Adaptive Difficulty
// ===========================================

async function getDifficultyLevel(sessionHistory) {
    if (!sessionHistory || sessionHistory.length < 3) {
        return { level: 'medium', confidence: 'low', reason: 'Need more sessions for analysis' };
    }

    const recentSessions = sessionHistory.slice(-10);
    const avgWpm = recentSessions.reduce((sum, s) => sum + s.wpm, 0) / recentSessions.length;
    const avgAcc = recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length;

    const prompt = `Analyze typing performance and recommend difficulty level.

Recent Sessions (last ${recentSessions.length}):
- Average WPM: ${Math.round(avgWpm)}
- Average Accuracy: ${Math.round(avgAcc)}%
- Session data: ${JSON.stringify(recentSessions.map(s => ({ wpm: s.wpm, acc: s.accuracy })))}

Return JSON:
{
    "level": "easy" | "medium" | "hard" | "expert",
    "confidence": "low" | "medium" | "high",
    "reason": "Brief explanation (max 80 chars)",
    "targetWpm": number,
    "targetAccuracy": number
}

Guidelines:
- Easy: WPM < 30 or Accuracy < 85%
- Medium: WPM 30-50, Accuracy 85-92%
- Hard: WPM 50-70, Accuracy 92-96%
- Expert: WPM > 70, Accuracy > 96%

Return ONLY valid JSON`;

    const response = await callGemini(prompt, 256);

    try {
        return JSON.parse(response);
    } catch (e) {
        console.error('Difficulty analysis failed:', e);
        // Fallback logic
        if (avgWpm < 30 || avgAcc < 85) return { level: 'easy', confidence: 'fallback' };
        if (avgWpm < 50 || avgAcc < 92) return { level: 'medium', confidence: 'fallback' };
        if (avgWpm < 70 || avgAcc < 96) return { level: 'hard', confidence: 'fallback' };
        return { level: 'expert', confidence: 'fallback' };
    }
}

// ===========================================
// FEATURE 4: Typing Style Analysis
// ===========================================

async function analyzeTypingStyle(keystrokeLog, sessionData) {
    if (!keystrokeLog || keystrokeLog.length < 20) {
        return { error: 'Need more keystrokes for analysis' };
    }

    // Calculate timing patterns
    const timings = [];
    for (let i = 1; i < keystrokeLog.length; i++) {
        timings.push(keystrokeLog[i].time - keystrokeLog[i - 1].time);
    }

    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxPause = Math.max(...timings);
    const minTiming = Math.min(...timings);

    // Detect rhythm consistency
    const variance = timings.reduce((sum, t) => sum + Math.pow(t - avgTiming, 2), 0) / timings.length;
    const rhythmScore = Math.max(0, 100 - Math.sqrt(variance) / 2);

    // First half vs second half accuracy
    const halfPoint = Math.floor(keystrokeLog.length / 2);
    const firstHalf = keystrokeLog.slice(0, halfPoint);
    const secondHalf = keystrokeLog.slice(halfPoint);
    const firstHalfAcc = firstHalf.filter(k => k.isCorrect).length / firstHalf.length * 100;
    const secondHalfAcc = secondHalf.filter(k => k.isCorrect).length / secondHalf.length * 100;

    const prompt = `Analyze this typing style data and provide insights.

Timing Analysis:
- Average keystroke interval: ${Math.round(avgTiming)}ms
- Longest pause: ${Math.round(maxPause)}ms
- Fastest keystroke: ${Math.round(minTiming)}ms
- Rhythm consistency score: ${Math.round(rhythmScore)}/100

Fatigue Indicators:
- First half accuracy: ${Math.round(firstHalfAcc)}%
- Second half accuracy: ${Math.round(secondHalfAcc)}%
- Accuracy change: ${Math.round(secondHalfAcc - firstHalfAcc)}%

Session Stats:
- WPM: ${sessionData.wpm}
- Overall Accuracy: ${sessionData.accuracy}%
- Total errors: ${sessionData.errors}

Return JSON:
{
    "patterns": [
        { "type": "rhythm|speed|fatigue|consistency", "insight": "description (max 80 chars)" }
    ],
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"],
    "coachTip": "Personalized tip (max 120 chars)"
}

Max 3 patterns, 2 strengths, 2 improvements. Return ONLY valid JSON`;

    const response = await callGemini(prompt, 512);

    try {
        return JSON.parse(response);
    } catch (e) {
        console.error('Style analysis failed:', e);
        return null;
    }
}

// ===========================================
// Expose functions globally
// ===========================================

window.AIService = {
    isUserLoggedIn,
    generateSmartText,
    getPersonalizedPractice,
    getDifficultyLevel,
    analyzeTypingStyle,
    THEMES
};

console.log('AI Service loaded');
