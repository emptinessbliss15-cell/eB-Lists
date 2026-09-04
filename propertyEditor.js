// Property Editor — semantic inspector for the currently selected Holon.
// The editor deliberately uses eBGrid rather than owning grid behavior itself.

import { createEBGrid } from './eBGrid.js';
import { eBliss } from './eBSDK.js';

let propertyGrid = null;
let currentHolon = null;

function installLayoutStyles() {
  if (document.getElementById('property-editor-layout-style')) return;
  const style = document.createElement('style');
  style.id = 'property-editor-layout-style';
  style.textContent = `
    .workspace-grid { grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); min-height: calc(100vh - 140px); }
    .holon-workspace { min-width: 0; }
    .property-editor { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
    .property-editor[hidden] { display: none; }
    .property-editor-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .property-editor-heading h3 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .property-editor-heading button { border: 0; background: transparent; color: var(--eb-text); font-size: 22px; line-height: 1; padding: 2px 6px; }
    .property-editor [data-property-grid] { min-height: 0; flex: 1; }
    @media (max-width: 760px) {
      .workspace-grid { grid-template-columns: 1fr; min-height: 0; }
    }
    @media (min-width: 761px) {
      .workspace-grid:has(#propertyEditor[hidden]) { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

function propertyRows(holon) {
  return [
    { property: 'Name', value: holon.name ?? '', field: 'name' },
    { property: 'Type', value: holon.holon_type ?? '', field: 'holon_type' },
    { property: 'ID', value: holon.id ?? '', field: 'id', readonly: true },
  ];
}

async function saveProperty(row, field, newValue, oldValue) {
  if (!currentHolon || row.readonly || !['name', 'holon_type'].includes(field)) return;
  const value = String(newValue ?? '').trim();
  if (!value || value === String(oldValue ?? '')) return;

  try {
    await eBliss.holons.update(currentHolon.id, { [field]: value });
    currentHolon[field] = value;
    propertyGrid?.setData(propertyRows(currentHolon));
    window.ebStatus?.success?.('Holon updated');
  } catch (error) {
    window.ebStatus?.error?.(error.message || 'Unable to update Holon');
    propertyGrid?.setData(propertyRows(currentHolon));
  }
}

function rowFromGridEvent(event) {
  const row = event.target.closest('tr[data-rowid]');
  if (!row) return null;
  const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
  if (cells.length < 2) return null;

  // The current Holon grid is Name / Type / ID. Hidden columns remain
  // represented by the grid row, so this keeps the inspector independent of
  // VanillaGrid's internal row ids.
  return {
    name: cells[0] || '',
    holon_type: cells[1] || '',
    id: cells[cells.length - 1] || '',
  };
}

function showHolon(holon) {
  currentHolon = holon;
  const host = document.getElementById('propertyEditor');
  const title = document.getElementById('propertyEditorTitle');
  if (!host) return;

  host.hidden = false;
  if (title) title.textContent = holon.name || 'Holon';

  if (!propertyGrid) {
    propertyGrid = createEBGrid(host.querySelector('[data-property-grid]'), {
      data: propertyRows(holon),
      columns: [
        { key: 'property', label: 'Property', sortable: false },
        { key: 'value', label: 'Value', sortable: false },
      ],
      pagination: false,
      filterable: false,
      sortable: false,
      editableRows: true,
      keyboardNavigation: true,
      onRowEdit: (row, field, newValue, oldValue) => {
        if (field === 'value' && !row.readonly) saveProperty(row, row.field, newValue, oldValue);
      },
    });
  } else {
    propertyGrid.setData(propertyRows(holon));
  }
}

function hide() {
  currentHolon = null;
  const host = document.getElementById('propertyEditor');
  if (host) host.hidden = true;
}

export function initPropertyEditor() {
  installLayoutStyles();
  const gridHost = document.getElementById('grid');
  if (!gridHost) return;

  gridHost.addEventListener('click', event => {
    const holon = rowFromGridEvent(event);
    if (holon?.id) showHolon(holon);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('#grid, #propertyEditor')) return;
    if (event.target.closest('.eb-modal, .eb-context-menu, .eb-header, .eb-status')) return;
    hide();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && currentHolon) hide();
  });

  document.getElementById('propertyEditorClose')?.addEventListener('click', hide);
}
