const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');

const status = document.getElementById('status');
const app = document.getElementById('app');
const auth = document.getElementById('auth');
const email = document.getElementById('email');
const password = document.getElementById('password');
const treeHost = document.getElementById('treeGrid');
const itemsHost = document.getElementById('itemsGrid');
const contextMenu = document.getElementById('contextMenu');

let user = null;
let activeList = null;
let activeItem = null;
let treeGrid = null;
let itemsGrid = null;
let cachedLists = [];
let cachedHolons = new Map();
let cachedListChildren = new Map();

function setStatus(text) { status.textContent = text || ''; }

function jsonValue(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

function hideContextMenu() {
  contextMenu.style.display = 'none';
  contextMenu.innerHTML = '';
}

function showContextMenu(event, actions) {
  event.preventDefault();
  event.stopPropagation();
  contextMenu.innerHTML = '';
  actions.filter(Boolean).forEach(({ label, action }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = async () => { hideContextMenu(); await action(); };
    contextMenu.appendChild(button);
  });
  const width = 190;
  const height = Math.min(260, actions.length * 38 + 8);
  contextMenu.style.left = `${Math.max(4, Math.min(event.clientX, window.innerWidth - width - 4))}px`;
  contextMenu.style.top = `${Math.max(4, Math.min(event.clientY, window.innerHeight - height - 4))}px`;
  contextMenu.style.display = 'block';
}

document.addEventListener('click', hideContextMenu);
document.addEventListener('scroll', hideContextMenu, true);

function rowFromContextEvent(event, grid) {
  const rowEl = event.target.closest('tr[data-rowid]');
  if (!rowEl || !grid) return null;
  return grid.rowById?.get(rowEl.dataset.rowid) || grid.rowById?.get(Number(rowEl.dataset.rowid)) || null;
}

function createTreeGrid() {
  treeGrid?.destroy?.();
  const roots = [...cachedHolons.values()]
    .filter(holon => !holon.parentId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  treeGrid = new VanillaGrid('#treeGrid', {
    data: roots,
    columns: [{
      key: 'name', label: 'Holon', sortable: true,
      render: (value, row) => {
        const wrap = document.createElement('div');
        wrap.className = 'eb-tree-cell';
        if (row.hasChildren) {
          const arrow = document.createElement('button');
          arrow.type = 'button';
          arrow.className = 'eb-tree-arrow';
          arrow.textContent = row.expanded ? '▼' : '▶';
          arrow.setAttribute('aria-label', row.expanded ? 'Collapse' : 'Expand');
          arrow.addEventListener('click', event => {
            event.stopPropagation();
            if (row.expanded) treeGrid?.collapseRow?.(row.id);
            else treeGrid?.expandRow?.(row.id);
          });
          wrap.appendChild(arrow);
        } else {
          const spacer = document.createElement('span');
          spacer.className = 'eb-tree-arrow-spacer';
          wrap.appendChild(spacer);
        }
        const text = document.createElement('span');
        text.textContent = value ?? '';
        wrap.appendChild(text);
        return wrap;
      }
    }],
    pagination: false,
    filterable: false,
    contextMenu: true,
    tree: {
      enabled: true,
      childrenKey: 'children',
      lazy: true,
      initiallyExpanded: false,
      hasChildrenKey: 'hasChildren'
    },
    loadChildren: async row => cachedListChildren.get(row.id) || [],
    onRowClick: row => {
      if (row?.legacyList) openList(row.legacyList);
      else if (row?.holon) showHolon(row.holon);
    }
  });
}

async function refreshHolonTree() {
  const [holonsResult, fieldsResult, childrenResult, mappingsResult] = await Promise.all([
    supabase.from('holons').select('id,type_name,created_at'),
    supabase.from('holon_fields').select('holon_id,name,value,position').in('name', ['name', 'ordered']),
    supabase.from('holon_children').select('parent_holon_id,child_holon_id,relationship_name,position').order('position'),
    supabase.from('list_holons').select('list_id,holon_id,parent_holon_id,position')
  ]);

  for (const result of [holonsResult, fieldsResult, childrenResult, mappingsResult]) {
    if (result.error) return setStatus(result.error.message);
  }

  const fieldsByHolon = new Map();
  (fieldsResult.data || []).forEach(field => {
    const fields = fieldsByHolon.get(field.holon_id) || {};
    fields[field.name] = jsonValue(field.value);
    fieldsByHolon.set(field.holon_id, fields);
  });

  const mappingByHolon = new Map();
  (mappingsResult.data || []).forEach(mapping => mappingByHolon.set(mapping.holon_id, mapping));

  const listHolons = new Map();
  (holonsResult.data || []).forEach(holon => {
    if (holon.type_name !== 'List') return;
    const fields = fieldsByHolon.get(holon.id) || {};
    const mapping = mappingByHolon.get(holon.id);
    listHolons.set(holon.id, {
      id: holon.id,
      name: fields.name ?? '(unnamed)',
      ordered: !!fields.ordered,
      type_name: holon.type_name,
      position: mapping?.position ?? 0,
      parentId: null,
      legacyListId: mapping?.list_id || null,
      legacyList: null,
      holon,
      hasChildren: false
    });
  });

  const childMap = new Map();
  (childrenResult.data || []).forEach(edge => {
    const parent = listHolons.get(edge.parent_holon_id);
    const child = listHolons.get(edge.child_holon_id);
    if (!parent || !child) return;
    child.parentId = parent.id;
    child.position = edge.position ?? child.position;
    const children = childMap.get(parent.id) || [];
    children.push(child);
    parent.hasChildren = true;
    childMap.set(parent.id, children);
  });

  const legacyIds = [...listHolons.values()].map(row => row.legacyListId).filter(Boolean);
  let legacyLists = [];
  if (legacyIds.length) {
    const result = await supabase.from('lists').select('*').in('id', legacyIds);
    if (result.error) return setStatus(result.error.message);
    legacyLists = result.data || [];
  }
  const legacyById = new Map(legacyLists.map(list => [list.id, list]));

  listHolons.forEach(row => {
    row.legacyList = row.legacyListId ? legacyById.get(row.legacyListId) || null : null;
  });

  cachedHolons = listHolons;
  cachedListChildren = childMap;
  cachedLists = [...listHolons.values()].filter(row => row.legacyList).map(row => row.legacyList);

  childMap.forEach(children => children.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)));
  createTreeGrid();
}

