import { defineCustomElements } from '@revolist/revogrid/loader';

await defineCustomElements();

const supabase = window.eB?.supabase;
let grid = null;
let syncTimer = 0;
let syncing = false;

function scheduleSync(delay = 80) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncGrid, delay);
}

async function syncGrid() {
  if (syncing || !supabase) return;
  const listView = document.getElementById('listView');
  const selectedId = window.eBListsTree?.selectedId;
  if (!listView || listView.hidden || !selectedId) return;

  syncing = true;
  try {
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', selectedId)
      .order('position')
      .order('created_at');
    if (error) return;

    const rows = (data || []).map(row => ({
      ...row,
      doneDisplay: row.completed ? '✓' : '',
      actionsDisplay: '＋  ↑  ↓  ×',
    }));

    if (!grid) {
      grid = document.createElement('revo-grid');
      grid.className = 'eb-revo-grid';
      grid.style.height = '300px';
      grid.style.width = '100%';
      grid.theme = 'darkCompact';
      grid.resize = true;
      grid.canMoveColumns = true;
      grid.colSize = 140;
      grid.columns = [
        { prop: 'text', name: 'Item', size: 420, minSize: 140 },
        { prop: 'doneDisplay', name: 'Done', size: 80, minSize: 70, readonly: true },
        { prop: 'actionsDisplay', name: 'Actions', size: 130, minSize: 100, readonly: true },
      ];
      grid.source = rows;

      grid.addEventListener('afteredit', async event => {
        const { model, prop, val } = event.detail || {};
        if (!model || !model.id || prop !== 'text') return;
        const { error: updateError } = await supabase
          .from('list_items')
          .update({ text: String(val ?? '').trim() })
          .eq('id', model.id);
        if (!updateError) scheduleSync(150);
      });

      const oldGrid = document.getElementById('listGrid');
      if (oldGrid) {
        oldGrid.hidden = true;
        oldGrid.parentElement?.insertBefore(grid, oldGrid);
      }
    } else {
      grid.source = rows;
    }
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
