export const TYPES = ['Phone', 'Email', 'Social', 'Address', 'Other'];
const STORAGE_KEY = 'folio.contacts.v1';

export function makeContact(fields) {
  return {
    id: fields.id || Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''),
    name: fields.name.trim(),
    organization: fields.organization.trim(),
    jobTitle: fields.jobTitle.trim(),
    notes: fields.notes.trim(),
    favorite: Boolean(fields.favorite),
    methods: fields.methods.map(({ type, value }) => ({ type, value: value.trim() })).filter(({ value }) => value)
  };
}

export function readContacts(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  const contacts = JSON.parse(raw);
  if (!Array.isArray(contacts)) throw new Error('Contact storage has an invalid format.');
  return contacts;
}

export function writeContacts(storage, contacts) {
  storage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function filterContacts(contacts, favoriteOnly, query) {
  const term = query.trim().toLowerCase();
  return contacts.filter(contact => {
    if (favoriteOnly && !contact.favorite) return false;
    const { name, organization, jobTitle, notes, methods } = contact;
    return [name, organization, jobTitle, notes, ...methods.flatMap(method => [method.type, method.value])]
      .some(field => field.toLowerCase().includes(term));
  });
}

export function sampleContacts() {
  return [
    ['Avery Brooks', 'Northstar Studio', 'Product Designer', true, [['Phone', '+1 202-555-0103'], ['Email', 'avery@example.com'], ['Social', '@avery.design']]],
    ['Jordan Rivera', 'Fieldwork Labs', 'Research Lead', false, [['Email', 'jordan@example.com'], ['Phone', '+1 202-555-0117']]],
    ['Morgan Chen', 'Kindred Press', 'Editor', true, [['Email', 'morgan@example.com'], ['Address', '42 Example Lane, Portland']]],
    ['Riley Singh', 'Goodlight', 'Photographer', false, [['Phone', '+1 202-555-0142'], ['Social', '@riley.photos']]]
  ].map(([name, organization, jobTitle, favorite, methods]) =>
    makeContact({ name, organization, jobTitle, favorite, notes: '', methods: methods.map(([type, value]) => ({ type, value })) })
  );
}