function showHolon(holon) {
  activeList = null;
  document.getElementById('listView').hidden = true;
  document.getElementById('activeList').textContent = holon.name || 'Holon';
  document.getElementById('listMode').textContent = holon.type_name || '';
  setStatus('This holon is not backed by a legacy list yet.');
}

function createItemsGrid() {
  itemsGrid?.destroy?.();
  itemsGrid = new VanillaGrid('#itemsGrid', {
    data: [],
    columns: [
      { key: 'position', label: '#', type: 'number', sortable: true },
      { key: 'text', label: 'Item', sortable: true },
      {
        key: 'completed', label: 'Complete', type: 'custom', sortable: true,
        render: (value, row) => {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = !!value;
          checkbox.className = 'item-complete-checkbox';
          checkbox.dataset.itemId = row.id;
          checkbox.setAttribute('aria-label', `Complete ${row.text || 'item'}`);
          return checkbox;
        }
      }
    ],
    filterable: true,
    pageSize: 25,
    resizableColumns: true,
    editableRows: true,
    rowDragDrop: true,
    keyboardNavigation: true,
    contextMenu: true,
    onRowEdit: async (row, field, newValue, oldValue) => {
      if (field !== 'text' || newValue === oldValue || !activeList) return;
      const text = String(newValue).trim();
      if (!text) return refreshItems();
      const result = await supabase.from('list_items').update({ text }).eq('id', row.id).eq('owner_id', user.id);
      if (result.error) setStatus(result.error.message); else await refreshItems();
    },
    onRowDrop: async (draggedRow, targetRow, position) => {
      if (!activeList || !draggedRow || !targetRow || draggedRow.id === targetRow.id) return;
      const { data, error } = await supabase.from('list_items').select('id, position').eq('list_id', activeList.id).order('position');
      if (error) return setStatus(error.message);
      const ids = data.map(row => row.id).filter(id => id !== draggedRow.id);
      const targetIndex = ids.indexOf(targetRow.id);
      const insertAt = Math.max(0, position === 'after' ? targetIndex + 1 : targetIndex);
      ids.splice(insertAt, 0, draggedRow.id);
      for (let i = 0; i < ids.length; i++) {
        const result = await supabase.from('list_items').update({ position: i }).eq('id', ids[i]).eq('owner_id', user.id);
        if (result.error) return setStatus(result.error.message);
      }
      await refreshItems();
    }
  });
}

