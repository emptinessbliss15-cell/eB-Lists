import { buildTreeData } from './holons.js';

export function createTree({ element, holons, relationships, onSelect })
{
  const data = buildTreeData(holons, relationships);

  return new VanillaGrid(element, {
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
      initiallyExpanded: true,
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
}

export function updateTree(grid, holons, relationships)
{
  grid?.setData(buildTreeData(holons, relationships));
}
