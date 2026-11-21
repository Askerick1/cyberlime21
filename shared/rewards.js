export const taskXP = 150;
export const mistakeCost = 10;
export const hintCost = 15;
export const maxMistakes = 6;

export function reward({ mistakes = 0, hints = 0 } = {}) {
  return taskXP - Math.min(mistakes, maxMistakes) * mistakeCost - hints * hintCost;
}
