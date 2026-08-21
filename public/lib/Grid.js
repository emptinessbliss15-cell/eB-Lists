/**
 * Reusable, data-source-agnostic grid view.
 * The Grid owns presentation; callers provide columns and rows.
 * A row renderer may provide richer cell content without the Grid
 * knowing anything about the underlying data source.
 */
export class Grid {
  constructor({ container, columns = [], renderCell, renderRow } = {}) {
    if (!container) throw new Error('Grid requires a container');
    this.container = container;
    this.columns = columns;
    this.renderCell = renderCell || ((value) => String(value ?? ''));
    this.renderRow = renderRow || null;
    this.rows = [];
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
      if (this.renderRow) {
        const renderedRow = this.renderRow(row, this);
        if (renderedRow instanceof Node) body.append(renderedRow);
        continue;
      }
      const tr = document.createElement('tr');
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
