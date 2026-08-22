import { defineCustomElements } from '@revolist/revogrid/loader';

await defineCustomElements();

const supabase = window.eB?.supabase;
let grid = null;
let syncTimer = 0;
let syncing = false;

const setStatus = text => {
  const el = document.getElementById('status');
  if (el) el.textContent = text || '';
};

function scheduleSync(delay = 80) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncGrid, delay);
}

async function persistOrder(from, to) {
  const selectedId = window.eBListsTree?.selectedId;
  if (!supabase || !selectedId || !Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
  setStatus('Saving…');
  const { data, error } = await supabase.from('list_items').select('id, position').eq('list_id', selectedId).order('position').order('created_at');
  if (error || !data?.length) { setStatus(error?.message || 'Save failed'); return; }
  const reordered = [...data];
  const [moved] = reordered.splice(from, 1);
  if (!moved) return;
  reordered.splice(to, 0, moved);
  for (let index = 0; index < reordered.length; index++) {
    const result = await supabase.from('list_items').update({ position: index }).eq('id', reordered[index].id);
    if (result.error) { setStatus(`Save failed: ${result.error.message}`); return; }
  }
  setStatus('✓ Saved');
  scheduleSync(150);
}

function makeCheckboxTemplate(h, props) {
  const checked = !!props.model[props.prop];
  return h('input', { type: 'checkbox', checked, 'aria-label': 'Completed', onClick: event => event.stopPropagation(), onChange: event => {
    const next = !!event.target.checked;
    setStatus('Saving…');
    supabase?.from('list_items').update({ completed: next }).eq('id', props.model.id).then(({ error }) => {
      if (error) { setStatus(`Save failed: ${error.message}`); return; }
      setStatus('✓ Saved');
      scheduleSync(120);
    });
  }});
}

function makeActionsTemplate(h, props) {
  const wrap = h('div', { style: { display: 'flex', gap: '1px', alignItems: 'center' } });
  const button = (label, title, handler) => {
    const b = h('button', {
      type: 'button', title, 'aria-label': title,
      style: { padding: '1px 4px', margin: '0', lineHeight: '1.1', minHeight: '20px' },
      onClick: event => { event.stopPropagation(); handler(); }
    });
    b.textContent = label;
    wrap.appendChild(b);
  };
  button('×', 'Delete item', async () => {
    if (!confirm(`Delete “${props.model.text}”?`)) return;
    setStatus('Saving…');
    const { error } = await supabase.from('list_items').delete().eq('id', props.model.id);
    if (error) { setStatus(`Save failed: ${error.message}`); return; }
    setStatus('✓ Saved');
    await syncGrid();
  });
  return wrap;
}

async function syncGrid() {
  if (syncing || !supabase) return;
  const listView = document.getElementById('listView');
  const selectedId = window.eBListsTree?.selectedId;
  if (!listView || listView.hidden || !selectedId) return;

  syncing = true;
  setStatus('Refreshing…');
  try {
    const { data, error } = await supabase.from('list_items').select('*').eq('list_id', selectedId).order('position').order('created_at');
    if (error) { setStatus(`Refresh failed: ${error.message}`); return; }
    const rows = data || [];

    if (!grid) {
      grid = document.createElement('revo-grid');
      grid.className = 'eb-revo-grid';
      grid.theme = 'darkCompact';
      grid.resize = true;
      grid.canMoveColumns = true;
      grid.colSize = 140;
      grid.columns = [
        { prop: 'text', name: 'Item', size: 420, minSize: 140, rowDrag: true },
        { prop: 'completed', name: 'Done', size: 80, minSize: 70, readonly: true, cellTemplate: makeCheckboxTemplate },
        { prop: 'actionsDisplay', name: 'Actions', size: 90, minSize: 80, readonly: true, cellTemplate: makeActionsTemplate },
      ];
      grid.source = rows;

      grid.addEventListener('afteredit', async event => {
        const { model, prop, val } = event.detail || {};
        if (!model || !model.id || prop !== 'text') return;
        setStatus('Saving…');
        const { error: updateError } = await supabase.from('list_items').update({ text: String(val ?? '').trim() }).eq('id', model.id);
        if (updateError) { setStatus(`Save failed: ${updateError.message}`); return; }
        setStatus('✓ Saved');
        scheduleSync(150);
      });

      grid.addEventListener('roworderchange', event => {
        const { from, to } = event.detail || {};
        const activeList = window.eBLists?.getActiveList?.();
        if (!activeList?.ordered) {
          event.preventDefault?.();
          setStatus('Only ordered lists can be reordered.');
          return;
        }
        persistOrder(Number(from), Number(to));
      });

      const oldGrid = document.getElementById('listGrid');
      if (oldGrid) {
        oldGrid.hidden = true;
        oldGrid.parentElement?.insertBefore(grid, oldGrid);
      }
    } else {
      grid.source = rows;
      await grid.refresh?.('all');
    }
    setStatus('✓ Refreshed');
  } finally {
    syncing = false;
  }
}

async function addItem() {
  const listId = window.eBListsTree?.selectedId;
  const input = document.getElementById('item');
  const text = input?.value.trim();
  if (!supabase || !listId || !text) return;
  setStatus('Saving…');
  const { data: lastRows, error: readError } = await supabase.from('list_items').select('position').eq('list_id', listId).order('position', { ascending: false }).order('created_at', { ascending: false }).limit(1);
  if (readError) { setStatus(`Save failed: ${readError.message}`); return; }
  const position = (lastRows?.[0]?.position ?? -1) + 1;
  const user = window.eBAuth?.getUser?.();
  const payload = { list_id: listId, text, position };
  if (user?.id) payload.owner_id = user.id;
  const { error } = await supabase.from('list_items').insert(payload);
  if (error) { setStatus(`Save failed: ${error.message}`); return; }
  if (input) input.value = '';
  setStatus('✓ Saved');
  await syncGrid();
}

const listView = document.getElementById('listView');
if (listView) new MutationObserver(() => scheduleSync()).observe(listView, { attributes: true, attributeFilter: ['hidden'] });
window.addEventListener('eb-auth-session', () => scheduleSync(150));
window.addEventListener('eb:refresh-list', () => syncGrid());
document.getElementById('listRefresh')?.addEventListener('click', event => { event.preventDefault(); syncGrid(); });
document.getElementById('newItem')?.addEventListener('click', event => { event.preventDefault(); addItem(); });
document.getElementById('item')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addItem(); } });
const tree = document.getElementById('tree');
if (tree) new MutationObserver(() => scheduleSync()).observe(tree, { childList: true, subtree: true });
scheduleSync(250);