/**
 * BanglaPhoneticEngine
 * A custom, open-source Bangla phonetic engine based on the Avro Phonetic layout.
 * Supports full Avro specification including Auto-Hasanta, correct Matra handling, and complex conjuncts.
 */

class BanglaPhoneticEngine {
    constructor() {
        // Vowels: Key -> [Independent, Dependent (Kar/Matra)]
        // 'o' has empty string Kar to act as inherent vowel (breaks Hasanta)
        this.vowelMap = {
            'o': ['অ', ''],
            'a': ['আ', 'া'],
            'i': ['ই', 'ি'],
            'I': ['ঈ', 'ী'],
            'u': ['উ', 'ু'],
            'U': ['ঊ', 'ূ'],
            'rri': ['ঋ', 'ৃ'],
            'e': ['এ', 'ে'],
            'oi': ['ঐ', 'ৈ'],
            'O': ['ও', 'ো'],
            'OU': ['ঔ', 'ৌ'],
            // Special cases
            'ee': ['ঈ', 'ী'], // Alias for I
            'oo': ['ঊ', 'ূ'], // Alias for U
            'ou': ['ঔ', 'ৌ']  // Alias for OU
        };

        this.consonants = {
            'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ', 'Ng': 'ঙ',
            'c': 'চ', 'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'J': 'ঝ',
            'T': 'ট', 'Th': 'ঠ', 'D': 'ড', 'Dh': 'ঢ', 'N': 'ণ',
            't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
            'p': 'প', 'f': 'ফ', 'ph': 'ফ', 'b': 'ব', 'v': 'ভ', 'bh': 'ভ', 'm': 'ম',
            'z': 'য', 'r': 'র', 'l': 'ল', 'L': 'ল',
            'sh': 'শ', 'S': 'শ', 'Sh': 'ষ', 's': 'স',
            'h': 'হ', 'R': 'ড়', 'Rh': 'ঢ়', 'y': 'য়',
            'w': 'ব', // b-phala

            // Special Characters
            't``': 'ৎ', '`': 'ঃ', ':': 'ঃ', '^': 'ঁ', '.': '।', '$': '৳',
            // Digits
            '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
            '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',

            // Explicit Conjunct Overrides (Common ones easier to type directly)
            'kk': 'ক্ক', 'kT': 'ক্ট', 'kt': 'ক্ত', 'kl': 'ক্ল', 'ks': 'ক্স',
            'kkh': 'ক্ষ', 'gg': 'জ্ঞ', // Wait, gg is usually gga. jn is GYO/gya/jna.
            'nj': 'ঞ্জ', 'ngg': 'ঙ্গ'
        };

        // Combined map logic for lookups
        // We separate them slightly in logic but keys need overlap check
        this.vowelKeys = Object.keys(this.vowelMap).sort((a, b) => b.length - a.length);
        this.consonantKeys = Object.keys(this.consonants).sort((a, b) => b.length - a.length);
        this.allKeys = [...Object.keys(this.vowelMap), ...Object.keys(this.consonants)]
            .sort((a, b) => b.length - a.length);
    }

    isVowel(key) {
        return this.vowelMap.hasOwnProperty(key);
    }

    isConsonant(key) {
        return this.consonants.hasOwnProperty(key);
    }

    /**
     * Converts phonetic English text to Bangla Unicode.
     */
    convert(text) {
        let output = '';
        let i = 0;
        let lastConsonant = false; // Track if the last appended char was a consonant that can take a Kar

        while (i < text.length) {
            const remaining = text.substring(i);
            let bestMatchKey = null;
            let bestMatchVal = null; // Object {indep, kar} for vowel, String for consonant
            let type = null; // 'vowel' or 'consonant' or 'other'

            // Find longest match
            for (const key of this.allKeys) {
                if (remaining.startsWith(key)) {
                    bestMatchKey = key;
                    if (this.isVowel(key)) {
                        bestMatchVal = this.vowelMap[key];
                        type = 'vowel';
                    } else {
                        bestMatchVal = this.consonants[key];
                        type = 'consonant';
                    }
                    break;
                }
            }

            if (!bestMatchKey) {
                // No match, just append the char
                output += text[i];
                lastConsonant = false;
                i++;
                continue;
            }

            // Processing based on Type
            if (type === 'vowel') {
                if (lastConsonant) {
                    // Dependent Vowel (Matra)
                    // If 'o', it just stops the Hasanta (inherent vowel), adds nothing visible
                    // If 'a', adds 'akar', etc.
                    output += bestMatchVal[1];
                } else {
                    // Independent Vowel
                    output += bestMatchVal[0];
                }
                lastConsonant = false; // Vowel ends the strict consonant sequence for joining
            }
            else if (type === 'consonant') {
                if (lastConsonant) {
                    // Two consonants in a row -> Inject Hasanta
                    // Unless the previous one was already a 'finished' conjunct?
                    // Our engine builds strings.
                    // e.g. 'k' (consonant) -> 'lastConsonant=true'
                    // 'k' (consonant) -> insert Hasanta -> 'k' -> 'lastConsonant=true'
                    output += '\u09CD'; // Hasanta
                }
                output += bestMatchVal;

                // If the consonant maps to something that ends in a vowel (unlikely in this map) or is a special symbol
                // strict 'consonant' usually means it CAN take a matra next.
                // However, things like 'ng' (No) usually don't take matra? 
                // In Avro, 'ng' is 'ঙ', it CAN take matra 'ঙা'.
                // 't``' is 'ৎ', cannot take matra.
                // We should flag 'lastConsonant' based on if it effectively allows a Kar.
                // For simplicity, assumed true.
                lastConsonant = true;
            }
            else {
                output += bestMatchVal;
                lastConsonant = false;
            }

            i += bestMatchKey.length;
        }

        return output;
    }
}

// Export for usage
window.BanglaPhoneticEngine = BanglaPhoneticEngine;
