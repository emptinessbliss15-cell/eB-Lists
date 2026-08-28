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
let treeGrid = null;
let itemsGrid = null;
let cachedLists = [];

function setStatus(text) {
  status.textContent = text || '';
}

function hideContextMenu() {
  contextMenu.style.display = 'none';
  contextMenu.innerHTML = '';
}

function showContextMenu(event, actions) {
  event.preventDefault();
  contextMenu.innerHTML = '';
  actions.forEach(({ label, action }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = async () => {
      hideContextMenu();
      await action();
    };
    contextMenu.appendChild(button);
  });
  contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;
  contextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 140)}px`;
  contextMenu.style.display = 'block';
}

document.addEventListener('click', hideContextMenu);

function createTreeGrid() {
  treeGrid?.destroy?.();
  treeGrid = new VanillaGrid('#treeGrid', {
    data: [{ id: 'lists-root', name: 'My Lists', hasChildren: true }],
    columns: [
      { key: 'name', label: 'List', sortable: true },
      {
        key: 'open',
        label: '',
        sortable: false,
        type: 'button',
        button: {
          text: 'Open',
          onClick: row => {
            if (row.id !== 'lists-root') openListById(row.id);
          }
        }
      }
    ],
    pagination: false,
    filterable: false,
    contextMenu: true,
    tree: {
      enabled: true,
      childrenKey: 'children',
      lazy: true,
      initiallyExpanded: true,
      hasChildrenKey: 'hasChildren'
    },
    loadChildren: async row => {
      if (row.id !== 'lists-root') return [];
      return cachedLists.map(list => ({
        id: list.id,
        name: `${list.name}${list.ordered ? ' · ordered' : ''}`,
        hasChildren: false,
        list
      }));
    }
  });
}

function createItemsGrid() {
  itemsGrid?.destroy?.();
  itemsGrid = new VanillaGrid('#itemsGrid', {
    data: [],
    columns: [
      { key: 'position', label: '#', type: 'number', sortable: true },
      { key: 'text', label: 'Item', sortable: true },
      {
        key: 'completed',
        label: 'Done',
        type: 'custom',
        sortable: true,
        render: value => value ? '✓' : ''
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
      const result = await supabase.from('list_items')
        .update({ text: String(newValue).trim() })
        .eq('id', row.id)
        .eq('owner_id', user.id);
      if (result.error) setStatus(result.error.message);
      else await refreshItems();
    },
    onRowDrop: async (draggedRow, targetRow, position) => {
      if (!activeList || !draggedRow || !targetRow || draggedRow.id === targetRow.id) return;
      const { data, error } = await supabase.from('list_items')
        .select('id, position')
        .eq('list_id', activeList.id)
        .order('position');
      if (error) return setStatus(error.message);

      const ids = data.map(row => row.id).filter(id => id !== draggedRow.id);
      const targetIndex = ids.indexOf(targetRow.id);
      const insertAt = Math.max(0, position === 'after' ? targetIndex + 1 : targetIndex);
      ids.splice(insertAt, 0, draggedRow.id);

      for (let i = 0; i < ids.length; i++) {
        const result = await supabase.from('list_items')
          .update({ position: i })
          .eq('id', ids[i])
          .eq('owner_id', user.id);
        if (result.error) return setStatus(result.error.message);
      }
      await refreshItems();
    }
  });
}

async function refreshLists() {
  const { data, error } = await supabase.from('lists').select('*').order('created_at');
  if (error) return setStatus(error.message);
  cachedLists = data || [];
  createTreeGrid();
}

async function refreshItems() {
  if (!activeList || !itemsGrid) return;
  const { data, error } = await supabase.from('list_items')
    .select('*')
    .eq('list_id', activeList.id)
    .order('position')
    .order('created_at');
  if (error) return setStatus(error.message);
  itemsGrid.setData((data || []).map(item => ({
    ...item,
    position: item.position ?? 0
  })));
}

function showActiveListName() {
  document.getElementById('activeList').textContent = activeList?.name || 'Select a list';
  document.getElementById('listMode').textContent = activeList
    ? (activeList.ordered ? 'Ordered' : 'Unordered')
    : '';
}

async function openListById(id) {
  const list = cachedLists.find(item => item.id === id);
  if (list) await openList(list);
}

async function openList(list) {
  activeList = list;
  showActiveListName();
  document.getElementById('listView').hidden = false;
  await refreshItems();
}

async function renameActiveList() {
  if (!activeList) return;
  const name = window.prompt('Rename list', activeList.name)?.trim();
  if (!name || name === activeList.name) return;
  const result = await supabase.from('lists')
    .update({ name })
    .eq('id', activeList.id)
    .eq('owner_id', user.id);
  if (result.error) return setStatus(result.error.message);
  activeList.name = name;
  showActiveListName();
  await refreshLists();
}

async function deleteActiveList() {
  if (!activeList) return;
  if (!window.confirm(`Delete "${activeList.name}"?`)) return;
  const result = await supabase.from('lists')
    .delete()
    .eq('id', activeList.id)
    .eq('owner_id', user.id);
  if (result.error) return setStatus(result.error.message);
  activeList = null;
  document.getElementById('listView').hidden = true;
  showActiveListName();
  await refreshLists();
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
    activeList = null;
    cachedLists = [];
    treeGrid?.destroy?.();
    itemsGrid?.setData?.([]);
  }
}

document.getElementById('signIn').onclick = async () => {
  const result = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  });
  if (result.error) return setStatus(result.error.message);
  setStatus('');
  await applySession(result.data.session);
};

document.getElementById('signUp').onclick = async () => {
  const result = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value
  });
  if (result.error) return setStatus(result.error.message);
  if (result.data.session) await applySession(result.data.session);
  else setStatus('Account created. Check your email if confirmation is required.');
};

document.getElementById('signOut').onclick = async () => {
  await supabase.auth.signOut({ scope: 'local' });
  await applySession(null);
};

document.getElementById('refreshLists').onclick = refreshLists;

document.getElementById('newList').onclick = async () => {
  const input = document.getElementById('listName');
  const name = input.value.trim();
  if (!name || !user) return;
  const ordered = document.getElementById('listOrdered').checked;
  const result = await supabase.from('lists').insert({ name, owner_id: user.id, ordered });
  if (result.error) return setStatus(result.error.message);
  input.value = '';
  document.getElementById('listOrdered').checked = false;
  await refreshLists();
};

document.getElementById('newItem').onclick = async () => {
  const input = document.getElementById('item');
  const text = input.value.trim();
  if (!text || !activeList || !user) return;
  const latest = await supabase.from('list_items')
    .select('position')
    .eq('list_id', activeList.id)
    .order('position', { ascending: false })
    .limit(1);
  if (latest.error) return setStatus(latest.error.message);
  const position = (latest.data?.[0]?.position ?? -1) + 1;
  const result = await supabase.from('list_items').insert({
    list_id: activeList.id,
    owner_id: user.id,
    text,
    position
  });
  if (result.error) return setStatus(result.error.message);
  input.value = '';
  await refreshItems();
};

document.getElementById('activeList').addEventListener('contextmenu', event => {
  if (!activeList) return;
  showContextMenu(event, [
    { label: 'Rename list', action: renameActiveList },
    { label: 'Delete list', action: deleteActiveList }
  ]);
});

supabase.auth.onAuthStateChange((_event, session) => applySession(session));
supabase.auth.getSession().then(({ data }) => applySession(data.session));
