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
    const blue = getComputedStyle(document.documentElement).getPropertyValue('--eb-accent').trim() || '#5b5bd6';
    const table = document.createElement('table');
    table.className = 'eb-grid';
    table.style.cssText = `width:100%;border-collapse:collapse;border:1px solid ${blue};color:CanvasText;background:Canvas;`;

    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const column of this.columns) {
      const th = document.createElement('th');
      th.textContent = column.label ?? column.key ?? '';
      th.style.border = `1px solid ${blue}`;
      th.style.color = 'CanvasText';
      th.style.background = 'Canvas';
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
        for (const cell of tr.children) {
          cell.style.border = `1px solid ${blue}`;
          cell.style.color = 'CanvasText';
          cell.style.background = 'Canvas';
        }
        body.append(tr);
        continue;
      }

      for (const column of this.columns) {
        const td = document.createElement('td');
        td.style.border = `1px solid ${blue}`;
        td.style.color = 'CanvasText';
        td.style.background = 'Canvas';
        const value = row?.[column.key];
        const rendered = column.render
          ? column.render(value, row)
          : this.renderCell(value, row, column);
        if (rendered instanceof Node) {
          if (rendered.matches?.('input,select,textarea')) {
            rendered.style.color = 'CanvasText';
            rendered.style.backgroundColor = 'Canvas';
          }
          td.append(rendered);
        } else td.textContent = String(rendered ?? '');
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
