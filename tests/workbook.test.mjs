import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { filterContacts, makeContact, readContacts, sampleContacts, writeContacts } from '../dist/data.mjs';
import { createWorkbook, readWorkbook } from '../dist/excel.mjs';

const xlsx = createRequire(import.meta.url)('../dist/vendor/xlsx.mini.min.js');
const bytes = workbook => xlsx.write(workbook, { type: 'array', bookType: 'xlsx' });
function workbook(rows) {
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(rows), 'Contacts');
  return book;
}

test('combines search and favorites and searches method values', () => {
  const contacts = sampleContacts();
  assert.deepEqual(filterContacts(contacts, true, 'EXAMPLE.COM').map(({ name }) => name), ['Avery Brooks', 'Morgan Chen']);
  assert.deepEqual(filterContacts(contacts, false, '@RILEY.PHOTOS').map(({ name }) => name), ['Riley Singh']);
});

test('round-trips contacts and favorites through storage', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(readContacts(storage), []);
  const contacts = sampleContacts();
  writeContacts(storage, contacts);
  assert.deepEqual(readContacts(storage), contacts);
});

test('real XLSX preserves repeated types, leading zeroes, punctuation and plain-text cells', () => {
  const contact = makeContact({
    name: '=Literal name', organization: 'Fieldwork Labs', jobTitle: 'Editor', notes: 'First\nSecond',
    favorite: true, methods: [
      { type: 'Phone', value: '00123' }, { type: 'Phone', value: '+1 202-555-0123' },
      { type: 'Email', value: 'test@example.com' }, { type: 'Social', value: 'https://example.com/u?a=1&b=2' },
      { type: 'Address', value: 'A; B, C' }, { type: 'Other', value: '[custom] "quoted"' }
    ]
  });
  const book = createWorkbook(xlsx, [contact]);
  assert.equal(book.Sheets.Contacts.A2.t, 's');
  assert.equal(book.Sheets.Contacts.A2.f, undefined);
  const [restored] = readWorkbook(xlsx, bytes(book));
  assert.deepEqual({ ...restored, id: contact.id }, contact);
});

test('accepts reordered columns and newline-delimited methods', () => {
  const [restored] = readWorkbook(xlsx, bytes(workbook([['Phone', 'Favorite', 'Name'], ['00042\n00043', 'YES', 'Alex']])));
  assert.equal(restored.name, 'Alex');
  assert.equal(restored.favorite, true);
  assert.deepEqual(restored.methods.map(method => method.value), ['00042', '00043']);
});

test('reports invalid workbook data and accepts a blank template', () => {
  assert.throws(() => readWorkbook(xlsx, new Uint8Array([1, 2, 3]).buffer), /valid .xlsx/);
  assert.throws(() => readWorkbook(xlsx, bytes(workbook([['Email'], ['x@example.com']]))), /Name column/);
  assert.throws(() => readWorkbook(xlsx, bytes(workbook([['Name', 'Phone'], ['Valid', '002'], ['', '003']]))), /Row 3/);
  assert.throws(() => readWorkbook(xlsx, bytes(workbook([['Name', 'Name'], ['A', 'B']]))), /only once/);
  assert.throws(() => readWorkbook(xlsx, bytes(workbook([['Name', 'Favorite'], ['A', 'maybe']]))), /invalid Favorite/);
  assert.throws(() => readWorkbook(xlsx, bytes(workbook([['Name', 'Phone'], ['A', '[1]']]))), /invalid contact method/);
  assert.deepEqual(readWorkbook(xlsx, bytes(createWorkbook(xlsx, []))), []);
});

