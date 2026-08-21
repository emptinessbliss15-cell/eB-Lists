(() => {
  const db = window.eB?.supabase;
  if (!db) throw new Error('Shared Supabase client is not available');

  const style = document.createElement('style');
  style.textContent = `.eb-tree-drag-handle{display:inline-flex!important;align-items:center;justify-content:center;flex:0 0 20px;width:20px;min-width:20px;height:20px;padding:0!important;margin:0!important;border:0;background:transparent;color:inherit;cursor:grab;opacity:.72;font-size:14px;line-height:1;visibility:visible!important}.eb-tree-drag-handle:active{cursor:grabbing}.eb-tree-drag-handle:hover,.eb-tree-drag-handle:focus-visible{background:#8883;border-radius:3px;opacity:1}.eb-tree-entry.eb-tree-dragging{opacity:.45}.eb-tree-entry.eb-tree-drop-before{border-top:2px solid currentColor}.eb-tree-entry.eb-tree-drop-after{border-bottom:2px solid currentColor}.eb-tree-entry.eb-tree-drop-child{outline:1px dashed currentColor;outline-offset:1px}.eb-tree-collapse{flex:0 0 20px;width:20px;padding:2px!important;border:0;background:transparent;color:inherit}.eb-tree-collapse:hover{background:#8883;border-radius:3px}`;
  document.head.appendChild(style);

  let enhanceTimer = null;
  let drag = null;
  let suppressClick = false;
  const collapsed = new Set(JSON.parse(localStorage.getItem('eb-tree-collapsed') || '[]'));
  const saveCollapsed = () => localStorage.setItem('eb-tree-collapsed', JSON.stringify([...collapsed]));

  function applyCollapsed() {
    const rows = [...document.querySelectorAll('#tree .eb-tree-entry[data-list-id]')];
    const byId = new Map(rows.map(r => [r.dataset.listId, r]));
    rows.forEach(r => {
      r.parentElement.style.display = '';
      let p = r.dataset.parentId;
      while (p) {
        if (collapsed.has(p)) { r.parentElement.style.display = 'none'; break; }
        p = byId.get(p)?.dataset.parentId || null;
      }
    });
    rows.forEach(r => { const b = r.querySelector('.eb-tree-collapse'); if (b) b.textContent = collapsed.has(r.dataset.listId) ? '▸' : '▾'; });
  }

  async function hydrateIds() {
    const tree = document.getElementById('tree'); if (!tree) return false;
    const { data, error } = await db.from('lists').select('id,name,parent_list_id,position').order('position').order('created_at');
    if (error) return false;
    const byName = new Map(); const children = new Set();
    (data || []).forEach(x => { if (!byName.has(x.name)) byName.set(x.name, []); byName.get(x.name).push(x); if (x.parent_list_id) children.add(x.id); });
    tree.querySelectorAll('.eb-tree-entry').forEach(entry => {
      let list = null;
      if (entry.dataset.listId) list = (data || []).find(x => x.id === entry.dataset.listId);
      if (!list) {
        const node = entry.querySelector('.eb-tree-node');
        if (node) {
          const name = node.textContent.replace(/^•\s*/, '').replace(/\s+☷$/, '').replace(/\s+☰$/, '').trim();
          const candidates = byName.get(name) || []; if (candidates.length === 1) list = candidates[0];
        }
      }
      if (list) { entry.dataset.listId = list.id; entry.dataset.parentId = list.parent_list_id || ''; entry.dataset.hasChildren = children.has(list.id) ? '1' : '0'; }
    });
    return true;
  }

  async function persistGroup(rows, parentId) {
    for (let i = 0; i < rows.length; i++) {
      const result = await db.from('lists').update({ parent_list_id: parentId || null, position: i }).eq('id', rows[i].id);
      if (result.error) return result.error;
    }
    return null;
  }

  function clearTargets() {
    document.querySelectorAll('#tree .eb-tree-drop-before,#tree .eb-tree-drop-after,#tree .eb-tree-drop-child').forEach(x => x.classList.remove('eb-tree-drop-before','eb-tree-drop-after','eb-tree-drop-child'));
  }

  function targetAt(x, y) { return document.elementFromPoint(x, y)?.closest?.('#tree .eb-tree-entry[data-list-id]') || null; }

  function beginDrag(entry, event) {
    drag = { id: entry.dataset.listId, entry, pointerId: event.pointerId, started: false, x: event.clientX, y: event.clientY, target: null, mode: null };
    entry.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  async function finishDrag(event) {
    const state = drag; drag = null;
    if (!state?.started) return;
    suppressClick = true;
    const target = state.target;
    if (!target || target === state.entry) { clearTargets(); return; }

    const { data, error } = await db.from('lists').select('id,name,parent_list_id,position').order('position').order('created_at');
    if (error) { clearTargets(); return; }
    const all = data || [], dragged = all.find(x => x.id === state.id), targetList = all.find(x => x.id === target.dataset.listId);
    if (!dragged || !targetList) { clearTargets(); return; }

    let parent = targetList.parent_list_id || null, cycle = targetList.id === dragged.id;
    while (parent && !cycle) { if (parent === dragged.id) cycle = true; parent = all.find(x => x.id === parent)?.parent_list_id || null; }
    if (cycle) { clearTargets(); return; }

    const newParent = state.mode === 'child' ? targetList.id : (targetList.parent_list_id || null);
    const siblings = all.filter(x => (x.parent_list_id || null) === newParent && x.id !== dragged.id).sort((a,b) => a.position - b.position);
    let insert = siblings.length;
    if (state.mode !== 'child') {
      const targetIndex = siblings.findIndex(x => x.id === targetList.id);
      insert = state.mode === 'before' ? Math.max(0, targetIndex) : targetIndex + 1;
    }
    siblings.splice(insert, 0, dragged);
    const saveError = await persistGroup(siblings, newParent);
    clearTargets();
    if (saveError) return;
    window.dispatchEvent(new Event('eb:refresh-tree'));
  }

  function enhance() {
    const tree = document.getElementById('tree'); if (!tree) return;
    hydrateIds().then(ok => {
      if (!ok) return;
      tree.querySelectorAll('.eb-tree-row').forEach(row => {
        const entry = row.querySelector('.eb-tree-entry'), node = row.querySelector('.eb-tree-node');
        if (!entry || !node || !entry.dataset.listId || entry.dataset.dragEnhanced === '1') return;
        entry.dataset.dragEnhanced = '1';

        let collapse = entry.querySelector('.eb-tree-collapse');
        if (entry.dataset.hasChildren === '1' && !collapse) {
          collapse = document.createElement('button'); collapse.type='button'; collapse.className='eb-tree-collapse'; collapse.textContent=collapsed.has(entry.dataset.listId)?'▸':'▾'; collapse.title='Expand/collapse'; collapse.setAttribute('aria-label','Expand/collapse');
          collapse.onclick=e=>{e.stopPropagation();if(collapsed.has(entry.dataset.listId))collapsed.delete(entry.dataset.listId);else collapsed.add(entry.dataset.listId);saveCollapsed();applyCollapsed();};
          entry.insertBefore(collapse,node);
        }

        const handle = document.createElement('button'); handle.type='button'; handle.className='eb-tree-drag-handle'; handle.textContent='⠿'; handle.title='Drag to reorder or reparent'; handle.setAttribute('aria-label',handle.title);
        if (collapse) entry.insertBefore(handle, collapse); else entry.insertBefore(handle,node);

        handle.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (suppressClick) { suppressClick=false; } });
        handle.addEventListener('pointerdown', e => beginDrag(entry,e));
      });
      applyCollapsed();
    });
  }

  document.addEventListener('pointermove', event => {
    const state = drag; if (!state || event.pointerId !== state.pointerId) return;
    if (!state.started && Math.hypot(event.clientX-state.x,event.clientY-state.y) < 5) return;
    if (!state.started) { state.started=true; state.entry.classList.add('eb-tree-dragging'); }
    const target = targetAt(event.clientX,event.clientY); state.target=target; clearTargets();
    if (!target || target===state.entry) return;
    const rect=target.getBoundingClientRect(), y=event.clientY-rect.top;
    state.mode = y < rect.height*.25 ? 'before' : y > rect.height*.75 ? 'after' : 'child';
    target.classList.add(`eb-tree-drop-${state.mode}`);
    event.preventDefault();
  }, true);

  document.addEventListener('pointerup', event => { if (drag && event.pointerId === drag.pointerId) finishDrag(event); }, true);
  document.addEventListener('pointercancel', event => { if (drag && event.pointerId === drag.pointerId) { drag=null; clearTargets(); } }, true);
  window.addEventListener('click', () => { if (suppressClick) suppressClick=false; }, true);

  const scheduleEnhance = () => { clearTimeout(enhanceTimer); enhanceTimer=setTimeout(enhance,80); };
  const observer = new MutationObserver(scheduleEnhance); observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('eb:lists-rendered',scheduleEnhance);
  window.addEventListener('eb:refresh-tree',scheduleEnhance);
  enhance();
})();