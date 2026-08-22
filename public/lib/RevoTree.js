import { defineCustomElements } from '@revolist/revogrid/loader';

defineCustomElements();

export class RevoTree {
  constructor({ container, getId, getParentId, onOpen, onAdd, onMove, onDelete }) {
    this.container = container; this.getId = getId; this.getParentId = getParentId;
    this.onOpen = onOpen; this.onAdd = onAdd; this.onMove = onMove; this.onDelete = onDelete;
    this.nodes = []; this.expandedIds = new Set(); this.selectedId = null;
    this.grid = document.createElement('revo-grid');
    this.grid.className = 'eb-revo-tree-grid'; this.grid.style.width = '100%'; this.grid.style.height = '100%';
    this.grid.theme = 'darkCompact';
    this.grid.readonly = true; this.grid.rowHeaders = false;
    this.grid.columns = [
      { prop: 'name', name: 'Lists', size: 280, sortable: false, readonly: true,
        cellTemplate: (h, props) => {
          const model = props.model;
          const open = () => {
            this.selectedId = model.id;
            this.onOpen?.(model.original);
            window.dispatchEvent(new CustomEvent('eb:list-selected', { detail: { list: model.original } }));
            this.render();
          };
          const toggle = model.hasChildren
            ? h('button', { type:'button', class:'eb-revo-tree-toggle', title:model.expanded?'Collapse':'Expand', 'aria-label':model.expanded?'Collapse':'Expand', onclick:e=>{e.stopPropagation();this.toggle(model.id);} }, model.expanded?'▾':'▸')
            : h('span', { class:'eb-revo-tree-toggle-spacer', 'aria-hidden':'true' }, '');
          const label = h('button', { type:'button', class:`eb-revo-tree-label${model.id===this.selectedId?' selected':''}`, title:model.name, onclick:e=>{e.stopPropagation();open();} }, `${model.name} ${model.ordered?'☷':'☰'}`);
          return h('div', { class:'eb-revo-tree-cell', style:{display:'flex',alignItems:'center',gap:'4px',paddingLeft:`${(model.level||0)*16}px`,width:'100%',boxSizing:'border-box'} }, toggle, label);
        }
      },
      { prop:'actions', name:'', size:80, readonly:true,
        cellTemplate:(h,props)=>{
          const model=props.model;
          const button=(label,title,action)=>h('button',{type:'button',class:'eb-revo-tree-action',title,'aria-label':title,onclick:e=>{e.stopPropagation();action?.(model.original);}},label);
          return h('div',{class:'eb-revo-tree-actions'},button('+','Add sub-list',this.onAdd),button('↑','Move up',node=>this.onMove?.(node,-1)),button('↓','Move down',node=>this.onMove?.(node,1)),button('×','Delete list',this.onDelete));
        }
      }
    ];
    this.grid.addEventListener('cellclick',event=>{
      const model=event.detail?.model;if(!model)return;
      this.selectedId=model.id;
      this.onOpen?.(model.original);
      window.dispatchEvent(new CustomEvent('eb:list-selected',{detail:{list:model.original}}));
      this.render();
    });
    container.innerHTML=''; container.appendChild(this.grid);
  }
  on() {}
  setData(nodes){this.nodes=Array.isArray(nodes)?nodes:[];this.render();}
  hasChildren(id){return this.nodes.some(node=>this.getParentId(node)===id);}
  toggle(id){if(this.expandedIds.has(id))this.expandedIds.delete(id);else this.expandedIds.add(id);this.render();}
  flatten(){
    const children=new Map();
    for(const node of this.nodes){const key=this.getParentId(node)??null;if(!children.has(key))children.set(key,[]);children.get(key).push(node);}
    for(const list of children.values())list.sort((a,b)=>(a.position??0)-(b.position??0)||String(this.getId(a)).localeCompare(String(this.getId(b))));
    const result=[];
    const visit=(parentId,level)=>{for(const node of children.get(parentId)||[]){const id=this.getId(node),hasChildren=(children.get(id)||[]).length>0,expanded=this.expandedIds.has(id);result.push({...node,id,original:node,level,hasChildren,expanded,actions:''});if(hasChildren&&expanded)visit(id,level+1);}};
    visit(null,0); return result;
  }
  render(){if(this.grid)this.grid.source=this.flatten();}
}
