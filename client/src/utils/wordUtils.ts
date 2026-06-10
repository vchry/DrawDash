import wordData from "../../../server/src/assets/word_data.json";

export interface WordData {
    animals: {
        easy: string[];
        moderate: string[];
        hard: string[];
    };
}

/**
 * Get random words from the word data
 * @param count Number of random words to select
 * @param difficulty Difficulty level: 'easy', 'moderate', or 'hard'
 * @returns Array of random words
 */
export function getRandomWords(
    count: number = 3,
    difficulty: "easy" | "moderate" | "hard" = "easy"
): string[] {
    const data = wordData as WordData;
    const words = data.animals[difficulty];

    if (words.length < count) {
        console.warn(
            `Not enough words of difficulty "${difficulty}". Returning all available.`
        );
        return words;
    }

    const shuffled = [...words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Get random words from a mix of difficulties
 * @param count Number of random words to select
 * @returns Array of random words from mixed difficulties
 */
export function getRandomWordsFromAll(count: number = 3): string[] {
    const data = wordData as WordData;
    const allWords = [
        ...data.animals.easy,
        ...data.animals.moderate,
        ...data.animals.hard,
    ];

    if (allWords.length < count) {
        return allWords;
    }

    const shuffled = allWords.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
