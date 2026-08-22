/**
 * Reusable RevoGrid-backed grid view.
 *
 * The Grid owns presentation while callers provide a Type and rows.
 * A Type describes the fields/columns available for each row.
 */
export class Grid {
  constructor({ container, type = null, columns = [] } = {}) {
    if (!container) throw new Error('Grid requires a container');

    this.container = container;
    this.type = type;
    this.columns = columns.length ? columns : this.columnsFromType(type);
    this.rows = [];
    this.grid = null;
    this.ready = this.load();
  }

  columnsFromType(type) {
    return Array.isArray(type?.fields)
      ? type.fields.map(field => ({
          key: field.key,
          label: field.label ?? field.key,
          render: field.render,
        }))
      : [];
  }

  async load() {
    const { defineCustomElement } = await import(
      'https://cdn.jsdelivr.net/npm/@revolist/[email protected]/standalone/revo-grid.js/+esm'
    );

    defineCustomElement();

    this.grid = document.createElement('revo-grid');
    this.grid.className = 'eb-revo-grid';
    this.grid.theme = 'darkCompact';
    this.grid.readonly = true;
    this.grid.range = false;
    this.grid.rowSize = 30;
    this.grid.resize = true;
    this.grid.stretch = true;
    this.grid.style.height = '280px';
    this.grid.style.width = '100%';

    this.container.style.background = '#1e1e1e';
    this.container.style.color = '#ddd';
    this.container.style.borderRadius = '4px';

    this.grid.columns = this.buildColumns();
    this.container.replaceChildren(this.grid);
    this.render();
  }

  buildColumns() {
    return this.columns.map(column => {
      const base = {
        prop: column.key,
        name: column.label ?? column.key,
        size: column.key === 'text' ? 320 : column.key === 'completed' ? 80 : 140,
        readonly: true,
      };

      if (column.key === 'text') {
        base.cellTemplate = (h, { value }) => h(
          'span',
          {
            style: {
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '4px 6px',
              color: '#ddd',
            },
          },
          String(value ?? '')
        );
      }

      if (column.key === 'completed') {
        base.cellTemplate = (h, { value }) => h(
          'span',
          {
            style: {
              display: 'block',
              textAlign: 'center',
              padding: '4px 6px',
              color: '#ddd',
            },
          },
          value ? '✓' : ''
        );
      }

      if (column.key === 'actions') {
        base.cellTemplate = (h, { model }) => h(
          'span',
          {
            style: {
              display: 'block',
              padding: '4px 6px',
              color: '#ddd',
            },
          },
          model.actionsText ?? ''
        );
      }

      return base;
    });
  }

  setType(type) {
    this.type = type || null;
    this.columns = this.columnsFromType(this.type);

    if (this.grid) {
      this.grid.columns = this.buildColumns();
      this.render();
    }
  }

  setColumns(columns) {
    this.columns = Array.isArray(columns) ? columns : [];

    if (this.grid) {
      this.grid.columns = this.buildColumns();
      this.render();
    }
  }

  setRows(rows) {
    this.rows = Array.isArray(rows) ? [...rows] : [];
    this.render();
  }

  render() {
    if (!this.grid) return;

    this.grid.source = this.rows.map(row => ({
      ...row,
      actionsText: row.actionsText ?? '+  ↑  ↓  ×',
    }));
  }
}

window.eB = window.eB || {};
window.eB.Grid = Grid;
