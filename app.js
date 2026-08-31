const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');

const status = document.getElementById('status');
const app = document.getElementById('app');
const auth = document.getElementById('auth');
const email = document.getElementById('email');
const password = document.getElementById('password');
const tree = document.getElementById('tree');
const gridElement = document.getElementById('grid');
const detailGridElement = document.getElementById('detailGrid');
const activeList = document.getElementById('activeList');
const listMode = document.getElementById('listMode');
const subheader = document.getElementById('subheader');
const userElement = document.getElementById('user');

let user = null;
let selectedHolon = null;
let holons = [];
let relationships = [];
let holonGrid = null;
let relationshipGrid = null;

function setStatus(text) {
  status.textContent = text || '';
}

function setSubheader(text) {
  subheader.textContent = text || '';
}

function childrenOf(parentId) {
  return relationships
    .filter(rel => rel.target_holon_id === parentId)
    .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999));
}

function renderTree() {
  tree.innerHTML = '';
  const roots = holons.filter(holon => !relationships.some(rel => rel.source_holon_id === holon.id));
  const rows = roots.length ? roots : holons;
  rows.forEach(root => tree.appendChild(renderTreeNode(root, new Set())));
}

function renderTreeNode(holon, path) {
  const node = document.createElement('div');
  node.className = 'tree-node';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tree-link${selectedHolon?.id === holon.id ? ' selected' : ''}`;
  button.textContent = holon.name || '(unnamed)';
  button.title = `${holon.name || '(unnamed)'} · ${holon.holon_type || 'holon'}`;
  button.onclick = () => openHolon(holon);
  node.appendChild(button);

  if (path.has(holon.id)) return node;
  const nextPath = new Set(path);
  nextPath.add(holon.id);
  const children = childrenOf(holon.id);
  if (!children.length) return node;

  const group = document.createElement('div');
  group.className = 'tree-children';
  children.forEach(rel => {
    const child = holons.find(item => item.id === rel.source_holon_id);
    if (child) group.appendChild(renderTreeNode(child, nextPath));
  });
  node.appendChild(group);
  return node;
}

function createGrids() {
  holonGrid?.destroy();
  relationshipGrid?.destroy();

  holonGrid = new VanillaGrid(gridElement, {
    data: holons,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'holon_type', label: 'Type', sortable: true },
      { key: 'id', label: 'ID', sortable: true }
    ],
    filterable: true,
    sortable: true,
    pagination: true,
    pageSize: 25,
    selectable: true,
    contextMenu: true,
    onSelectionChange: rows => {
      if (rows.length) openHolon(rows[rows.length - 1]);
    }
  });

  relationshipGrid = new VanillaGrid(detailGridElement, {
    data: relationships,
    columns: [
      { key: 'source_holon', label: 'Source', sortable: true },
      { key: 'relationship_type', label: 'Relationship', sortable: true },
      { key: 'target_holon', label: 'Target', sortable: true },
      { key: 'position', label: 'Position', type: 'number', sortable: true }
    ],
    filterable: true,
    sortable: true,
    pagination: true,
    pageSize: 25,
    contextMenu: true
  });
}

async function loadModel() {
  setStatus('Loading Holon model…');
  const [holonResult, relationshipResult] = await Promise.all([
    supabase.from('holons_view').select('*').order('created_at'),
    supabase.from('relationships_view').select('*').order('position').order('created_at')
  ]);

  if (holonResult.error) return setStatus(`Holons: ${holonResult.error.message}`);
  if (relationshipResult.error) return setStatus(`Relationships: ${relationshipResult.error.message}`);

  holons = holonResult.data || [];
  relationships = relationshipResult.data || [];
  renderTree();
  createGrids();
  setStatus(`${holons.length} holons · ${relationships.length} relationships`);
}

function openHolon(holon) {
  selectedHolon = holon;
  renderTree();
  activeList.textContent = holon.name || '(unnamed)';
  listMode.textContent = holon.holon_type || 'Holon';
  setSubheader(`${holon.holon_type || 'Holon'} · ${holon.name || '(unnamed)'}`);

  const related = relationships.filter(rel => rel.source_holon_id === holon.id || rel.target_holon_id === holon.id);
  relationshipGrid?.setData(related);
}

async function applySession(session) {
  user = session?.user || null;
  auth.hidden = !!user;
  app.hidden = !user;
  userElement.textContent = user?.email || '';

  if (user) {
    await loadModel();
  } else {
    holons = [];
    relationships = [];
    selectedHolon = null;
    tree.innerHTML = '';
    holonGrid?.destroy();
    relationshipGrid?.destroy();
    holonGrid = null;
    relationshipGrid = null;
    setSubheader('Sign in to open the Holon Workspace');
    setStatus('');
  }
}

document.getElementById('signIn').onclick = async () => {
  const result = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
  if (result.error) return setStatus(result.error.message);
  await applySession(result.data.session);
};

document.getElementById('signUp').onclick = async () => {
  const result = await supabase.auth.signUp({ email: email.value.trim(), password: password.value });
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