async function refreshLists() { await refreshHolonTree(); }

async function refreshItems() {
  if (!activeList || !itemsGrid) return;
  const { data, error } = await supabase.from('list_items').select('*').eq('list_id', activeList.id).order('position').order('created_at');
  if (error) return setStatus(error.message);
  itemsGrid.setData((data || []).map(item => ({ ...item, position: item.position ?? 0 })));
}

function showActiveListName() {
  document.getElementById('activeList').textContent = activeList?.name || 'Select a list';
  document.getElementById('listMode').textContent = activeList ? (activeList.ordered ? 'Ordered' : 'Unordered') : '';
}

async function openList(list) {
  activeList = list;
  showActiveListName();
  document.getElementById('listView').hidden = false;
  setStatus('');
  await refreshItems();
}

async function renameList(list) {
  if (!list || !user) return;
  const name = window.prompt('Rename list', list.name)?.trim();
  if (!name || name === list.name) return;
  const result = await supabase.from('lists').update({ name }).eq('id', list.id).eq('owner_id', user.id);
  if (result.error) return setStatus(result.error.message);
  const mapping = [...cachedHolons.values()].find(row => row.legacyListId === list.id);
  if (mapping) await supabase.from('holon_fields').update({ value: JSON.stringify(name) }).eq('holon_id', mapping.id).eq('name', 'name');
  if (activeList?.id === list.id) activeList.name = name;
  await refreshLists();
  showActiveListName();
}

async function deleteList(list) {
  if (!list || !user) return;
  if (!window.confirm(`Delete "${list.name}"?`)) return;
  const result = await supabase.from('lists').delete().eq('id', list.id).eq('owner_id', user.id);
  if (result.error) return setStatus(result.error.message);
  if (activeList?.id === list.id) {
    activeList = null;
    document.getElementById('listView').hidden = true;
    showActiveListName();
  }
  await refreshLists();
}

async function deleteItem(item) {
  if (!item || !user) return;
  if (!window.confirm(`Delete "${item.text}"?`)) return;
  const result = await supabase.from('list_items').delete().eq('id', item.id).eq('owner_id', user.id);
  if (result.error) return setStatus(result.error.message);
  await refreshItems();
}

async function setItemCompleted(item, completed) {
  if (!item || !user) return;
  const result = await supabase.from('list_items').update({ completed: !!completed }).eq('id', item.id).eq('owner_id', user.id);
  if (result.error) { setStatus(result.error.message); await refreshItems(); return; }
  item.completed = !!completed;
}

