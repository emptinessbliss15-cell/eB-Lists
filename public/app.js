import { createHolabase } from './holabase.js';

const supabaseClient = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
const holabase = createHolabase(supabaseClient);
const status = document.getElementById('status');
const app = document.getElementById('app');
const auth = document.getElementById('auth');
const tree = document.getElementById('tree');
const signOut = document.getElementById('signOut');
const email = document.getElementById('email');
const password = document.getElementById('password');
const lists = document.getElementById('lists');
const items = document.getElementById('items');
const itemTemplate = document.getElementById('itemTemplate');
const newItemFields = document.getElementById('newItemFields');
let user = null;
let activeList = null;
let templates = [];

function setStatus(text) { status.textContent = text || ''; }
function displayText(item) {
  if (item.kind === 'legacy') return item.data.text || '';
  const fields = [...(item.data.holon?.holon_fields || [])].sort((a,b) => a.position - b.position);
  const preferred = fields.find(f => ['text','long_text'].includes(f.field_type) && f.name.toLowerCase() !== 'notes');
  const value = preferred?.value;
  return value == null ? item.data.holon?.type_name || 'Untitled' : String(value);
}
function holonField(item, name) {
  return item.kind === 'holon' ? (item.data.holon?.holon_fields || []).find(f => f.name === name) : null;
}

async function ensureDefaultTemplates() {
  let current = await holabase.getTemplates(user.id);
  const definitions = [
    { name: 'Todo', description: 'A simple action item.', fields: [
      { name: 'text', field_type: 'text', cardinality: '1..1', default_value: null },
      { name: 'completed', field_type: 'boolean', cardinality: '1..1', default_value: false }
    ]},
    { name: 'Shopping Item', description: 'An item that can be purchased.', fields: [
      { name: 'text', field_type: 'text', cardinality: '1..1', default_value: null },
      { name: 'quantity', field_type: 'number', cardinality: '0..1', default_value: 1 },
      { name: 'purchased', field_type: 'boolean', cardinality: '1..1', default_value: false }
    ]}
  ];
  for (const definition of definitions) {
    if (current.some(t => t.name === definition.name)) continue;
    const { data: created, error } = await supabaseClient.from('templates').insert({ owner_id: user.id, name: definition.name, description: definition.description }).select().single();
    if (error) throw error;
    const rows = definition.fields.map((field, position) => ({ ...field, template_id: created.id, config: {}, position }));
    const { error: fieldError } = await supabaseClient.from('template_fields').insert(rows);
    if (fieldError) throw fieldError;
  }
  current = await holabase.getTemplates(user.id);
  templates = current;
  renderTemplatePicker();
}

function renderTemplatePicker() {
  const previous = itemTemplate.value;
  itemTemplate.innerHTML = '';
  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    itemTemplate.appendChild(option);
  });
  if (templates.some(t => t.id === previous)) itemTemplate.value = previous;
  renderTemplateFields();
}

async function loadReferenceOptions(field) {
  const sourceListId = field.config?.source_list_id || field.config?.list_id;
  if (!sourceListId) return [];
  const displayField = field.config?.display_field || 'text';
  const { data, error } = await supabaseClient.from('list_items').select('id, text').eq('list_id', sourceListId).order('position').order('created_at');
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id, label: row[displayField] ?? row.text ?? row.id }));
}

