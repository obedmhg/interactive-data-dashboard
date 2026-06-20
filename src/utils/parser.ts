import { Dataset, DataColumn, DataType } from '../types';

/**
 * Intelligent parser that sanitizes text numbers (e.g. "$1,250.50" -> 1250.50, "85%" -> 85)
 */
function cleanNumericString(val: string): number | null {
  const clean = val.replace(/[$,\s]/g, '').replace(/%$/, '');
  if (clean === '') return null;
  const num = Number(clean);
  return isNaN(num) ? null : num;
}

/**
 * Quick inference of standard Date formats
 */
function isDateString(val: string): boolean {
  if (val.trim().length < 6) return false;
  // Year or Date patterns
  const dateRegex = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})$/;
  if (dateRegex.test(val.trim())) return true;
  const time = Date.parse(val);
  return !isNaN(time) && isNaN(Number(val));
}

export function parseCSVOrTabDelimited(rawText: string, datasetName = 'Imported Dataset'): Dataset {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    throw new Error('This data is empty. Please provide some rows.');
  }

  // Detect delimiter: comma, semicolon, or tab
  const firstLine = lines[0];
  const delimiters = [',', ';', '\t'];
  let delimiter = ',';
  let maxCount = -1;

  for (const d of delimiters) {
    const count = (firstLine.match(new RegExp(d === '\t' ? '\\t' : '\\' + d, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      delimiter = d;
    }
  }

  // Helper inside to parse a line respecting quotes
  const parseLine = (line: string): string[] => {
    const tokens: string[] = [];
    let insideQuote = false;
    let currentToken = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === delimiter && !insideQuote) {
        tokens.push(currentToken.trim().replace(/^['"]|['"]$/g, ''));
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    tokens.push(currentToken.trim().replace(/^['"]|['"]$/g, ''));
    return tokens;
  };

  const headers = parseLine(lines[0]).map((h, index) => h || `Column_${index + 1}`);
  const rows: Record<string, any>[] = [];

  for (let idx = 1; idx < lines.length; idx++) {
    const tokens = parseLine(lines[idx]);
    const rowObj: Record<string, any> = {};
    for (let hIdx = 0; hIdx < headers.length; hIdx++) {
      const headerName = headers[hIdx];
      const tokenVal = tokens[hIdx] !== undefined ? tokens[hIdx] : '';
      rowObj[headerName] = tokenVal;
    }
    rows.push(rowObj);
  }

  // Determine Column Types based on rows
  const columns: DataColumn[] = headers.map(header => {
    let numericCount = 0;
    let booleanCount = 0;
    let dateCount = 0;
    let totalNonEmpty = 0;

    rows.forEach(r => {
      const val = String(r[header] || '').trim();
      if (val === '') return;
      totalNonEmpty++;

      // check numeric
      if (cleanNumericString(val) !== null) {
        numericCount++;
      }
      // check boolean
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no') {
        booleanCount++;
      }
      // check date
      if (isDateString(val)) {
        dateCount++;
      }
    });

    let detectedType: DataType = 'string';
    if (totalNonEmpty > 0) {
      if (numericCount / totalNonEmpty > 0.7) {
        detectedType = 'number';
      } else if (dateCount / totalNonEmpty > 0.7) {
        detectedType = 'date';
      } else if (booleanCount / totalNonEmpty > 0.7) {
         detectedType = 'boolean';
      }
    }

    return {
      name: header,
      type: detectedType
    };
  });

  // Clean data records based on the inferred types
  const finalRows = rows.map(r => {
    const cleanedRow: Record<string, any> = {};
    columns.forEach(col => {
      const rawVal = String(r[col.name] || '').trim();
      if (rawVal === '') {
        cleanedRow[col.name] = col.type === 'number' ? null : '';
        return;
      }

      if (col.type === 'number') {
        const cleanedNum = cleanNumericString(rawVal);
        cleanedRow[col.name] = cleanedNum !== null ? cleanedNum : rawVal;
      } else if (col.type === 'boolean') {
        const lowerVal = rawVal.toLowerCase();
        cleanedRow[col.name] = (lowerVal === 'true' || lowerVal === 'yes');
      } else {
        cleanedRow[col.name] = rawVal;
      }
    });
    return cleanedRow;
  });

  return {
    id: `custom-${Date.now()}`,
    name: datasetName,
    columns,
    rows: finalRows,
    isCustom: true
  };
}

export function parseJSONData(rawText: string, datasetName = 'Imported JSON Dataset'): Dataset {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`JSON format invalid: ${(err as Error).message}`);
  }

  let arrayData: any[] = [];
  if (Array.isArray(parsed)) {
    arrayData = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Look for an array key
    const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
    if (arrayKey) {
      arrayData = parsed[arrayKey];
    } else {
      // Treat single object as a one-row dataset
      arrayData = [parsed];
    }
  }

  if (arrayData.length === 0) {
    throw new Error('The JSON does not contain an array of data objects.');
  }

  // Get union of all keys across objects to establish columns
  const allKeysSet = new Set<string>();
  arrayData.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeysSet.add(key));
    }
  });

  const headers = Array.from(allKeysSet);
  if (headers.length === 0) {
    throw new Error('Found no key attributes in JSON items.');
  }

  // Type inference logic
  const columns: DataColumn[] = headers.map(header => {
    let numericCount = 0;
    let booleanCount = 0;
    let dateCount = 0;
    let totalNonEmpty = 0;

    arrayData.forEach(item => {
      const rawVal = item[header];
      if (rawVal === undefined || rawVal === null) return;
      const strVal = String(rawVal).trim();
      if (strVal === '') return;
      totalNonEmpty++;

      if (typeof rawVal === 'number' || (typeof rawVal === 'string' && cleanNumericString(strVal) !== null)) {
        numericCount++;
      }
      if (typeof rawVal === 'boolean' || (typeof rawVal === 'string' && (strVal.toLowerCase() === 'true' || strVal.toLowerCase() === 'false'))) {
        booleanCount++;
      }
      if (isDateString(strVal)) {
        dateCount++;
      }
    });

    let detectedType: DataType = 'string';
    if (totalNonEmpty > 0) {
      if (numericCount / totalNonEmpty > 0.7) {
        detectedType = 'number';
      } else if (dateCount / totalNonEmpty > 0.7) {
        detectedType = 'date';
      } else if (booleanCount / totalNonEmpty > 0.7) {
        detectedType = 'boolean';
      }
    }

    return {
      name: header,
      type: detectedType
    };
  });

  // Restructure values
  const finalRows = arrayData.map(item => {
    const cleanedRow: Record<string, any> = {};
    columns.forEach(col => {
      const rawVal = item[col.name];
      if (rawVal === undefined || rawVal === null) {
        cleanedRow[col.name] = col.type === 'number' ? null : '';
        return;
      }

      if (col.type === 'number') {
        if (typeof rawVal === 'number') {
          cleanedRow[col.name] = rawVal;
        } else {
          const clNum = cleanNumericString(String(rawVal));
          cleanedRow[col.name] = clNum !== null ? clNum : rawVal;
        }
      } else if (col.type === 'boolean') {
        if (typeof rawVal === 'boolean') {
          cleanedRow[col.name] = rawVal;
        } else {
          cleanedRow[col.name] = String(rawVal).toLowerCase() === 'true';
        }
      } else {
        cleanedRow[col.name] = String(rawVal);
      }
    });
    return cleanedRow;
  });

  return {
    id: `custom-json-${Date.now()}`,
    name: datasetName,
    columns,
    rows: finalRows,
    isCustom: true
  };
}