function setupContextMenus() {
  treeHost.addEventListener('contextmenu', event => {
    const row = rowFromContextEvent(event, treeGrid);
    if (!row) return;
    const list = row.legacyList;
    const actions = [];
    if (list) actions.push({ label: 'Open list', action: () => openList(list) });
    actions.push({ label: 'Refresh tree', action: refreshLists });
    if (list) {
      actions.push({ label: 'Rename list', action: () => renameList(list) });
      actions.push({ label: 'Delete list', action: () => deleteList(list) });
    }
    showContextMenu(event, actions);
  }, true);

  itemsHost.addEventListener('contextmenu', event => {
    const row = rowFromContextEvent(event, itemsGrid);
    if (!row) return;
    showContextMenu(event, [
      { label: 'Edit item', action: () => setStatus('Double-click the item text to edit.') },
      { label: row.completed ? 'Mark incomplete' : 'Mark complete', action: () => setItemCompleted(row, !row.completed) },
      { label: 'Delete item', action: () => deleteItem(row) }
    ]);
  }, true);

  itemsHost.addEventListener('click', event => {
    const checkbox = event.target.closest('.item-complete-checkbox');
    if (checkbox) event.stopPropagation();
  }, true);

  itemsHost.addEventListener('change', async event => {
    const checkbox = event.target.closest('.item-complete-checkbox');
    if (!checkbox) return;
    const row = itemsGrid?.rowById?.get(checkbox.closest('tr')?.dataset.rowid) || itemsGrid?.rowById?.get(Number(checkbox.closest('tr')?.dataset.rowid));
    if (row) await setItemCompleted(row, checkbox.checked);
  }, true);
}

async function applySession(session) {
  user = session?.user || null;
  auth.hidden = !!user;
  app.hidden = !user;
  document.getElementById('user').textContent = user?.email || '';
  if (user) {
    createItemsGrid();
    await refreshLists();
  } else {
    activeList = null; activeItem = null; cachedLists = [];
    cachedHolons.clear(); cachedListChildren.clear();
    treeGrid?.destroy?.(); itemsGrid?.setData?.([]);
  }
}

document.getElementById('signIn').onclick = async () => {
  const result = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
  if (result.error) return setStatus(result.error.message);
  setStatus(''); await applySession(result.data.session);
};

document.getElementById('signUp').onclick = async () => {
  const result = await supabase.auth.signUp({ email: email.value.trim(), password: password.value });
  if (result.error) return setStatus(result.error.message);
  if (result.data.session) await applySession(result.data.session);
  else setStatus('Account created. Check your email if confirmation is required.');
};

document.getElementById('signOut').onclick = async () => { await supabase.auth.signOut({ scope: 'local' }); await applySession(null); };
document.getElementById('refreshLists').onclick = refreshLists;

document.getElementById('newList').onclick = async () => {
  const input = document.getElementById('listName'); const name = input.value.trim();
  if (!name || !user) return;
  const ordered = document.getElementById('listOrdered').checked;
  const result = await supabase.from('lists').insert({ name, owner_id: user.id, ordered }).select().single();
  if (result.error) return setStatus(result.error.message);
  const list = result.data;
  const holonResult = await supabase.from('holons').insert({ owner_id: user.id, type_name: 'List' }).select().single();
  if (!holonResult.error) {
    const holon = holonResult.data;
    await supabase.from('holon_fields').insert([
      { holon_id: holon.id, name: 'name', field_type: 'text', value: JSON.stringify(name), position: 0 },
      { holon_id: holon.id, name: 'ordered', field_type: 'boolean', value: JSON.stringify(ordered), position: 1 }
    ]);
    await supabase.from('list_holons').insert({ list_id: list.id, holon_id: holon.id, owner_id: user.id, position: 0 });
  }
  input.value = ''; document.getElementById('listOrdered').checked = false; await refreshLists();
};

document.getElementById('newItem').onclick = async () => {
  const input = document.getElementById('item'); const text = input.value.trim();
  if (!text || !activeList || !user) return;
  const latest = await supabase.from('list_items').select('position').eq('list_id', activeList.id).order('position', { ascending: false }).limit(1);
  if (latest.error) return setStatus(latest.error.message);
  const position = (latest.data?.[0]?.position ?? -1) + 1;
  const result = await supabase.from('list_items').insert({ list_id: activeList.id, owner_id: user.id, text, position, completed: false });
  if (result.error) return setStatus(result.error.message);
  input.value = ''; await refreshItems();
};

setupContextMenus();
supabase.auth.onAuthStateChange((_event, session) => applySession(session));
supabase.auth.getSession().then(({ data }) => applySession(data.session));