function makeFieldControl(field) {
  const many = field.cardinality === '0..many' || field.cardinality === '1..many';
  const config = field.config || {};
  let input;
  if (field.field_type === 'boolean') {
    input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!field.default_value;
  } else if (field.field_type === 'choice' || field.field_type === 'reference') {
    input = document.createElement('select'); input.multiple = many; input.dataset.pendingReference = field.field_type === 'reference' ? 'true' : 'false';
    const options = field.field_type === 'choice' ? (Array.isArray(config.options) ? config.options : []) : [];
    options.forEach(optionValue => { const option = document.createElement('option'); option.value = typeof optionValue === 'object' ? optionValue.value : optionValue; option.textContent = typeof optionValue === 'object' ? (optionValue.label ?? optionValue.value) : optionValue; input.appendChild(option); });
    if (field.field_type === 'reference') loadReferenceOptions(field).then(options => options.forEach(optionValue => { const option = document.createElement('option'); option.value = optionValue.id; option.textContent = optionValue.label; input.appendChild(option); })).catch(error => setStatus(`Reference options failed: ${error.message}`));
  } else {
    input = document.createElement('input'); input.type = field.field_type === 'number' ? 'number' : field.field_type === 'url' ? 'url' : 'text';
    if (field.field_type === 'long_text') input.type = 'text';
    if (field.default_value != null && !Array.isArray(field.default_value)) input.value = field.default_value;
  }
  input.dataset.field = field.name; input.dataset.fieldType = field.field_type; input.dataset.cardinality = field.cardinality; return input;
}

function renderTemplateFields() {
  const template = templates.find(t => t.id === itemTemplate.value) || templates[0];
  if (!template) { newItemFields.innerHTML = ''; return; }
  itemTemplate.value = template.id; newItemFields.innerHTML = '';
  [...(template.template_fields || [])].sort((a,b) => a.position - b.position).forEach(field => { const label = document.createElement('label'); label.title = field.name; const input = makeFieldControl(field); if (field.field_type === 'boolean') label.className = 'boolean-field'; const name = document.createElement('span'); name.className = 'field-name'; name.textContent = field.name; label.append(input, name); newItemFields.appendChild(label); });
}

function readFieldValue(input, field) {
  if (field.field_type === 'boolean') return input.checked;
  if (field.field_type === 'number') return input.value === '' ? null : Number(input.value);
  if (field.field_type === 'choice' || field.field_type === 'reference') { const selected = [...input.selectedOptions].map(option => option.value); return (field.cardinality === '0..many' || field.cardinality === '1..many') ? selected : (selected[0] ?? null); }
  return input.value.trim();
}

async function refreshLists() {
  const { data, error } = await supabaseClient.from('lists').select('*').order('created_at');
  if (error) return setStatus(error.message);
  lists.innerHTML = '';
  data.forEach(list => {
    const li = document.createElement('li'); const row = document.createElement('div'); row.className = 'eb-list-row';
    const open = document.createElement('button'); open.className = 'secondary eb-list-open'; open.type = 'button'; open.textContent = `${list.name} ${list.ordered ? '· ordered' : '· unordered'}`; open.dataset.listId = list.id; open.onclick = () => openList(list);
    const rename = document.createElement('button'); rename.className = 'secondary eb-list-action'; rename.type = 'button'; rename.textContent = '✎'; rename.title = 'Rename list'; rename.onclick = e => { e.stopPropagation(); renameList(list); };
    const del = document.createElement('button'); del.className = 'secondary eb-list-action'; del.type = 'button'; del.textContent = '×'; del.title = 'Delete list'; del.onclick = e => { e.stopPropagation(); deleteList(list); };
    row.append(open, rename, del); li.appendChild(row); lists.appendChild(li);
  });
}

async function renameList(list) {
  const name = prompt('Rename list:', list.name); if (name === null) return; const newName = name.trim(); if (!newName || newName === list.name) return;
  const result = await supabaseClient.from('lists').update({ name: newName }).eq('id', list.id).eq('owner_id', user.id).select().single(); if (result.error) return setStatus(`Rename failed: ${result.error.message}`);
  if (activeList?.id === list.id) { activeList = { ...activeList, name: result.data.name }; document.getElementById('activeList').textContent = result.data.name; } await refreshLists(); setStatus('List renamed.');
}

async function openList(list) {
  activeList = list; document.getElementById('activeList').textContent = list.name; document.getElementById('listMode').textContent = list.ordered ? 'Ordered · use ↑ / ↓ to arrange' : 'Unordered'; items.classList.toggle('ordered-items', !!list.ordered); document.getElementById('listView').hidden = false; await refreshItems();
}

