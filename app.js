// eB Lists — clean-js + locally vendored VanillaGrid
const SUPABASE_URL = globalThis.SUPABASE_URL || 'https://zaabghrczrbqkxrhkinj.supabase.co';
const SUPABASE_KEY = globalThis.SUPABASE_KEY || 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';
const $ = id => document.getElementById(id);
const state = { session: null, user: null, lists: [], active: null, items: [], treeGrid: null };

async function api(path, opt = {}) 
{
    const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(opt.headers || {}) };
    if (state.session?.access_token) h.Authorization = `Bearer ${state.session.access_token}`;
    const r = await fetch(SUPABASE_URL + path, { ...opt, headers: h });
    const t = await r.text(); let d = null;
    try { d = t ? JSON.parse(t) : null } catch { d = t } if (!r.ok) throw Error(d?.message || d?.error_description || t || r.statusText);
    return d
}

function status(s = '') 
{
    $('status').textContent = s
}

function signedIn(user) 
{
    state.user = user;
    $('authout').hidden = !user;
    $('authin').hidden = !!user;
    $('app').hidden = !user;
    $('user').textContent = user?.email || ''
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
        await loadLists();
        status('')
    }
    catch (e) 
    {
         status(e.message) 
    }

}

async function signUp()
{
    try {
        status('Creating account…');
        const d = await api('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }) });
        if (d?.session) 
            {
            state.session = d.session;
            signedIn(d.user);
            await loadLists();
            status('') 
        } 
        else 
            status('Account created. Check your email if confirmation is required.')
        }
        catch (e) 
        {
            status(e.message) 
        } 
}

async function signOut()
{
    try 
    {
        if (state.session) await api('/auth/v1/logout', { method: 'POST' })
    } 
    catch 
    { } 
    state.session = null;
    state.user = null;
    state.lists = [];
    state.active = null;
    state.items = [];
    localStorage.removeItem('eb_session');
    destroyTree();
    signedIn(null);
    $('lists').replaceChildren();
    $('items').replaceChildren()
}

function destroyTree() 
{
    if (state.treeGrid)
        {
            state.treeGrid.destroy();
            state.treeGrid = null 
        } 
}

function makeHierarchy(rows)
{
    const byId = new Map(rows.map(r => [r.id, { ...r, children: [] }]));
    const roots = [];
    for (const r of byId.values())
    { 
        if (r.parent_list_id && byId.has(r.parent_list_id)) byId.get(r.parent_list_id).children.push(r);
        else roots.push(r)
    }
    const sort = (a, b) => (a.position ?? 0) - (b.position ?? 0);
    const walk = a => 
    {
        a.sort(sort);
        a.forEach(x => walk(x.children)) 
    };
     walk(roots);
     return roots
}

async function loadLists()
{
    state.lists = await api('/rest/v1/lists?select=*&order=position.asc,created_at.asc');
    renderTree();
    renderListChoices() 
}

function renderTree()
{
    destroyTree();
    if (!state.user) return;
    status("rendering Tree...")
    const rows = makeHierarchy(state.lists);
    state.treeGrid = new VanillaGrid('#tree', { data: rows, columns: [{ key: 'name', label: 'Lists', sortable: true, format: (v, r) => `${v} ${r.ordered ? '☷' : '☰'}` }], tree: { enabled: true, childrenKey: 'children', indent: 18, initiallyExpanded: true }, sortable: false, filterable: false, pagination: false, selectable: true, contextMenu: true, rowDragDrop: false, onSelectionChange: selected => { if (selected?.[0]) openList(selected[0]) } }) 
    status("Tree rendered.")    
}

function renderListChoices()
{
    const el = $('lists');
     el.replaceChildren();
     for (const l of state.lists) 
    {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = l.name;
        b.onclick = () => openList(l);
        el.append(b)
    }
}

async function openList(l)
{
    state.active = l;
    $('listView').hidden = false;
    $('activeList').textContent = l.name;
    $('listMode').textContent = l.ordered ? 'Ordered' : 'Unordered';
    await loadItems()
}

async function loadItems()
{
    if (!state.active) return; 
    state.items = await api(`/rest/v1/list_items?select=*&list_id=eq.${encodeURIComponent(state.active.id)}&order=position.asc,created_at.asc`); renderItems()
}

function renderItems()
{
    const ul = $('items');
    ul.replaceChildren();
    const byParent = new Map();
    for (const i of state.items)
    {
        const p = i.parent_id || 'root';
        if (!byParent.has(p)) byParent.set(p, []); byParent.get(p).push(i) } function walk(parent, depth)
        {
            for (const i of byParent.get(parent) || []) 
            {
                    const li = document.createElement('li');
                    li.className = 'item-row';
                    const main = document.createElement('div');
                    main.className = 'item-main';
                    main.style.paddingLeft = `${depth * 20}px`;
                    const check = document.createElement('button');
                    check.className = 'item-check';
                    check.textContent = i.completed ? '✓' : '○';
                    check.title = i.completed ? 'Mark incomplete' : 'Mark complete';
                    check.onclick = () => toggleItem(i);
                    const text = document.createElement('span');
                    text.className = 'item-text' + (i.completed ? ' done' : '');
                    text.textContent = i.text;
                    main.append(check, text);
                    const actions = document.createElement('div'); actions.className = 'item-actions';
                    for (const [label, title, fn] of [['+', 'Add child', () => addChild(i)], ['✎', 'Edit', () => editItem(i)], ['×', 'Delete', () => deleteItem(i)]])
                    { 
                        const b = document.createElement('button');
                        b.textContent = label; b.title = title;
                        b.onclick = e => { e.stopPropagation(); fn() };
                        actions.append(b)
                    }
                    li.append(main, actions);
                    li.oncontextmenu = e => 
                    { 
                        e.preventDefault();
                        menu(e.clientX, e.clientY, i) 
                    };
                    ul.append(li); 
                    walk(i.id, depth + 1)
                } 
        }
        walk('root', 0)
}

async function toggleItem(i)
{ 
    try
    { 
        await api(`/rest/v1/list_items?id=eq.${encodeURIComponent(i.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ completed: !i.completed }) });
        await loadItems()
    } 
    catch (e) 
    { 
        status(e.message)
    } 
}

async function createList()
{
    const name = $('listName').value.trim();
    if (!name) return;
    try 
    {
        const position = state.lists.filter(l => !l.parent_list_id).length;
        await api('/rest/v1/lists', { method: 'POST', body: JSON.stringify({ name, ordered: $('listOrdered').checked, owner_id: state.user.id, parent_list_id: null, position }) }); $('listName').value = ''; $('listOrdered').checked = false;
        await loadLists() 
    } catch (e) 
    { 
        status(e.message) 
    } 
}

async function addSubList(parent)
{
    const name = prompt(`Name for a sub-list of “${parent.name}”:`);
    if (!name?.trim()) return;
    try 
    {
        const n = state.lists.filter(l => (l.parent_list_id || null) === parent.id).length; await api('/rest/v1/lists', { method: 'POST', body: JSON.stringify({ name: name.trim(), ordered: false, owner_id: state.user.id, parent_list_id: parent.id, position: n }) });
        await loadLists()
    } catch (e) 
    {
        status(e.message) 
    } 
}

async function createItem()
{
    if (!state.active) return;
    const text = $('item').value.trim();
    if (!text) return;
    try
    {
        const n = state.items.filter(i => !i.parent_id).length; await api('/rest/v1/list_items', { method: 'POST', body: JSON.stringify({ list_id: state.active.id, owner_id: state.user.id, text, position: n, parent_id: null }) }); $('item').value = '';
        await loadItems()
    } catch (e) 
    { 
        status(e.message) 
    } 
}

async function addChild(parent)
{
    if (!state.active) return;
    const text = prompt(`Add child item to “${parent.text}”:`);
    if (!text?.trim()) return;
    try
    {
        const n = state.items.filter(i => i.parent_id === parent.id).length; await api('/rest/v1/list_items', { method: 'POST', body: JSON.stringify({ list_id: state.active.id, owner_id: state.user.id, text: text.trim(), position: n, parent_id: parent.id }) });
        await loadItems()
    } catch (e) 
    {
         status(e.message)
    } 
}

async function editItem(i)
{ 
    const text = prompt('Edit item:', i.text); if (text === null || !text.trim()) return;
    try
    {
        await api(`/rest/v1/list_items?id=eq.${encodeURIComponent(i.id)}`, { method: 'PATCH', body: JSON.stringify({ text: text.trim() }) });
        await loadItems()
    } catch (e)
    {
        status(e.message) 
    } 
}

async function deleteItem(i)
{
    if (!confirm(`Delete “${i.text}”?`)) return;
    try 
    { 
        await api(`/rest/v1/list_items?id=eq.${encodeURIComponent(i.id)}`, { method: 'DELETE' });
        await loadItems() 
    } catch (e) 
    {
    status(e.message)
    }
}

async function deleteList(l)
{
    if (!confirm(`Delete “${l.name}”?`)) return;
    try 
    {
        await api(`/rest/v1/lists?id=eq.${encodeURIComponent(l.id)}`, { method: 'DELETE' });
        if (state.active?.id === l.id) 
        { 
            state.active = null; $('listView').hidden = true 
        }
        await loadLists() 
    } catch (e) 
    {
        status(e.message) 
    }
}

function menu(x, y, obj)
{
    document.getElementById('contextMenu')?.remove();
    const m = document.createElement('div');
    m.className = 'context-menu';
    m.id = 'contextMenu';
    const isItem = Object.hasOwn(obj, 'text');
    const choices = isItem ? [['Add child', () => addChild(obj)], ['Edit', () => editItem(obj)], ['Delete', () => deleteItem(obj)]] : [['Open', () => openList(obj)], ['Add sub-list', () => addSubList(obj)], ['Delete', () => deleteList(obj)]];
    for (const [label, fn] of choices) 
    {
        const b = document.createElement('button');
        b.textContent = label;
        b.onclick = () => { m.remove(); fn() }; m.append(b) } document.body.append(m);
        m.style.left = Math.min(x, innerWidth - 200) + 'px'; m.style.top = Math.min(y, innerHeight - 180) + 'px' 
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
            loadLists().catch(e => status(e.message));
            return
        }
    } catch 
    { } 
    signedIn(null)
}
document.addEventListener('click', e => { if (!e.target.closest('.context-menu')) document.getElementById('contextMenu')?.remove() });
 $('signIn').onclick = signIn;
 $('signUp').onclick = signUp;
 $('signOut').onclick = signOut;
 $('newList').onclick = createList;
 $('newItem').onclick = createItem; $('password').addEventListener('keydown', e => { if (e.key === 'Enter') signIn() });

 document.getElementById('refresh')?.addEventListener('click', () =>
{
    window.location.reload();
});
 restore();