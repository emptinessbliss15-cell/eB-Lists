import { defineCustomElements } from '@revolist/revogrid/loader';

await defineCustomElements();

const supabase = window.eB?.supabase;
let grid = null;
let syncTimer = 0;
let syncing = false;

function setStatus(text, error = false) {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = text;
    status.style.opacity = text ? '1' : '';
    status.dataset.state = error ? 'error' : 'ok';
  }
}

function scheduleSync(delay = 80) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncGrid, delay);
}

async function persistOrder(from, to) {
  const selectedId = window.eBListsTree?.selectedId;
  if (!supabase || !selectedId || !Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
  setStatus('Saving…');
  const { data, error } = await supabase
    .from('list_items')
    .select('id, position')
    .eq('list_id', selectedId)
    .order('position')
    .order('created_at');
  if (error || !data?.length) { setStatus('Save failed', true); return; }

  const reordered = [...data];
  const [moved] = reordered.splice(from, 1);
  if (!moved) { setStatus('Save failed', true); return; }
  reordered.splice(to, 0, moved);

  for (let index = 0; index < reordered.length; index++) {
    const result = await supabase
      .from('list_items')
      .update({ position: index })
      .eq('id', reordered[index].id);
    if (result.error) { setStatus('Save failed', true); return; }
  }
  setStatus('✓ Saved');
  scheduleSync(150);
}

function makeCheckboxTemplate(h, props) {
  const checked = !!props.model[props.prop];
  return h('input', {
    type: 'checkbox',
    checked,
    'aria-label': 'Completed',
    onClick: event => event.stopPropagation(),
    onChange: async event => {
      const next = !!event.target.checked;
      setStatus('Saving…');
      const { error } = await supabase?.from('list_items')
        .update({ completed: next })
        .eq('id', props.model.id) || {};
      if (error) { setStatus('Save failed', true); return; }
      setStatus('✓ Saved');
      scheduleSync(120);
    },
  });
}

async function syncGrid() {
  if (syncing || !supabase) return;
  const listView = document.getElementById('listView');
  const selectedId = window.eBListsTree?.selectedId;
  if (!listView || listView.hidden || !selectedId) return;

  syncing = true;
  try {
    setStatus('Refreshing…');
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', selectedId)
      .order('position')
      .order('created_at');
    if (error) { setStatus('Refresh failed', true); return; }

    const rows = data || [];

    if (!grid) {
      grid = document.createElement('revo-grid');
      grid.className = 'eb-revo-grid';
      grid.style.width = '100%';
      grid.style.height = '100%';
      grid.theme = 'darkCompact';
      grid.resize = true;
      grid.canMoveColumns = true;
      grid.colSize = 140;
      grid.columns = [
        { prop: 'text', name: 'Item', size: 420, minSize: 140, rowDrag: true },
        { prop: 'completed', name: 'Done', size: 80, minSize: 70, readonly: true, cellTemplate: makeCheckboxTemplate },
        { prop: 'actionsDisplay', name: 'Actions', size: 130, minSize: 100, readonly: true },
      ];
      grid.source = rows.map(row => ({ ...row, actionsDisplay: '＋  ↑  ↓  ×' }));

      grid.addEventListener('afteredit', async event => {
        const { model, prop, val } = event.detail || {};
        if (!model || !model.id || prop !== 'text') return;
        setStatus('Saving…');
        const { error: updateError } = await supabase
          .from('list_items')
          .update({ text: String(val ?? '').trim() })
          .eq('id', model.id);
        if (updateError) { setStatus('Save failed', true); return; }
        setStatus('✓ Saved');
        scheduleSync(150);
      });

      grid.addEventListener('roworderchange', event => {
        const { from, to } = event.detail || {};
        const ordered = !!window.eBLists?.getActiveList?.()?.ordered;
        if (!ordered) {
          event.preventDefault?.();
          scheduleSync(0);
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
      grid.source = rows.map(row => ({ ...row, actionsDisplay: '＋  ↑  ↓  ×' }));
    }
    setStatus('✓ Refreshed');
  } finally {
    syncing = false;
  }
}

const listView = document.getElementById('listView');
if (listView) {
  new MutationObserver(() => scheduleSync()).observe(listView, { attributes: true, attributeFilter: ['hidden'] });
}

window.addEventListener('eb-auth-session', () => scheduleSync(150));
window.addEventListener('eb:refresh-list', () => scheduleSync());

const tree = document.getElementById('tree');
if (tree) new MutationObserver(() => scheduleSync()).observe(tree, { childList: true, subtree: true });

scheduleSync(250);
