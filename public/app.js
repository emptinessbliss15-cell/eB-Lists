const supabaseClient = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
const status = document.getElementById('status');
const app = document.getElementById('app');
const auth = document.getElementById('auth');
const tree = document.getElementById('tree');
const email = document.getElementById('email');
const password = document.getElementById('password');
const lists = document.getElementById('lists');
const items = document.getElementById('items');
let user = null;
let activeList = null;

function setStatus(text) { status.textContent = text || ''; }

async function refreshLists() {
  const { data, error } = await supabaseClient.from('lists').select('*').order('created_at');
  if (error) return setStatus(error.message);
  lists.innerHTML = '';
  data.forEach(list => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'eb-list-row';
    const open = document.createElement('button');
    open.className = 'secondary eb-list-open';
    open.type = 'button';
    open.textContent = `${list.name} ${list.ordered ? '· ordered' : '· unordered'}`;
    open.onclick = () => openList(list);
    const del = document.createElement('button');
    del.className = 'secondary eb-list-delete';
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Delete list';
    del.onclick = (event) => { event.stopPropagation(); deleteList(list); };
    row.append(open, del);
    li.appendChild(row);
    lists.appendChild(li);
  });
}

async function openList(list) {
  activeList = list;
  document.getElementById('activeList').textContent = list.name;
  document.getElementById('listMode').textContent = list.ordered ? 'Ordered · use ↑ / ↓ to arrange' : 'Unordered';
  items.classList.toggle('ordered-items', !!list.ordered);
  document.getElementById('listView').hidden = false;
  await refreshItems();
}

async function refreshItems() {
  if (!activeList) return;
  const { data, error } = await supabaseClient.from('list_items').select('*').eq('list_id', activeList.id).order('position').order('created_at');
  if (error) return setStatus(error.message);
  items.innerHTML = '';
  data.forEach((item, index) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'eb-spread eb-item-row';

    const toggle = document.createElement('button');
    toggle.className = 'secondary eb-item-text';
    toggle.type = 'button';
    toggle.textContent = item.completed ? '✓ ' + item.text : item.text;
    toggle.onclick = async () => {
      const result = await supabaseClient.from('list_items').update({ completed: !item.completed }).eq('id', item.id);
      if (result.error) setStatus(result.error.message); else refreshItems();
    };

    const controls = document.createElement('span');
    controls.className = 'eb-item-controls';

    if (activeList.ordered) {
      const up = document.createElement('button');
      up.className = 'secondary eb-order-button';
      up.type = 'button';
      up.textContent = '↑';
      up.title = 'Move up';
      up.disabled = index === 0;
      up.onclick = (event) => { event.stopPropagation(); moveItem(data, index, -1); };

      const down = document.createElement('button');
      down.className = 'secondary eb-order-button';
      down.type = 'button';
      down.textContent = '↓';
      down.title = 'Move down';
      down.disabled = index === data.length - 1;
      down.onclick = (event) => { event.stopPropagation(); moveItem(data, index, 1); };
      controls.append(up, down);
    }

    const del = document.createElement('button');
    del.className = 'secondary eb-order-button';
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Delete item';
    del.onclick = async (event) => {
      event.stopPropagation();
      const result = await supabaseClient.from('list_items').delete().eq('id', item.id);
      if (result.error) setStatus(result.error.message); else refreshItems();
    };
    controls.appendChild(del);

    row.append(toggle, controls);
    li.appendChild(row);
    items.appendChild(li);
  });
}

async function moveItem(data, index, direction) {
  const targetIndex = index + direction;
  if (!activeList?.ordered || targetIndex < 0 || targetIndex >= data.length) return;
  const reordered = [...data];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  const results = await Promise.all(
    reordered.map((item, position) => supabaseClient.from('list_items').update({ position }).eq('id', item.id))
  );
  const error = results.find(result => result.error)?.error;
  if (error) return setStatus(error.message);
  await refreshItems();
}

async function deleteList(list) {
  if (!confirm(`Delete list "${list.name}" and its items?`)) return;
  const result = await supabaseClient.from('lists').delete().eq('id', list.id);
  if (result.error) return setStatus(result.error.message);
  if (activeList?.id === list.id) {
    activeList = null;
    document.getElementById('listView').hidden = true;
  }
  await refreshLists();
}

async function applySession(session) {
  user = session?.user || null;
  auth.hidden = !!user;
  app.hidden = !user;
  tree.hidden = !user;
  document.getElementById('user').textContent = user?.email || '';
  if (user) await refreshLists();
}

document.getElementById('signIn').onclick = async () => {
  const result = await supabaseClient.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
  if (result.error) return setStatus(result.error.message);
  setStatus('');
  await applySession(result.data.session);
};

document.getElementById('signUp').onclick = async () => {
  const result = await supabaseClient.auth.signUp({ email: email.value.trim(), password: password.value });
  if (result.error) return setStatus(result.error.message);
  if (result.data.session) await applySession(result.data.session);
  else setStatus('Account created. Check your email if confirmation is required.');
};

document.getElementById('signOut').onclick = async () => {
  await supabaseClient.auth.signOut({ scope: 'local' });
  activeList = null;
  document.getElementById('listView').hidden = true;
  await applySession(null);
};

document.getElementById('newList').onclick = async () => {
  const input = document.getElementById('listName');
  const name = input.value.trim();
  if (!name) return;
  const ordered = document.getElementById('listOrdered').checked;
  const result = await supabaseClient.from('lists').insert({ name, owner_id: user.id, ordered });
  if (result.error) return setStatus(result.error.message);
  input.value = '';
  document.getElementById('listOrdered').checked = false;
  await refreshLists();
};

document.getElementById('newItem').onclick = async () => {
  const input = document.getElementById('item');
  const text = input.value.trim();
  if (!text || !activeList) return;
  const latest = await supabaseClient.from('list_items').select('position').eq('list_id', activeList.id).order('position', { ascending: false }).limit(1);
  if (latest.error) return setStatus(latest.error.message);
  const position = (latest.data?.[0]?.position ?? -1) + 1;
  const result = await supabaseClient.from('list_items').insert({ list_id: activeList.id, owner_id: user.id, text, position });
  if (result.error) return setStatus(result.error.message);
  input.value = '';
  await refreshItems();
};

document.getElementById('deleteList').onclick = () => { if (activeList) deleteList(activeList); };

supabaseClient.auth.onAuthStateChange((_event, session) => applySession(session));
supabaseClient.auth.getSession().then(({ data }) => applySession(data.session));
