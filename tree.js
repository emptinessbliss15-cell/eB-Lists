import { buildTreeData } from './holons.js';

export function createTree({ element, holons, relationships, rootId, relationshipTypeId, onSelect, onDelete })
{
  const data = buildTreeData(holons, relationships, rootId, relationshipTypeId);

  const grid = new VanillaGrid(element, {
    data,
    columns: [
      {
        key: 'name',
        label: 'Holons',
        sortable: true,
      },
    ],
    tree: {
      enabled: true,
      childrenKey: 'children',
      initiallyExpanded: false,
    },
    pagination: false,
    filterable: false,
    sortable: false,
    selectable: true,
    contextMenu: false,
    onSelectionChange: rows =>
    {
      if (rows.length)
      {
        onSelect(rows[rows.length - 1]);
      }
    },
  });

  element.addEventListener('contextmenu', event =>
  {
    const row = event.target.closest('tr[data-rowid]');
    if (!row) return;

    const rowData = grid.rowById?.get(Number(row.dataset.rowid));
    if (!rowData) return;

    event.preventDefault();
    showContextMenu(event.clientX, event.clientY, rowData, onDelete);
  });

  return grid;
}

function showContextMenu(x, y, holon, onDelete)
{
  document.querySelector('.holon-context-menu')?.remove();

  const menu = document.createElement('div');
  menu.className = 'holon-context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const deleteItem = document.createElement('button');
  deleteItem.type = 'button';
  deleteItem.textContent = 'Delete';
  deleteItem.addEventListener('click', async () =>
  {
    menu.remove();
    await onDelete?.(holon);
  });

  menu.appendChild(deleteItem);
  document.body.appendChild(menu);

  const close = event =>
  {
    if (!menu.contains(event.target))
    {
      menu.remove();
      document.removeEventListener('mousedown', close);
    }
  };

  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

export function updateTree(grid, holons, relationships, rootId, relationshipTypeId)
{
  grid?.setData(buildTreeData(holons, relationships, rootId, relationshipTypeId));
}
