const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAttachmentContext, classifyExtension, parseCsv, prepareAttachment, sanitizeFilename } = require('../lib/attachments');

const file = (name, contents, mimetype = 'text/plain') => ({
  originalname: name,
  mimetype,
  buffer: Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
});

function minimalPdf(text) {
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET\n` : 'q Q\n';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const object of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += object; }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function minimalDocx(text) {
  const entries = [
    ['[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`]
  ];
  const crc32 = data => {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const local = [], central = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const filename = Buffer.from(name), data = Buffer.from(value), crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt32LE(crc, 14); localHeader.writeUInt32LE(data.length, 18); localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(filename.length, 26);
    local.push(localHeader, filename, data);
    const directoryHeader = Buffer.alloc(46);
    directoryHeader.writeUInt32LE(0x02014b50, 0); directoryHeader.writeUInt16LE(20, 4); directoryHeader.writeUInt16LE(20, 6);
    directoryHeader.writeUInt32LE(crc, 16); directoryHeader.writeUInt32LE(data.length, 20); directoryHeader.writeUInt32LE(data.length, 24);
    directoryHeader.writeUInt16LE(filename.length, 28); directoryHeader.writeUInt32LE(offset, 42);
    central.push(directoryHeader, filename);
    offset += localHeader.length + filename.length + data.length;
  }
  const centralData = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralData.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralData, end]);
}

test('classifies supported image, document, and code extensions', () => {
  assert.equal(classifyExtension('photo.webp').category, 'image');
  assert.equal(classifyExtension('report.docx').category, 'document');
  assert.equal(classifyExtension('main.ts').category, 'code');
  assert.equal(classifyExtension('notes.txt').category, 'document');
  assert.equal(classifyExtension('notes.txt', 'code').category, 'code');
  assert.equal(classifyExtension('archive.exe'), null);
});

test('sanitizes path components in uploaded filenames', () => {
  assert.equal(sanitizeFilename('..\\..\\private.js'), 'private.js');
});

test('parses CSV quoting, escaped quotes, and line breaks', () => {
  assert.deepEqual(parseCsv('name,note\r\nAda,"said ""hello"""\r\nLin,"two\nlines"'), [
    ['name', 'note'], ['Ada', 'said "hello"'], ['Lin', 'two\nlines']
  ]);
  assert.throws(() => parseCsv('name,note\nAda,"unclosed'), /unclosed quoted value/);
});

test('preserves code indentation and safely fences embedded code delimiters', async () => {
  const prepared = await prepareAttachment(file('sample.js', 'function f() {\n  return `value`;\n}\n'));
  assert.equal(prepared.text, 'function f() {\n  return `value`;\n}\n');
  const context = buildAttachmentContext([prepared]);
  assert.match(context[0], /File: sample\.js\nLanguage: javascript/);
  assert.match(context[0], /```javascript/);
  const textSource = await prepareAttachment(file('notes.txt', 'line one\n  line two\n'), {}, 'code');
  assert.equal(textSource.language, 'text');
  assert.equal(textSource.text, 'line one\n  line two\n');
});

test('parses JSON into readable structured content and rejects malformed JSON', async () => {
  const parsed = await prepareAttachment(file('data.json', '{"answer":42}', 'application/json'));
  assert.equal(parsed.text, '{\n  "answer": 42\n}');
  await assert.rejects(prepareAttachment(file('data.json', '{bad}', 'application/json')), /JSON file is malformed/);
});

test('formats CSV data as a readable table', async () => {
  const parsed = await prepareAttachment(file('data.csv', 'name,count\nAda,2', 'text/csv'));
  assert.match(parsed.text, /\| name \| count \|/);
  assert.match(parsed.text, /\| Ada \| 2 \|/);
});

test('extracts DOCX and Markdown text without losing line breaks', async () => {
  const docx = await prepareAttachment(file('report.docx', minimalDocx('DOCX parser works'),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  assert.match(docx.text, /DOCX parser works/);
  const markdown = await prepareAttachment(file('notes.md', '# Title\n\n- item one\n- item two', 'text/markdown'));
  assert.equal(markdown.text, '# Title\n\n- item one\n- item two');
  await assert.rejects(prepareAttachment(file('broken.docx', Buffer.from('PKbroken'),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document')), /not a valid DOCX/);
});

test('extracts text from PDFs and explains image-only scans', async () => {
  const parsed = await prepareAttachment(file('report.pdf', minimalPdf('PDF parser works'), 'application/pdf'));
  assert.match(parsed.text, /PDF parser works/);
  await assert.rejects(prepareAttachment(file('scan.pdf', minimalPdf(''), 'application/pdf')), /Scanned PDFs require OCR/);
});

test('rejects mismatched or malformed uploaded image data', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jMc8AAAAASUVORK5CYII=', 'base64');
  const image = await prepareAttachment(file('pixel.png', png, 'image/png'));
  assert.equal(image.mimeType, 'image/png');
  await assert.rejects(prepareAttachment(file('photo.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png')), /does not match a supported/);
  await assert.rejects(prepareAttachment(file('photo.png', Buffer.from('not an image'), 'image/png')), /does not match a supported/);
  await assert.rejects(prepareAttachment(file('photo.png', png, 'image/jpeg')), /MIME type does not match/);
});

test('enforces configured file and extracted-content limits', async () => {
  await assert.rejects(prepareAttachment(file('large.txt', '12345'), { documentBytes: 4 }), /must be 4 bytes or smaller/);
  const large = await prepareAttachment(file('large.txt', 'a'.repeat(80_001)));
  const excerpts = buildAttachmentContext([large], 'summarize this document');
  assert.ok(excerpts.some(context => context.includes('Document excerpt: large.txt')));
  assert.ok(excerpts.join('\n\n').length <= 80_000);
});
