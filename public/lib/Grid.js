/**
 * Reusable, data-source-agnostic grid view.
 * The Grid owns presentation; callers provide a Type and rows.
 * A Type describes the fields/columns available for each row.
 */
export class Grid {
  constructor({ container, type = null, columns = [], renderCell, renderRow, onRowClick } = {}) {
    if (!container) throw new Error('Grid requires a container');
    this.container = container;
    this.type = type;
    this.columns = columns.length ? columns : this.columnsFromType(type);
    this.renderCell = renderCell || ((value) => String(value ?? ''));
    this.renderRow = renderRow || null;
    this.onRowClick = onRowClick || null;
    this.rows = [];
  }

  columnsFromType(type) {
    return Array.isArray(type?.fields) ? type.fields.map(field => ({
      key: field.key,
      label: field.label ?? field.key,
      render: field.render
    })) : [];
  }

  setType(type) {
    this.type = type || null;
    this.columns = this.columnsFromType(this.type);
    this.render();
  }

  setColumns(columns) {
    this.columns = Array.isArray(columns) ? columns : [];
    this.render();
  }

  setRows(rows) {
    this.rows = Array.isArray(rows) ? [...rows] : [];
    this.render();
  }

  render() {
    this.container.replaceChildren();
    const table = document.createElement('table');
    table.className = 'eb-grid';
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const column of this.columns) {
      const th = document.createElement('th');
      th.textContent = column.label ?? column.key ?? '';
      headerRow.append(th);
    }
    head.append(headerRow);
    table.append(head);

    const body = document.createElement('tbody');
    for (const row of this.rows) {
      const tr = document.createElement('tr');
      tr.dataset.gridRowId = String(row?.id ?? '');
      if (this.onRowClick) tr.addEventListener('click', event => {
        if (event.target.closest('button,input,select,textarea,a')) return;
        this.onRowClick(row, event);
      });

      if (this.renderRow) {
        const renderedRow = this.renderRow(row, this);
        if (renderedRow instanceof Node) {
          if (renderedRow.tagName === 'TR') tr.replaceChildren(...renderedRow.children);
          else {
            const td = document.createElement('td');
            td.colSpan = Math.max(1, this.columns.length);
            td.append(renderedRow);
            tr.append(td);
          }
        }
        body.append(tr);
        continue;
      }

      for (const column of this.columns) {
        const td = document.createElement('td');
        const value = row?.[column.key];
        const rendered = column.render
          ? column.render(value, row)
          : this.renderCell(value, row, column);
        if (rendered instanceof Node) td.append(rendered);
        else td.textContent = String(rendered ?? '');
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    this.container.append(table);
  }
}

window.eB = window.eB || {};
window.eB.Grid = Grid;
