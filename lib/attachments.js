const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const CODE_LANGUAGES = {
  '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
  '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c',
  '.cs': 'csharp', '.go': 'go', '.rs': 'rust', '.php': 'php', '.html': 'html',
  '.css': 'css', '.scss': 'scss', '.sql': 'sql', '.sh': 'bash', '.yaml': 'yaml',
  '.yml': 'yaml', '.xml': 'xml', '.json': 'json', '.md': 'markdown', '.txt': 'text'
};
const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.txt', '.docx', '.csv', '.md', '.json']);
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const DOCUMENT_MIME_TYPES = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.csv': ['text/csv', 'application/csv', 'text/plain'],
  '.json': ['application/json', 'text/json', 'text/plain'],
  '.md': ['text/markdown', 'text/x-markdown', 'text/plain'],
  '.txt': ['text/plain']
};
const CODE_MIME_TYPES = ['text/plain', 'text/markdown', 'application/json', 'text/json', 'text/javascript', 'application/javascript', 'text/typescript', 'application/typescript',
  'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++', 'text/html', 'text/css', 'text/x-scss', 'text/x-sql',
  'application/sql', 'text/x-shellscript', 'application/x-sh', 'text/yaml', 'application/yaml', 'text/xml', 'application/xml'];
const MAX_EXTRACTED_CHARS = 100_000;
const MAX_CSV_ROWS = 500;
const MAX_CSV_COLUMNS = 50;
const MAX_CONTEXT_CHARS = 80_000;

function sanitizeFilename(filename) {
  const leaf = path.basename(String(filename || '').replace(/\\/g, '/'));
  return leaf.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120) || 'attachment';
}

function classifyExtension(filename, preferredKind) {
  const extension = path.extname(sanitizeFilename(filename)).toLowerCase();
  if (IMAGE_TYPES[extension]) return { extension, category: 'image' };
  if (preferredKind === 'code' && CODE_LANGUAGES[extension]) return { extension, category: 'code' };
  if (DOCUMENT_EXTENSIONS.has(extension)) return { extension, category: 'document' };
  if (CODE_LANGUAGES[extension]) return { extension, category: 'code' };
  return null;
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false, closedQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else value += char;
      continue;
    }
    if (char === '"') {
      if (value !== '' || closedQuote) throw new Error('The CSV contains a quote in an invalid position.');
      quoted = true;
    }
    else if (char === ',' || char === '\n' || char === '\r') {
      row.push(value);
      value = '';
      closedQuote = false;
      if (char !== ',') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        if (row.length > 1 || row[0] !== '' || rows.length > 0) rows.push(row);
        row = [];
        if (rows.length > MAX_CSV_ROWS) throw new Error(`CSV files are limited to ${MAX_CSV_ROWS} rows.`);
      }
      if (char === ',' && row.length >= MAX_CSV_COLUMNS) throw new Error(`CSV files are limited to ${MAX_CSV_COLUMNS} columns.`);
    } else if (closedQuote) {
      throw new Error('The CSV contains unexpected characters after a quoted value.');
    } else value += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted value.');
  if (value || row.length || closedQuote) {
    row.push(value);
    rows.push(row);
  }
  if (rows.length > MAX_CSV_ROWS) throw new Error(`CSV files are limited to ${MAX_CSV_ROWS} rows.`);
  if (rows.some(r => r.length > MAX_CSV_COLUMNS)) throw new Error(`CSV files are limited to ${MAX_CSV_COLUMNS} columns.`);
  return rows;
}

function textFromBuffer(buffer) {
  if (buffer.includes(0)) throw new Error('This file contains binary data and cannot be read as text.');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    throw new Error('This file is not valid UTF-8 text.');
  }
}

function validateDocxArchive(buffer, name) {
  const start = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= start; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error(`${name}: this is not a valid DOCX document.`);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  let offset = buffer.readUInt32LE(endOffset + 16);
  if (entryCount === 0xffff || directorySize === 0xffffffff || offset === 0xffffffff ||
      entryCount > 1000 || offset + directorySize > endOffset) {
    throw new Error(`${name}: the DOCX archive is malformed or too large to process safely.`);
  }
  let totalExpanded = 0;
  const names = new Set();
  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > endOffset || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`${name}: the DOCX archive is malformed.`);
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const expandedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const entryEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (entryEnd > endOffset || flags & 1 || compressedSize === 0xffffffff || expandedSize === 0xffffffff) {
      throw new Error(`${name}: the DOCX archive is malformed or encrypted.`);
    }
    const entryName = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    totalExpanded += expandedSize;
    if (totalExpanded > 20 * 1024 * 1024) throw new Error(`${name}: the DOCX expands beyond the safe 20 MB processing limit.`);
    names.add(entryName);
    offset = entryEnd;
  }
  if (!names.has('word/document.xml')) throw new Error(`${name}: the DOCX archive has no readable document content.`);
}

