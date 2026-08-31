const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');

const status = document.getElementById('status');
const app = document.getElementById('app');
const auth = document.getElementById('auth');
const email = document.getElementById('email');
const password = document.getElementById('password');
const tree = document.getElementById('tree');
const lists = document.getElementById('lists');
const items = document.getElementById('items');
const listView = document.getElementById('listView');
const activeList = document.getElementById('activeList');
const listMode = document.getElementById('listMode');
const subheader = document.getElementById('subheader');

let user = null;
let selectedHolon = null;
let holons = [];
let relationships = [];
let relationshipTypes = [];

function setStatus(text) {
  status.textContent = text || '';
}

function setSubheader(text) {
  subheader.textContent = text || '';
}

function byId(rows) {
  return new Map(rows.map(row => [row.id, row]));
}

async function loadModel() {
  const [holonResult, relationshipResult, typeResult] = await Promise.all([
    supabase.from('holons_view').select('*').order('created_at'),
    supabase.from('relationships_view').select('*').order('position').order('created_at'),
    supabase.from('relationship_types').select('*').order('name')
  ]);

  if (holonResult.error) return setStatus(holonResult.error.message);
  if (relationshipResult.error) return setStatus(relationshipResult.error.message);
  if (typeResult.error) return setStatus(typeResult.error.message);

  holons = holonResult.data || [];
  relationships = relationshipResult.data || [];
  relationshipTypes = typeResult.data || [];

  renderTree();
  renderHolonList();
}

function relationshipName(id) {
  return relationshipTypes.find(type => type.id === id)?.name || '';
}

function childrenOf(parentId) {
  return relationships
    .filter(rel => rel.target_holon_id === parentId)
    .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999));
}

function renderTree() {
  tree.innerHTML = '';
  const roots = holons.filter(holon => !relationships.some(rel => rel.source_holon_id === holon.id));
  const rootRows = roots.length ? roots : holons.slice(0, 1);

  rootRows.forEach(root => {
    tree.appendChild(renderTreeNode(root, new Set()));
  });
}

function renderTreeNode(holon, path) {
  const li = document.createElement('div');
  li.className = 'tree-node';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tree-link${selectedHolon?.id === holon.id ? ' selected' : ''}`;
  button.textContent = holon.name;
  button.title = `${holon.name} · ${holon.holon_type || 'holon'}`;
  button.onclick = () => openHolon(holon);
  li.appendChild(button);

  if (path.has(holon.id)) return li;
  const nextPath = new Set(path);
  nextPath.add(holon.id);

  const children = childrenOf(holon.id);
  if (children.length) {
    const group = document.createElement('div');
    group.className = 'tree-children';
    children.forEach(rel => {
      const child = holons.find(item => item.id === rel.source_holon_id);
      if (!child) return;
      const childNode = renderTreeNode(child, nextPath);
      const relLabel = relationshipName(rel.relationship_type_id) || rel.relationship_type || '';
      if (relLabel) childNode.dataset.relationship = relLabel;
      group.appendChild(childNode);
    });
    li.appendChild(group);
  }

  return li;
}

function renderHolonList() {
  lists.innerHTML = '';
  holons.forEach(holon => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'list-link';
    button.textContent = `${holon.name} · ${holon.holon_type || 'holon'}`;
    button.onclick = () => openHolon(holon);
    li.appendChild(button);
    lists.appendChild(li);
  });
}

async function openHolon(holon) {
  selectedHolon = holon;
  renderTree();
  setSubheader(`${holon.holon_type || 'Holon'} · ${holon.name}`);
  activeList.textContent = holon.name;
  listMode.textContent = holon.holon_type || 'Holon';
  listView.hidden = false;

  const childRelations = childrenOf(holon.id);
  const childIds = childRelations.map(rel => rel.source_holon_id);
  const childHolons = holons.filter(item => childIds.includes(item.id));

  items.classList.toggle('ordered-items', childRelations.some(rel => rel.position !== null));
  items.innerHTML = '';

  childRelations.forEach(rel => {
    const child = childHolons.find(item => item.id === rel.source_holon_id);
    if (!child) return;

    const li = document.createElement('li');
    li.textContent = child.name;
    li.title = relationshipName(rel.relationship_type_id) || rel.relationship_type || '';
    li.onclick = () => openHolon(child);
    items.appendChild(li);
  });

  if (!items.children.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No related holons';
    items.appendChild(li);
  }
}

async function applySession(session) {
  user = session?.user || null;
  auth.hidden = !!user;
  app.hidden = !user;
  document.getElementById('user').textContent = user?.email || '';

  if (user) {
    await loadModel();
  } else {
    holons = [];
    relationships = [];
    relationshipTypes = [];
    selectedHolon = null;
    tree.innerHTML = '';
    lists.innerHTML = '';
    items.innerHTML = '';
    listView.hidden = true;
    setSubheader('');
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
  const result = await supabase.auth.signOut({ scope: 'local' });
  if (result.error) return setStatus(result.error.message);
  await applySession(null);
};

supabase.auth.onAuthStateChange((_event, session) => applySession(session));
supabase.auth.getSession().then(({ data, error }) => {
  if (error) return setStatus(error.message);
  applySession(data.session);
});