async function refreshItems() {
  if (!activeList) return;
  const legacyResult = await supabaseClient.from('list_items').select('*').eq('list_id', activeList.id).order('position').order('created_at'); if (legacyResult.error) return setStatus(legacyResult.error.message);
  let holons = []; try { holons = await holabase.getListHolons(activeList.id); } catch (error) { return setStatus(error.message); }
  const combined = [...(legacyResult.data || []).map(data => ({ kind: 'legacy', data })), ...holons.map(data => ({ kind: 'holon', data }))].sort((a,b) => (a.data.position ?? 0) - (b.data.position ?? 0) || new Date(b.data.created_at) - new Date(a.data.created_at));
  items.innerHTML = ''; combined.forEach((item, index) => renderItem(item, combined, index));
}

function renderItem(item, combined, index) {
  const li = document.createElement('li'); const row = document.createElement('div'); row.className = 'eb-spread eb-item-row';
  const text = displayText(item); const completedField = holonField(item, 'completed'); const purchasedField = holonField(item, 'purchased'); const quantityField = holonField(item, 'quantity');
  const toggleField = item.kind === 'holon' ? (completedField || purchasedField) : null;
  const isDone = item.kind === 'legacy' ? !!item.data.completed : !!toggleField?.value;
  if (item.kind === 'holon' && quantityField) {
    const quantity = document.createElement('span'); quantity.className = 'eb-item-quantity'; quantity.textContent = `×${quantityField.value ?? 1}`; quantity.title = 'Quantity'; row.appendChild(quantity);
  }
  const button = document.createElement('button'); button.className = 'secondary eb-item-text'; button.type = 'button'; button.textContent = isDone ? `✓ ${text}` : text; button.title = item.kind === 'holon' ? item.data.holon.type_name || 'Holon' : 'Legacy item';
  button.onclick = async () => {
    if (item.kind === 'legacy') { const result = await supabaseClient.from('list_items').update({ completed: !item.data.completed }).eq('id', item.data.id); if (result.error) return setStatus(result.error.message); }
    else if (toggleField) { try { await holabase.updateField(toggleField.id, !toggleField.value); } catch (error) { return setStatus(error.message); } }
    await refreshItems();
  };
  const controls = document.createElement('span'); controls.className = 'eb-item-controls';
  if (activeList.ordered) { const up = document.createElement('button'); up.className = 'secondary eb-order-button'; up.type = 'button'; up.textContent = '↑'; up.title = 'Move up'; up.disabled = index === 0; const down = document.createElement('button'); down.className = 'secondary eb-order-button'; down.type = 'button'; down.textContent = '↓'; down.title = 'Move down'; down.disabled = index === combined.length - 1; up.onclick = e => { e.stopPropagation(); moveCombinedItem(combined, index, -1); }; down.onclick = e => { e.stopPropagation(); moveCombinedItem(combined, index, 1); }; controls.append(up, down); }
  if (item.kind === 'holon' && purchasedField) { const purchased = document.createElement('input'); purchased.type = 'checkbox'; purchased.className = 'eb-item-purchased'; purchased.checked = !!purchasedField.value; purchased.title = 'Purchased'; purchased.onclick = async e => { e.stopPropagation(); try { await holabase.updateField(purchasedField.id, purchased.checked); await refreshItems(); } catch (error) { setStatus(error.message); } }; controls.appendChild(purchased); }
  const del = document.createElement('button'); del.className = 'secondary eb-order-button'; del.type = 'button'; del.textContent = '×'; del.title = 'Delete item'; del.onclick = async e => { e.stopPropagation(); await deleteItem(item); }; controls.appendChild(del); row.append(button, controls); li.appendChild(row); items.appendChild(li);
}

