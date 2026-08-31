// eB Lists — clean-js + Holon schema
const SUPABASE_URL = globalThis.SUPABASE_URL || 'https://zaabghrczrbqkxrhkinj.supabase.co';
const SUPABASE_KEY = globalThis.SUPABASE_KEY || 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';
const $ = id => document.getElementById(id);
const state = { session: null, user: null, holons: [], relationships: [], relationshipTypes: [], active: null, treeGrid: null };

async function api(path, opt = {})
{
    const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(opt.headers || {}) };
    if (state.session?.access_token) h.Authorization = `Bearer ${state.session.access_token}`;
    const r = await fetch(SUPABASE_URL + path, { ...opt, headers: h });
    const t = await r.text();
    let d = null;
    try { d = t ? JSON.parse(t) : null }
    catch { d = t }
    if (!r.ok) throw Error(d?.message || d?.error_description || t || r.statusText);
    return d;
}

function status(s = '')
{
    $('status').textContent = s;
    console.log(s);
}

function signedIn(user)
{
    state.user = user;
    $('authout').hidden = !user;
    $('authin').hidden = !!user;
    $('app').hidden = !user;
    $('user').textContent = user?.email || '';
}

async function signIn()
{
    try
    {
        status('Signing in…');
        const d = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }) });
        state.session = d;
        localStorage.setItem('eb_session', JSON.stringify(d));
        signedIn(d.user);
        await loadModel();
        status('');
    }
    catch (e) { status(e.message) }
}

async function signUp()
{
    try
    {
        status('Creating account…');
        const d = await api('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }) });
        if (d?.session)
        {
            state.session = d.session;
            localStorage.setItem('eb_session', JSON.stringify(d.session));
            signedIn(d.user);
            await loadModel();
            status('');
        }
        else status('Account created. Check your email if confirmation is required.');
    }
    catch (e) { status(e.message) }
}

async function signOut()
{
    try { if (state.session) await api('/auth/v1/logout', { method: 'POST' }) }
    catch { }
    state.session = null;
    state.user = null;
    state.holons = [];
    state.relationships = [];
    state.relationshipTypes = [];
    state.active = null;
    localStorage.removeItem('eb_session');
    destroyTree();
    signedIn(null);
    $('lists').replaceChildren();
    $('items').replaceChildren();
    $('listView').hidden = true;
}

function destroyTree()
{
    if (state.treeGrid)
    {
        state.treeGrid.destroy();
        state.treeGrid = null;
    }
}

async function loadModel()
{
    status('Loading Holon model…');
    const [h, r, rt] = await Promise.all([
        api('/rest/v1/holons_view?select=*&order=created_at.asc'),
        api('/rest/v1/relationships_view?select=*&order=position.asc,created_at.asc'),
        api('/rest/v1/relationship_types?select=*&order=name.asc')
    ]);
    state.holons = h || [];
    state.relationships = r || [];
    state.relationshipTypes = rt || [];
    renderTree();
    renderHolonChoices();
    status('');
}

function relationLabel(r)
{
    return r.relationship_type || state.relationshipTypes.find(t => t.id === r.relationship_type_id)?.name || '';
}

function makeHierarchy()
{
    const byId = new Map(state.holons.map(h => [h.id, { ...h, children: [] }]));
    const roots = [];
    for (const h of byId.values())
    {
        const parent = state.relationships.find(r => r.source_holon_id === h.id && byId.has(r.target_holon_id));
        if (parent) byId.get(parent.target_holon_id).children.push(h);
        else roots.push(h);
    }
    const sort = (a, b) => (a.position ?? 999999) - (b.position ?? 999999) || String(a.name).localeCompare(String(b.name));
    const walk = rows => { rows.sort(sort); rows.forEach(x => walk(x.children)) };
    walk(roots);
    return roots;
}

function renderTree()
{
    destroyTree();
    if (!state.user) return;
    const rows = makeHierarchy();
    state.treeGrid = new VanillaGrid('#tree', {
        data: rows,
        columns: [{ key: 'name', label: 'Holons', sortable: true, format: (v, r) => `${v}${r.holon_type ? ` · ${r.holon_type}` : ''}` }],
        tree: { enabled: true, childrenKey: 'children', indent: 18, initiallyExpanded: true },
        sortable: false,
        filterable: false,
        pagination: false,
        selectable: true,
        contextMenu: true,
        rowDragDrop: false,
        onSelectionChange: selected => { if (selected?.[0]) openHolon(selected[0]) }
    });
}

function renderHolonChoices()
{
    const el = $('lists');
    el.replaceChildren();
    for (const h of state.holons)
    {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = `${h.name}${h.holon_type ? ` · ${h.holon_type}` : ''}`;
        b.onclick = () => openHolon(h);
        el.append(b);
    }
}

async function openHolon(h)
{
    state.active = h;
    $('listView').hidden = false;
    $('activeList').textContent = h.name;
    $('listMode').textContent = h.holon_type || 'Holon';
    renderRelatedHolons();
}

function renderRelatedHolons()
{
    const ul = $('items');
    ul.replaceChildren();
    if (!state.active) return;

    const related = state.relationships
        .filter(r => r.target_holon_id === state.active.id)
        .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999));

    for (const r of related)
    {
        const h = state.holons.find(x => x.id === r.source_holon_id);
        if (!h) continue;
        const li = document.createElement('li');
        li.className = 'item-row';
        li.title = relationLabel(r);
        li.onclick = () => openHolon(h);
        li.textContent = h.name;
        ul.append(li);
    }

    if (!ul.children.length)
    {
        const li = document.createElement('li');
        li.className = 'muted';
        li.textContent = 'No related holons';
        ul.append(li);
    }
}

function restore()
{
    try
    {
        const s = JSON.parse(localStorage.getItem('eb_session') || 'null');
        if (s?.access_token)
        {
            state.session = s;
            signedIn(s.user);
            loadModel().catch(e => status(e.message));
            return;
        }
    }
    catch { }
    signedIn(null);
}

$('signIn').onclick = signIn;
$('signUp').onclick = signUp;
$('signOut').onclick = signOut;
$('password').addEventListener('keydown', e => { if (e.key === 'Enter') signIn() });
$('refresh')?.addEventListener('click', () => window.location.reload());
restore();
