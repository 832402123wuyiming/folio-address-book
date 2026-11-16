import { TYPES, filterContacts, makeContact, readContacts, sampleContacts, writeContacts } from './data.mjs';
import { createWorkbook, readWorkbook } from './excel.mjs';

const byId = id => document.getElementById(id);
const form = byId('contact-form');
const editor = byId('editor');
const methodList = byId('methods');
const fileInput = byId('file');
let contacts = [];
let favoriteOnly = false;
let editing = null;

function announce(message, error = false) {
  const status = byId('status');
  status.classList.toggle('error', error);
  status.textContent = message;
}

function update(next, message) {
  try {
    writeContacts(localStorage, next);
  } catch {
    announce('Changes could not be saved. Check browser storage and try again.', true);
    return false;
  }
  contacts = next;
  render();
  announce(message);
  return true;
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}

function button(label, action, className) {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function buildCard(contact) {
  const card = element('article', 'card');
  const header = element('header', 'card-header');
  const avatar = contact.name.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  const identity = element('div', 'identity');
  identity.append(element('h2', '', contact.name));
  const subtitle = [contact.jobTitle, contact.organization].filter(Boolean).join(' · ');
  if (subtitle) identity.append(element('p', '', subtitle));

  const star = button(contact.favorite ? '★' : '☆', () => {
    const favorite = !contact.favorite;
    if (!update(contacts.map(entry => entry.id === contact.id ? { ...entry, favorite } : entry),
      favorite ? 'Contact added to favorites.' : 'Contact removed from favorites.')) return;
    const replacement = document.getElementById(star.id);
    (replacement || byId('favorites')).focus();
  }, 'star');
  star.id = 'star-' + contact.id;
  star.setAttribute('aria-label', 'Favorite ' + contact.name);
  star.setAttribute('aria-pressed', String(contact.favorite));
  header.append(element('span', 'card-avatar', avatar), identity, star);

  const methods = element('ul', 'methods-list');
  for (const method of contact.methods) {
    const row = element('li');
    row.append(element('span', 'method-label', method.type), element('span', '', method.value));
    methods.append(row);
  }
  if (!contact.methods.length) methods.append(element('li', '', 'No contact methods'));
  const actions = element('div', 'card-actions');
  actions.append(button('Edit', () => openEditor(contact)),
    button('Delete', () => {
      if (window.confirm('Delete ' + contact.name + '?') &&
        update(contacts.filter(entry => entry.id !== contact.id), 'Contact deleted.')) byId('add').focus();
    }));
  card.append(header, methods);
  if (contact.notes) card.append(element('p', 'notes', contact.notes));
  card.append(actions);
  return card;
}

function render() {
  byId('total').textContent = contacts.length;
  byId('star-total').textContent = contacts.filter(contact => contact.favorite).length;
  byId('method-total').textContent = contacts.reduce((sum, contact) => sum + contact.methods.length, 0);
  byId('all').setAttribute('aria-pressed', String(!favoriteOnly));
  byId('favorites').setAttribute('aria-pressed', String(favoriteOnly));
  byId('view-title').textContent = favoriteOnly ? 'Favorites' : 'Address book';

  const query = byId('search').value;
  const visible = filterContacts(contacts, favoriteOnly, query);
  byId('cards').replaceChildren(...visible.map(buildCard));
  byId('empty').hidden = visible.length > 0;
  if (visible.length) return;

  if (query.trim()) {
    byId('empty-title').textContent = 'No matching contacts';
    byId('empty-copy').textContent = 'Try a different name, organization, or contact method.';
  } else if (favoriteOnly) {
    byId('empty-title').textContent = 'No favorites yet';
    byId('empty-copy').textContent = 'Use the star on a contact to save it here.';
  } else {
    byId('empty-title').textContent = 'Your address book is empty';
    byId('empty-copy').textContent = 'Add a contact, import a workbook, or load sample contacts.';
  }
  byId('sample').hidden = contacts.length > 0 || favoriteOnly || Boolean(query.trim());
}

function addMethod({ type = 'Phone', value = '' } = {}, focus = false) {
  const row = element('div', 'method-row');
  const select = element('select');
  select.setAttribute('aria-label', 'Contact method type');
  for (const choice of TYPES) select.add(new Option(choice, choice));
  select.value = type;
  const input = element('input');
  input.setAttribute('aria-label', 'Contact method value');
  input.placeholder = 'Value';
  input.maxLength = 2000;
  input.value = value;
  const remove = button('×', () => {
    row.remove();
    byId('add-method').focus();
  });
  remove.setAttribute('aria-label', 'Remove contact method');
  row.append(select, input, remove);
  methodList.append(row);
  if (focus) input.focus();
}

function openEditor(contact = null) {
  editing = contact;
  form.reset();
  form.elements.name.setCustomValidity('');
  byId('editor-title').textContent = contact ? 'Edit contact' : 'New contact';
  for (const key of ['name', 'organization', 'jobTitle', 'notes']) form.elements[key].value = contact?.[key] || '';
  methodList.replaceChildren();
  for (const method of contact?.methods || []) addMethod(method);
  if (!methodList.children.length) addMethod();
  editor.showModal();
  form.elements.name.focus();
}

function changeView(favorite) {
  favoriteOnly = favorite;
  render();
}

byId('all').addEventListener('click', () => changeView(false));
byId('favorites').addEventListener('click', () => changeView(true));
byId('search').addEventListener('input', render);
byId('add').addEventListener('click', () => openEditor());
byId('close').addEventListener('click', () => editor.close());
byId('cancel').addEventListener('click', () => editor.close());
byId('add-method').addEventListener('click', () => addMethod({}, true));
form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
form.addEventListener('submit', event => {
  event.preventDefault();
  const values = new FormData(form);
  if (!values.get('name').trim()) {
    form.elements.name.setCustomValidity('Enter a name.');
    form.elements.name.reportValidity();
    return;
  }
  const methods = [...methodList.children].map(row => ({
    type: row.querySelector('select').value,
    value: row.querySelector('input').value
  }));
  const contact = makeContact({ ...Object.fromEntries(values), id: editing?.id, favorite: editing?.favorite, methods });
  const next = editing ? contacts.map(entry => entry.id === editing.id ? contact : entry) : [...contacts, contact];
  if (update(next, editing ? 'Contact updated.' : 'Contact added.')) {
    editor.close();
    byId('add').focus();
  } else {
    window.alert(byId('status').textContent);
  }
});

byId('sample').addEventListener('click', () => {
  if (!contacts.length) update(sampleContacts(), 'Sample contacts added.');
});
byId('import').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;
  fileInput.value = '';
  if (!file) return;
  if (!globalThis.XLSX) return announce('The Excel module could not be loaded.', true);
  if (!/\.xlsx$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
    return announce('Choose an .xlsx workbook no larger than 10 MB.', true);
  }
  const control = byId('import');
  control.disabled = true;
  try {
    const imported = readWorkbook(globalThis.XLSX, await file.arrayBuffer());
    if (!imported.length) return announce('The workbook contains no contacts.');
    const count = imported.length;
    update([...contacts, ...imported], 'Imported ' + count + (count === 1 ? ' contact.' : ' contacts.'));
  } catch (error) {
    announce('Import failed. ' + error.message, true);
  } finally {
    control.disabled = false;
  }
});
byId('export').addEventListener('click', () => {
  try {
    const xlsx = globalThis.XLSX;
    if (!xlsx) throw new Error('The Excel module could not be loaded.');
    const filename = 'folio-contacts-' + new Date().toISOString().replace(/[:.]/g, '-') + '.xlsx';
    xlsx.writeFileXLSX(createWorkbook(xlsx, contacts), filename);
    announce(contacts.length ? 'Address book exported.' : 'Blank Excel template exported.');
  } catch (error) {
    announce('Export failed. ' + error.message, true);
  }
});

try {
  contacts = readContacts(localStorage);
} catch {
  announce('Existing contacts could not be read. Browser storage may be unavailable or damaged.', true);
}
render();