async function moveCombinedItem(combined, index, direction) { const target = index + direction; if (target < 0 || target >= combined.length) return; const reordered = [...combined]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]]; const results = await Promise.all(reordered.map((item, position) => item.kind === 'legacy' ? supabaseClient.from('list_items').update({ position }).eq('id', item.data.id) : supabaseClient.from('list_holons').update({ position }).eq('id', item.data.id))); const error = results.find(r => r.error)?.error; if (error) return setStatus(error.message); await refreshItems(); }
async function deleteItem(item) { if (!confirm(`Delete “${displayText(item)}”?`)) return; if (item.kind === 'legacy') { const result = await supabaseClient.from('list_items').delete().eq('id', item.data.id); if (result.error) return setStatus(result.error.message); } else { const result = await supabaseClient.from('list_holons').delete().eq('id', item.data.id); if (result.error) return setStatus(result.error.message); } await refreshItems(); }
async function deleteList(list) { if (!confirm(`Delete list "${list.name}" and its items?`)) return; const result = await supabaseClient.from('lists').delete().eq('id', list.id); if (result.error) return setStatus(result.error.message); if (activeList?.id === list.id) { activeList = null; document.getElementById('listView').hidden = true; } await refreshLists(); }
async function createTemplateItem() { if (!activeList) return; const template = templates.find(t => t.id === itemTemplate.value); if (!template) return setStatus('Choose an item type.'); const values = {}; for (const field of template.template_fields || []) { const input = newItemFields.querySelector(`[data-field="${CSS.escape(field.name)}"]`); if (!input) continue; values[field.name] = readFieldValue(input, field); } const textField = (template.template_fields || []).find(f => f.name === 'text'); if (textField && !String(values.text || '').trim()) return setStatus('Enter item text.'); try { const latest = await supabaseClient.from('list_holons').select('position').eq('list_id', activeList.id).order('position', { ascending: false }).limit(1); if (latest.error) throw latest.error; const legacyLatest = await supabaseClient.from('list_items').select('position').eq('list_id', activeList.id).order('position', { ascending: false }).limit(1); if (legacyLatest.error) throw legacyLatest.error; const position = Math.max(latest.data?.[0]?.position ?? -1, legacyLatest.data?.[0]?.position ?? -1) + 1; const holon = await holabase.createHolon({ ownerId: user.id, template, values }); await holabase.addToList({ listId: activeList.id, holonId: holon.id, ownerId: user.id, position }); const textInput = newItemFields.querySelector('[data-field="text"]'); if (textInput) textInput.value = ''; await refreshItems(); setStatus('Item added.'); } catch (error) { setStatus(`Add failed: ${error.message}`); } }
async function applySession(session) { user = session?.user || null; auth.hidden = !!user; app.hidden = !user; tree.hidden = !user; signOut.hidden = !user; if (user) { try { await ensureDefaultTemplates(); await refreshLists(); } catch (error) { setStatus(error.message); } } else { templates = []; itemTemplate.innerHTML = ''; newItemFields.innerHTML = ''; } }
document.getElementById('signIn').onclick = async () => { const result = await supabaseClient.auth.signInWithPassword({ email: email.value.trim(), password: password.value }); if (result.error) return setStatus(result.error.message); setStatus(''); await applySession(result.data.session); };
document.getElementById('signUp').onclick = async () => { const result = await supabaseClient.auth.signUp({ email: email.value.trim(), password: password.value }); if (result.error) return setStatus(result.error.message); if (result.data.session) await applySession(result.data.session); else setStatus('Account created. Check your email if confirmation is required.'); };
signOut.onclick = async () => { await supabaseClient.auth.signOut({ scope: 'local' }); activeList = null; document.getElementById('listView').hidden = true; await applySession(null); };
document.getElementById('newList').onclick = async () => { const input = document.getElementById('listName'); const name = input.value.trim(); if (!name) return; const ordered = document.getElementById('listOrdered').checked; const result = await supabaseClient.from('lists').insert({ name, owner_id: user.id, ordered }); if (result.error) return setStatus(result.error.message); input.value = ''; document.getElementById('listOrdered').checked = false; await refreshLists(); };
document.getElementById('newItem').onclick = createTemplateItem; itemTemplate.onchange = renderTemplateFields; document.getElementById('deleteList').onclick = () => { if (activeList) deleteList(activeList); }; supabaseClient.auth.onAuthStateChange((_event, session) => applySession(session)); supabaseClient.auth.getSession().then(({ data }) => applySession(data.session));