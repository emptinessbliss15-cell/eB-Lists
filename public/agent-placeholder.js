const agent=document.querySelector('.eb-agent');
if(agent){
  agent.classList.add('eb-agent-placeholder');
  const label=agent.querySelector('.eb-agent-label');
  if(label){
    label.innerHTML='<span>🤖 Agent</span><button id="agentToggle" class="secondary" type="button" title="Hide agent">›</button>';
  }
  const row=agent.querySelector('.eb-agent-row');
  if(row){
    const note=document.createElement('div');
    note.className='eb-agent-placeholder-note';
    note.textContent='AI connection not configured yet';
    row.parentNode.insertBefore(note,row);
    const input=agent.querySelector('#agentInput');
    const send=agent.querySelector('#agentSend');
    if(input){input.placeholder='Agent will be available here';input.disabled=true}
    if(send){send.disabled=true}
  }
  const saved=localStorage.getItem('ebAgentHidden')==='1';
  const setHidden=hidden=>{document.body.classList.toggle('eb-agent-hidden',hidden);localStorage.setItem('ebAgentHidden',hidden?'1':'0');const b=document.getElementById('agentToggle');if(b){b.textContent=hidden?'‹':'›';b.title=hidden?'Show agent':'Hide agent'}};
  setHidden(saved);
  document.getElementById('agentToggle')?.addEventListener('click',()=>setHidden(!document.body.classList.contains('eb-agent-hidden')));
  const show=document.createElement('button');show.id='agentShow';show.className='secondary';show.type='button';show.textContent='🤖';show.title='Show agent';show.setAttribute('aria-label','Show agent');show.addEventListener('click',()=>setHidden(false));document.querySelector('.eb-main')?.prepend(show);
}
