export function createHolonGrid({ element, holons, onSelect })
{
  return new VanillaGrid(element, {
    data: holons,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'holon_type', label: 'Type', sortable: true },
      { key: 'id', label: 'ID', sortable: true },
    ],
    filterable: true,
    sortable: true,
    pagination: true,
    pageSize: 25,
    selectable: true,
    contextMenu: true,
    onSelectionChange: rows =>
    {
      if (rows.length)
      {
        onSelect(rows[rows.length - 1]);
      }
    },
  });
}

export function createRelationshipGrid({ element, relationships })
{
  return new VanillaGrid(element, {
    data: relationships,
    columns: [
      { key: 'source_holon', label: 'Source', sortable: true },
      { key: 'relationship_type', label: 'Relationship', sortable: true },
      { key: 'target_holon', label: 'Target', sortable: true },
      { key: 'position', label: 'Position', type: 'number', sortable: true },
    ],
    filterable: true,
    sortable: true,
    pagination: true,
    pageSize: 25,
    contextMenu: true,
  });
}

export function setRelationships(grid, relationships)
{
  grid?.setData(relationships);
}
