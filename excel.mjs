import { makeContact, TYPES } from './data.mjs';

export const HEADERS = ['Name', 'Organization', 'Job title', 'Favorite', ...TYPES, 'Notes'];

export function createWorkbook(xlsx, contacts) {
  const rows = contacts.map(contact => {
    const methods = TYPES.map(type => {
      const values = contact.methods.filter(method => method.type === type).map(method => method.value);
      if (!values.length) return '';
      const value = JSON.stringify(values);
      if (value.length > 32767) throw new Error('A contact method column exceeds Excel’s 32,767-character cell limit.');
      return value;
    });
    return [contact.name, contact.organization, contact.jobTitle, contact.favorite ? 'Yes' : 'No', ...methods, contact.notes];
  });
  const sheet = xlsx.utils.aoa_to_sheet([HEADERS, ...rows]);
  sheet['!cols'] = HEADERS.map((_, index) => ({ wch: index === 3 ? 12 : 25 }));
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, 'Contacts');
  return book;
}

function parseMethods(cell) {
  if (!cell) return [];
  if (cell.startsWith('[')) {
    const values = JSON.parse(cell);
    if (!Array.isArray(values) || !values.every(value => typeof value === 'string')) throw new Error('Invalid method list.');
    return values;
  }
  return cell.split(/\r?\n/);
}

export function readWorkbook(xlsx, buffer) {
  const signature = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (signature.join(',') !== '80,75,3,4') throw new Error('Choose a valid .xlsx workbook.');
  const workbook = xlsx.read(buffer, { type: 'array', sheets: 0 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The workbook has no worksheet.');
  const [header = [], ...rows] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: true });
  const columns = header.map(cell => String(cell).trim().toLowerCase());
  if (!columns.includes('name')) throw new Error('The first row must contain a Name column.');
  if (HEADERS.some(label => columns.filter(value => value === label.toLowerCase()).length > 1)) {
    throw new Error('Each recognized column must occur only once.');
  }
  return rows.flatMap((row, index) => {
    const get = label => String(row[columns.indexOf(label.toLowerCase())] ?? '').trim();
    if (!row.some(value => String(value).trim())) return [];
    const name = get('Name');
    if (!name) throw new Error('Row ' + (index + 2) + ' is missing a name.');
    const favorite = get('Favorite').toLowerCase();
    if (!['', 'yes', 'no', 'true', 'false', '1', '0'].includes(favorite)) {
      throw new Error('Row ' + (index + 2) + ' has an invalid Favorite value.');
    }
    let methods;
    try {
      methods = TYPES.flatMap(type => parseMethods(get(type)).map(value => ({ type, value })));
    } catch {
      throw new Error('Row ' + (index + 2) + ' has an invalid contact method list.');
    }
    return [makeContact({ name, organization: get('Organization'), jobTitle: get('Job title'),
      favorite: ['yes', 'true', '1'].includes(favorite), methods, notes: get('Notes') })];
  });
}

