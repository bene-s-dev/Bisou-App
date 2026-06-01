/**
 * Capitalizes the first letter of each word in a name,
 * including parts after hyphens (e.g. "marc-andré" -> "Marc-André").
 */
export const capitalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      return word
        .split('-')
        .map(subWord => subWord.charAt(0).toUpperCase() + subWord.slice(1).toLowerCase())
        .join('-');
    })
    .join(' ');
};
