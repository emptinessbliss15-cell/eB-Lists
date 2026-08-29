// eB Lists — clean-js baseline
// Browser-native JavaScript only. Supabase is accessed through the REST/Auth HTTP APIs.

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

const $ = (id) => document.getElementById(id);
const state = { session: null, lists: [], activeList: null, items: [] };

async function supabase(path, options = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (state.session?.access_token) headers.Authorization = `Bearer ${state.session.access_token}`;
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.error_description || text || response.statusText);
  return data;
}

function setStatus(message = '') { $('status').textContent = message; }
function setSignedIn(user) {
  $('auth').hidden = !!user;
  $('app').hidden = !user;
  $('headerAuth').hidden = !user;
  $('user').textContent = user?.email || '';
}

async function signIn() {
  try {
    setStatus('Signing in…');
    const data = await supabase('/auth/v1/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email: $('email').value, password: $('password').value })
    });
    state.session = data;
    localStorage.setItem('eb_session', JSON.stringify(data));
    setSignedIn(data.user);
    await loadLists();
    setStatus('');
  } catch (error) { setStatus(error.message); }
}

async function signUp() {
  try {
    setStatus('Creating account…');
    await supabase('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: $('email').value, password: $('password').value }) });
    setStatus('Account created. Check your email if confirmation is required.');
  } catch (error) { setStatus(error.message); }
}

async function signOut() {
  try { if (state.session) await supabase('/auth/v1/logout', { method: 'POST' }); } catch (_) {}
  state.session = null; state.lists = []; state.activeList = null; state.items = [];
  localStorage.removeItem('eb_session');
  setSignedIn(null); renderLists(); renderItems(); setStatus('');
}

async function loadLists() {
  state.lists = await supabase('/rest/v1/lists?select=*&order=position.asc,created_at.asc');
  renderLists();
}

function renderLists() {
  const ul = $('lists'); ul.replaceChildren(); $('tree').replaceChildren();
  const treeList = document.createElement('ul');
  for (const list of state.lists) {
    const li = document.createElement('li');
    const button = document.createElement('button'); button.type = 'button'; button.textContent = list.name;
    button.onclick = () => selectList(list);
    li.append(button); ul.append(li);
    const treeLi = li.cloneNode(true); treeLi.querySelector('button').onclick = () => selectList(list); treeList.append(treeLi);
  }
  ul.append(); $('tree').append(treeList);
}

async function selectList(list) {
  state.activeList = list; $('listView').hidden = false; $('activeList').textContent = list.name;
  $('listMode').textContent = list.ordered ? 'Ordered' : 'Unordered';
  try {
    state.items = await supabase(`/rest/v1/items?select=*&list_id=eq.${encodeURIComponent(list.id)}&order=position.asc,created_at.asc`);
    renderItems();
  } catch (error) { setStatus(error.message); }
}

function renderItems() {
  const ul = $('items'); ul.replaceChildren();
  for (const item of state.items) {
    const li = document.createElement('li'); li.className = 'eb-item';
    const button = document.createElement('button'); button.type = 'button'; button.textContent = item.completed ? '✓' : '○';
    const text = document.createElement('span'); text.textContent = item.text; if (item.completed) text.className = 'done';
    button.onclick = () => toggleItem(item); li.append(button, text); ul.append(li);
  }
}

async function toggleItem(item) {
  try {
    await supabase(`/rest/v1/items?id=eq.${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ completed: !item.completed }) });
    item.completed = !item.completed; renderItems();
  } catch (error) { setStatus(error.message); }
}

async function createList() {
  const name = $('listName').value.trim(); if (!name) return;
  try {
    await supabase('/rest/v1/lists', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name, ordered: $('listOrdered').checked }) });
    $('listName').value = ''; await loadLists();
  } catch (error) { setStatus(error.message); }
}

async function createItem() {
  const text = $('item').value.trim(); if (!text || !state.activeList) return;
  try {
    await supabase('/rest/v1/items', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ list_id: state.activeList.id, text }) });
    $('item').value = ''; await selectList(state.activeList);
  } catch (error) { setStatus(error.message); }
}

function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem('eb_session') || 'null');
    if (saved?.access_token) { state.session = saved; setSignedIn(saved.user); loadLists().catch(e => setStatus(e.message)); return; }
  } catch (_) {}
  setSignedIn(null);
}

$('signIn').onclick = signIn; $('signUp').onclick = signUp; $('signOut').onclick = signOut;
$('newList').onclick = createList; $('newItem').onclick = createItem;
$('password').addEventListener('keydown', e => { if (e.key === 'Enter') signIn(); });
restoreSession();