function checkImage(file, extension) {
  const b = file.buffer;
  let actual;
  if (b.length >= 33 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    let offset = 8, firstChunk = true, ended = false;
    while (offset + 12 <= b.length) {
      const length = b.readUInt32BE(offset);
      if (length > b.length - offset - 12) break;
      const chunk = b.toString('ascii', offset + 4, offset + 8);
      if (firstChunk && (chunk !== 'IHDR' || length !== 13)) break;
      firstChunk = false;
      offset += length + 12;
      if (chunk === 'IEND') { ended = length === 0; break; }
    }
    if (ended) actual = 'image/png';
  } else if (b.length >= 4 && b[0] === 255 && b[1] === 216 && b[2] === 255 && b.lastIndexOf(Buffer.from([255, 217])) > 2) actual = 'image/jpeg';
  else if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && b.readUInt32LE(4) + 8 === b.length) actual = 'image/webp';
  if (!actual || IMAGE_TYPES[extension] !== actual) throw new Error('The image extension does not match a supported PNG, JPEG, or WebP image.');
  if (file.mimetype && file.mimetype !== 'application/octet-stream' && file.mimetype !== actual) {
    throw new Error('The image MIME type does not match its actual file format.');
  }
  return actual;
}

function checkDeclaredMime(file, extension, category) {
  const declared = file.mimetype;
  if (!declared || declared === 'application/octet-stream') return;
  const codeMime = category === 'code' && (declared.startsWith('text/') ||
    ['application/json', 'text/json', 'application/javascript', 'application/typescript', 'application/xml',
      'application/yaml', 'application/sql', 'application/x-sh', 'video/mp2t'].includes(declared));
  if (codeMime) return;
  const allowed = category === 'code' ? CODE_MIME_TYPES : DOCUMENT_MIME_TYPES[extension] || [];
  if (!allowed.includes(declared)) throw new Error(`${sanitizeFilename(file.originalname)}: the declared MIME type is not valid for this file extension.`);
}

function formatCsv(rows) {
  if (!rows.length) return '';
  const width = Math.max(...rows.map(row => row.length));
  const header = rows[0];
  const columns = Array.from({ length: width }, (_, i) => header[i] || `Column ${i + 1}`);
  const renderRow = row => `| ${columns.map((_, i) => String(row[i] || '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')).join(' | ')} |`;
  return [renderRow(columns), `| ${columns.map(() => '---').join(' | ')} |`, ...rows.slice(1).map(renderRow)].join('\n');
}

