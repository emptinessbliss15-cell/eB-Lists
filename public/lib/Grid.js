/**
 * Reusable, data-source-agnostic grid view.
 * The Grid owns presentation; callers provide a Type and rows.
 */
export class Grid {
  constructor({ container, type = null, columns = [], renderCell, renderRow, onRowClick } = {}) {
    if (!container) throw new Error('Grid requires a container');
    this.container = container; this.type = type;
    this.columns = columns.length ? columns : this.columnsFromType(type);
    this.renderCell = renderCell || ((value) => String(value ?? ''));
    this.renderRow = renderRow || null; this.onRowClick = onRowClick || null; this.rows = [];
  }
  columnsFromType(type) { return Array.isArray(type?.fields) ? type.fields.map(field => ({ key: field.key, label: field.label ?? field.key, render: field.render })) : []; }
  setType(type) { this.type = type || null; this.columns = this.columnsFromType(this.type); this.render(); }
  setColumns(columns) { this.columns = Array.isArray(columns) ? columns : []; this.render(); }
  setRows(rows) { this.rows = Array.isArray(rows) ? [...rows] : []; this.render(); }
  render() {
    this.container.replaceChildren();
    const root = getComputedStyle(document.documentElement);
    const blue = root.getPropertyValue('--eb-accent').trim() || '#5b5bd6';
    const surface = root.getPropertyValue('--eb-surface').trim() || '#1a1d24';
    const text = root.getPropertyValue('--eb-text').trim() || '#f3f4f6';
    const table = document.createElement('table'); table.className = 'eb-grid';
    table.style.cssText = `width:100%;border-collapse:collapse;border:1px solid ${blue};color:${text};background:${surface};font-size:13px;`;
    const head = document.createElement('thead'), headerRow = document.createElement('tr');
    for (const column of this.columns) {
      const th = document.createElement('th'); th.textContent = column.label ?? column.key ?? '';
      th.style.cssText = `border:1px solid ${blue};color:${text};background:${surface};text-align:left;padding:4px 6px;font-weight:600;`;
      headerRow.append(th);
    }
    head.append(headerRow); table.append(head);
    const body = document.createElement('tbody');
    for (const row of this.rows) {
      const tr = document.createElement('tr'); tr.dataset.gridRowId = String(row?.id ?? ''); tr.style.color = text;
      if (this.onRowClick) tr.addEventListener('click', event => { if (!event.target.closest('button,input,select,textarea,a')) this.onRowClick(row, event); });
      for (const column of this.columns) {
        const td = document.createElement('td'); td.style.cssText = `border:1px solid ${blue};color:${text};background:${surface};padding:4px 6px;`;
        const value = row?.[column.key];
        const rendered = column.render ? column.render(value, row) : this.renderCell(value, row, column);
        if (rendered instanceof Node) {
          if (rendered.matches?.('input,select,textarea')) { rendered.style.color = text; rendered.style.backgroundColor = surface; rendered.style.caretColor = text; }
          td.append(rendered);
        } else td.textContent = String(rendered ?? '');
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body); this.container.append(table);
  }
}
window.eB = window.eB || {}; window.eB.Grid = Grid;