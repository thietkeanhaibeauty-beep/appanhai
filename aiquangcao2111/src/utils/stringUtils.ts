export const truncateFilename = (filename: string, maxChars: number = 3) => {
    const parts = filename.split('.');
    const ext = parts.pop() || '';
    const name = parts.join('.');

    if (filename.length <= maxChars + ext.length + 4) return filename;

    return `${name.substring(0, maxChars)}...${ext}`;
};