function formatAttachment(file, text = file.text, excerpt) {
  if (file.category === 'code') {
    const fenceLength = Math.max(3, ...(text.match(/`+/g) || []).map(run => run.length + 1));
    const fence = '`'.repeat(fenceLength);
    return `File: ${file.name}\nLanguage: ${file.language}\n${fence}${file.language}\n${text}\n${fence}`;
  }
  if (excerpt) {
    const fenceLength = Math.max(3, ...(text.match(/~+/g) || []).map(run => run.length + 1));
    const fence = '~'.repeat(fenceLength);
    return `Document excerpt: ${file.name} (characters ${excerpt.start}-${excerpt.end})\n${fence}\n${text}\n${fence}`;
  }
  return `Document: ${file.name}\nExtracted content:\n${'~'.repeat(Math.max(3, ...(text.match(/~+/g) || []).map(run => run.length + 1)))}\n${text}\n${'~'.repeat(Math.max(3, ...(text.match(/~+/g) || []).map(run => run.length + 1)))}`;
}

function documentChunks(text, size = 6000, overlap = 300) {
  const chunks = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    const end = Math.min(text.length, start + size);
    chunks.push({ start: start + 1, end, text: text.slice(start, end) });
    if (end === text.length) break;
  }
  return chunks;
}

function buildAttachmentContext(attachments, question = '') {
  const textFiles = attachments.filter(file => file.category !== 'image');
  const complete = textFiles.map(file => formatAttachment(file));
  if (complete.join('\n\n').length <= MAX_CONTEXT_CHARS) return complete;
  const code = textFiles.filter(file => file.category === 'code').map(file => formatAttachment(file));
  const documents = textFiles.filter(file => file.category === 'document');
  if (!documents.length || code.join('\n\n').length >= MAX_CONTEXT_CHARS) {
    throw new Error(`Combined extracted content exceeds the ${MAX_CONTEXT_CHARS.toLocaleString()} character analysis limit. Attach fewer or smaller files.`);
  }
  const available = MAX_CONTEXT_CHARS - code.join('\n\n').length - documents.length * 240;
  const perDocument = Math.floor(available / documents.length);
  if (perDocument < 1024) throw new Error(`Combined extracted content exceeds the ${MAX_CONTEXT_CHARS.toLocaleString()} character analysis limit. Attach fewer or smaller files.`);
  const stopWords = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'about', 'please', 'document', 'summarize', 'summary', 'analyze', 'analysis', 'explain', 'find', 'what', 'where', 'when', 'which', 'there', 'their', 'into', 'are', 'was', 'were', 'can', 'could', 'would', 'should', 'have', 'has', 'had', 'how', 'all', 'main', 'key', 'important', 'information']);
  const terms = [...new Set((String(question).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(term => !stopWords.has(term)))];
  const excerpts = documents.map(file => {
    const chunkSize = Math.max(512, Math.min(6000, perDocument - 200));
    const chunks = documentChunks(file.text, chunkSize, Math.min(300, Math.floor(chunkSize / 10)));
    const ranked = chunks.map(chunk => ({
      ...chunk,
      score: terms.reduce((sum, term) => {
        const matches = chunk.text.toLowerCase().split(term).length - 1;
        return sum + Math.min(matches, 8);
      }, 0)
    }));
    let selected;
    if (ranked.some(chunk => chunk.score > 0)) {
      selected = ranked.sort((a, b) => b.score - a.score || a.start - b.start);
    } else if (ranked.length <= Math.max(1, Math.floor(perDocument / 6000))) {
      selected = ranked;
    } else {
      const count = Math.max(1, Math.floor(perDocument / 6000));
      selected = Array.from({ length: count }, (_, i) => ranked[Math.round(i * (ranked.length - 1) / Math.max(1, count - 1))]);
    }
    let used = 0;
    const parts = [];
    for (const chunk of selected) {
      const formatted = formatAttachment(file, chunk.text, chunk);
      if (used + formatted.length > perDocument && parts.length) continue;
      if (used + formatted.length > perDocument) break;
      parts.push(formatted);
      used += formatted.length;
    }
    if (!parts.length) throw new Error(`Combined extracted content exceeds the ${MAX_CONTEXT_CHARS.toLocaleString()} character analysis limit. Attach fewer or smaller files.`);
    return parts;
  }).flat();
  const context = [...code, ...excerpts];
  if (context.join('\n\n').length > MAX_CONTEXT_CHARS) {
    throw new Error(`Combined extracted content exceeds the ${MAX_CONTEXT_CHARS.toLocaleString()} character analysis limit. Attach fewer or smaller files.`);
  }
  return context;
}

async function prepareAttachment(file, limits = {}, preferredKind) {
  const name = sanitizeFilename(file.originalname);
  const match = classifyExtension(name, preferredKind);
  if (!match) throw new Error(`${name}: this file type is not supported.`);
  if (!file.buffer?.length) throw new Error(`${name}: empty files cannot be analyzed.`);
  const limit = match.category === 'image' ? limits.imageBytes : match.category === 'code' ? limits.codeBytes : limits.documentBytes;
  if (limit && file.buffer.length > limit) {
    const sizeLimit = limit >= 1024 * 1024
      ? `${Number((limit / 1024 / 1024).toFixed(2))} MB`
      : `${limit.toLocaleString()} bytes`;
    throw new Error(`${name}: ${match.category} files must be ${sizeLimit} or smaller.`);
  }

  const result = { name, category: match.category, extension: match.extension, size: file.buffer.length };
  if (match.category === 'image') {
    result.mimeType = checkImage(file, match.extension);
    result.buffer = file.buffer;
    return result;
  }
  checkDeclaredMime(file, match.extension, match.category);

  if (match.category === 'code') {
    result.language = CODE_LANGUAGES[match.extension];
    result.text = textFromBuffer(file.buffer);
  } else if (match.extension === '.pdf') {
    if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error(`${name}: this is not a valid PDF file.`);
    const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
    try {
      const info = await parser.getInfo();
      if (info.total > 200) {
        const error = new Error('PDF page limit exceeded');
        error.code = 'PDF_PAGE_LIMIT';
        throw error;
      }
      result.text = (await parser.getText()).text.replace(/^--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '').trim();
    } catch (error) {
      if (error.code === 'PDF_PAGE_LIMIT') throw new Error(`${name}: PDFs are limited to 200 pages.`);
      throw new Error(`${name}: the PDF could not be read. It may be malformed or password-protected.`);
    } finally {
      await parser.destroy();
    }
    if (!result.text.trim()) throw new Error(`${name}: no text could be extracted. Scanned PDFs require OCR, which is not enabled.`);
  } else if (match.extension === '.docx') {
    if (file.buffer.subarray(0, 2).toString('ascii') !== 'PK') throw new Error(`${name}: this is not a valid DOCX document.`);
    validateDocxArchive(file.buffer, name);
    try {
      result.text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    } catch {
      throw new Error(`${name}: the DOCX document could not be read.`);
    }
  } else {
    const text = textFromBuffer(file.buffer);
    if (match.extension === '.csv') result.text = formatCsv(parseCsv(text));
    else if (match.extension === '.json') {
      try { result.text = JSON.stringify(JSON.parse(text), null, 2); }
      catch { throw new Error(`${name}: the JSON file is malformed.`); }
    } else result.text = text;
  }

  if (!result.text.trim()) throw new Error(`${name}: the file contains no extractable text.`);
  if (result.text.length > MAX_EXTRACTED_CHARS) {
    throw new Error(`${name}: extracted text exceeds the ${MAX_EXTRACTED_CHARS.toLocaleString()} character analysis limit. Split the file into smaller parts.`);
  }
  return result;
}

module.exports = { MAX_EXTRACTED_CHARS, buildAttachmentContext, classifyExtension, parseCsv, prepareAttachment, sanitizeFilename };
