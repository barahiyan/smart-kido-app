
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const categoryToTranslationKey = (categoryName: string): string => {
  if (!categoryName) return '';
  return categoryName.split(' ').map((word, index) => {
    const lowerWord = word.toLowerCase();
    if (index === 0) return lowerWord;
    return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
  }).join('');
};
