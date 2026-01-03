/**
 * CSV/XLSX Parser Utility
 * Parse CSV/XLSX text to array of objects with UTF-8 support for Vietnamese text
 */

import * as XLSX from 'xlsx';

/**
 * Parse CSV text into array of row objects
 * Handles multiline cells (newlines inside quoted fields)
 */
export function parseCSV(csvText, options = {}) {
    const { hasHeader = true, delimiter = ',' } = options;

    // Normalize line endings to \n
    const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                // Escaped quote ""
                currentCell += '"';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            // End of cell
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if (char === '\n' && !inQuotes) {
            // End of row
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell !== '')) {  // Skip empty rows
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    // Add last cell and row
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== '')) {
        rows.push(currentRow);
    }

    if (rows.length === 0) return [];

    if (hasHeader) {
        const headers = rows[0];
        const dataRows = rows.slice(1);

        return dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = row[index] || '';
            });
            return obj;
        });
    }

    return rows;
}

/**
 * Parse XLSX file buffer to array of objects
 * @param {ArrayBuffer} buffer - File buffer from FileReader
 * @returns {Array<Object>} Array of row objects
 */
export function parseXLSX(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (data.length < 2) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
}

/**
 * Parse bulk template data from parsed rows
 * Expected columns by INDEX (not name):
 * A (0): Link Drive
 * B (1): Prompt text
 * C (2): Tên template
 * D (3): Mô tả ngắn
 * E (4): Danh mục
 */
export function parseBulkTemplateData(rows) {
    console.log('Parsing rows, first row keys:', rows[0] ? Object.keys(rows[0]) : 'no rows');

    return rows.map((row, index) => {
        const keys = Object.keys(row);
        const values = Object.values(row);

        // Use column INDEX directly (more reliable than name matching)
        // A=0, B=1, C=2, D=3, E=4
        const getByIndex = (idx) => {
            const val = values[idx];
            return val !== undefined && val !== null ? String(val).trim() : '';
        };

        // Also try to match by name as fallback
        const getByNameOrIndex = (possibleNames, idx) => {
            // First try by name
            for (const name of possibleNames) {
                const key = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
                if (key && row[key] !== undefined && row[key] !== '') {
                    return String(row[key]).trim();
                }
            }
            // Fallback to index
            return getByIndex(idx);
        };

        return {
            rowNumber: index + 2,
            image: getByNameOrIndex(['link drive', 'link_drive', 'image', 'url', 'Link Drive'], 0),
            stylePrompt: getByNameOrIndex(['prompt text tạo ảnh', 'prompt', 'styleprompt'], 1),
            title: getByNameOrIndex(['tên template', 'title', 'name', 'ten template'], 2),
            description: getByNameOrIndex(['mô tả ngắn', 'description', 'mo ta ngan'], 3),
            categoryName: getByNameOrIndex(['danh mục', 'category', 'danh_muc'], 4)
        };
    }).filter(row => row.image && row.title);
}

/**
 * Parse bulk template CSV with expected columns
 */
export function parseBulkTemplateCSV(csvText) {
    const rows = parseCSV(csvText, { hasHeader: true });
    return parseBulkTemplateData(rows);
}

/**
 * Parse bulk template XLSX with expected columns
 */
export function parseBulkTemplateXLSX(buffer) {
    const rows = parseXLSX(buffer);
    return parseBulkTemplateData(rows);
}

/**
 * Read file as text with UTF-8 encoding
 */
export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Không thể đọc file'));
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Read file as ArrayBuffer (for XLSX)
 */
export function readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Không thể đọc file'));
        reader.readAsArrayBuffer(file);
    });
}

export default {
    parseCSV,
    parseXLSX,
    parseBulkTemplateCSV,
    parseBulkTemplateXLSX,
    parseBulkTemplateData,
    readFileAsText,
    readFileAsBuffer
};
