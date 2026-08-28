// eB Lists application context menu bridge for VanillaGrid.
// Keep VanillaGrid responsible for row hit-testing and right-click handling,
// but replace its generic demo menu with eB Lists actions.
(function () {
  if (!window.VanillaGrid) return;

  window.VanillaGrid.prototype._bindContextMenu = function () {
    if (!this.tableEl) return;

    this.tableEl.addEventListener('contextmenu', (event) => {
      const rowEl = event.target.closest('tr[data-rowid]');
      if (!rowEl) return;

      event.preventDefault();
      event.stopPropagation();

      const rowData = this.rowById?.get(Number(rowEl.dataset.rowid));
      if (!rowData) return;

      this._showContextMenu(event.clientX, event.clientY, rowData);
    });
  };

  window.VanillaGrid.prototype._showContextMenu = function (x, y, rowData) {
    document.querySelectorAll('.vg-context-menu, #contextMenu').forEach(menu => menu.remove());

    const menu = document.createElement('div');
    menu.className = 'vg-context-menu eb-vg-context-menu';
    Object.assign(menu.style, {
      position: 'fixed',
      left: `${Math.min(x, window.innerWidth - 210)}px`,
      top: `${Math.min(y, window.innerHeight - 220)}px`,
      zIndex: '10001'
    });

    const isRoot = rowData.id === 'lists-root';
    const isList = !isRoot && !!rowData.list;
    const isItem = !isRoot && !isList && rowData.list_id != null;

    const actions = isRoot
      ? [
          ['New list', () => document.getElementById('listName')?.focus()],
          ['Refresh lists', () => window.refreshLists?.()]
        ]
      : isList
        ? [
            ['Open list', () => window.openList?.(rowData.list)],
            ['Rename list', () => window.renameList?.(rowData.list)],
            ['Delete list', () => window.deleteList?.(rowData.list)]
          ]
        : isItem
          ? [
              ['Edit item', () => {
                const row = document.querySelector(`#itemsGrid tr[data-rowid="${rowData.__vgid}"]`);
                const cell = row?.querySelector('td[data-column-key="text"]');
                if (cell) cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
              }],
              [rowData.completed ? 'Mark incomplete' : 'Mark complete', () => window.setItemCompleted?.(rowData, !rowData.completed)],
              ['Delete item', () => window.deleteItem?.(rowData)]
            ]
          : [];

    actions.forEach(([label, action]) => {
      const item = document.createElement('div');
      item.className = 'vg-context-menu-item';
      item.textContent = label;
      item.addEventListener('click', async () => {
        menu.remove();
        await action();
      });
      menu.appendChild(item);
    });

    if (!actions.length) return;
    document.body.appendChild(menu);

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 4) menu.style.left = `${Math.max(4, window.innerWidth - rect.width - 4)}px`;
    if (rect.bottom > window.innerHeight - 4) menu.style.top = `${Math.max(4, window.innerHeight - rect.height - 4)}px`;

    const close = (event) => {
      if (!menu.contains(event.target)) {
        menu.remove();
        document.removeEventListener('mousedown', close, true);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', close, true), 0);
  };
})();
