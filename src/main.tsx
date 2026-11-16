import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Data,Domain,Project,Task,exportData,id,load,safeUrl,save,statuses,validate} from './data';
import './style.css';

type Section='bridge'|'domains'|'nexus'|'codex'|'directives'|'launcher';
type Editor={kind:'domain'|'project'|'resource'|'task'|'agent'|'assignment'|'shortcut';record?:Record<string,unknown>;defaults?:Record<string,unknown>};
const nav:[Section,string,string][]=[['bridge','The Bridge','⌂'],['domains','Domains','⬡'],['nexus','The Nexus','◇'],['codex','The Codex','▦'],['directives','Directives','☑'],['launcher','Quick Access','↗']];
const accent=['#e34761','#d7a452','#af73e5','#24b5c2','#7087e6','#c4c3d1'];
const dateFmt=(v:string)=>v?new Date(v+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'No due date';
function Icon({name}: {name:string}){return <span aria-hidden="true" className="symbol">{name}</span>}
function Pill({children,tone='neutral'}:{children:React.ReactNode;tone?:string}){return <span className={`pill ${tone}`}>{children}</span>}
function Empty({title,detail,action}:{title:string;detail:string;action?:React.ReactNode}){return <div className="empty"><span className="empty-glyph">◇</span><strong>{title}</strong><p>{detail}</p>{action}</div>}
function SectionHead({eyebrow,title,aside}:{eyebrow:string;title:string;aside?:React.ReactNode}){return <div className="section-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{aside}</div>}
function Button({children,onClick,secondary=false,disabled=false,className=''}:{children:React.ReactNode;onClick?:()=>void;secondary?:boolean;disabled?:boolean;className?:string}){return <button type="button" disabled={disabled} onClick={onClick} className={`button ${secondary?'secondary':''} ${className}`}>{children}</button>}
function TextField({label,value,onChange,placeholder='',required=false,multi=false,type='text'}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;required?:boolean;multi?:boolean;type?:string}){return <label className="field"><span>{label}{required?' *':''}</span>{multi?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={4}/>:<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required}/>}</label>}
function SelectField({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:[string,string][]}){return <label className="field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></label>}
function External({url,children,className=''}:{url:string;children:React.ReactNode;className?:string}){const safe=safeUrl(url);return safe?<a className={className} href={safe} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span></a>:<span className="muted">{children} · Configure link</span>}

function App(){
  const [data,setData]=useState<Data>(load);
  const [section,setSection]=useState<Section>('bridge');
  const [activeDomain,setActiveDomain]=useState('');
  const [activeProject,setActiveProject]=useState('');
  const [activeAgent,setActiveAgent]=useState('muse');
  const [editor,setEditor]=useState<Editor|null>(null);
  const [menu,setMenu]=useState(false);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState({domain:'',project:'',priority:'',status:''});
  const [notice,setNotice]=useState('');
  const [showArchived,setShowArchived]=useState(false);
  const [importing,setImporting]=useState<Data|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{try{save(data)}catch{setNotice('Browser storage is unavailable or full. Export a backup before leaving.')}},[data]);
  useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(t)}},[notice]);
  const domains=data.domains.filter(x=>showArchived||!x.archived);
  const domain=(id:string)=>data.domains.find(x=>x.id===id);
  const project=(id:string)=>data.projects.find(x=>x.id===id);
  const agent=(id:string)=>data.agents.find(x=>x.id===id);
  const go=(s:Section)=>{setSection(s);setMenu(false);window.scrollTo({top:0,behavior:'smooth'})};
  const mutate=(key:keyof Data,record:Record<string,unknown>)=>{
    if(key==='version')return;
    setData(prev=>{
      const next={...prev,[key]:(prev[key] as Record<string,unknown>[]).some(x=>x.id===record.id)?(prev[key] as Record<string,unknown>[]).map(x=>x.id===record.id?record:x):[...(prev[key] as Record<string,unknown>[]),record]} as Data;
      if(key==='projects'){
        const old=prev.projects.find(x=>x.id===record.id);
        if(old && old.domainId!==record.domainId){
          const ids=new Set([old.id]);let changed=true;
          while(changed){changed=false;for(const p of prev.projects)if(p.parentId&&ids.has(p.parentId)&&!ids.has(p.id)){ids.add(p.id);changed=true}}
          next.projects=next.projects.map(p=>ids.has(p.id)?{...p,domainId:String(record.domainId)}:p);
          next.resources=next.resources.map(r=>ids.has(r.projectId)?{...r,domainId:String(record.domainId)}:r);
          next.tasks=next.tasks.map(t=>ids.has(t.projectId)?{...t,domainId:String(record.domainId)}:t);
        }
      }
      return next;
    });
    setEditor(null);setNotice('Saved on this browser');
  };
  const remove=(kind:Editor['kind'],rec:Record<string,unknown>)=>{
    if(!confirm(`Remove “${String(rec.name||rec.title)}”? Related records may also be removed. Export a backup first if needed.`))return;
    const recordId=String(rec.id);
    setData(prev=>{
      const next=structuredClone(prev);
      if(kind==='domain'){
        const projectIds=new Set(next.projects.filter(x=>x.domainId===recordId).map(x=>x.id));
        next.domains=next.domains.filter(x=>x.id!==recordId);next.projects=next.projects.filter(x=>!projectIds.has(x.id));
        next.resources=next.resources.filter(x=>x.domainId!==recordId);next.tasks=next.tasks.filter(x=>x.domainId!==recordId);
        next.shortcuts=next.shortcuts.filter(x=>x.domainId!==recordId);next.agents=next.agents.map(a=>({...a,domainIds:a.domainIds.filter(x=>x!==recordId)}));
        setActiveDomain('');
      }else if(kind==='project'){
        const ids=new Set([recordId]);let changed=true;
        while(changed){changed=false;for(const p of next.projects)if(p.parentId&&ids.has(p.parentId)&&!ids.has(p.id)){ids.add(p.id);changed=true}}
        next.projects=next.projects.filter(x=>!ids.has(x.id));next.resources=next.resources.filter(x=>!ids.has(x.projectId));next.tasks=next.tasks.filter(x=>!ids.has(x.projectId));setActiveProject('');
      }else{
        const key=(kind+'s') as keyof Data;
        if(kind==='assignment')next.assignments=next.assignments.filter(x=>x.id!==recordId);
        else if(kind==='agent'){next.agents=next.agents.filter(x=>x.id!==recordId);next.assignments=next.assignments.filter(x=>x.agentId!==recordId)}
        else (next[key] as {id:string}[])=(next[key] as {id:string}[]).filter(x=>x.id!==recordId) as never;
      }
      return next;
    });setEditor(null);setNotice('Removed');
  };
  const toggleArchive=(kind:'domain'|'project',rec:Domain|Project)=>{mutate(kind+'s' as keyof Data,{...rec,archived:!rec.archived})};
  const openEditor=(kind:Editor['kind'],record?:Record<string,unknown>,defaults?:Record<string,unknown>)=>setEditor({kind,record,defaults});
  const readFile=async(file?:File)=>{
    if(!file)return;
    try {const parsed=validate(JSON.parse(await file.text()));setImporting(parsed)}
    catch(e){setNotice(e instanceof Error?e.message:'Could not read backup.')}
    if(fileRef.current)fileRef.current.value='';
  };
  const taskFilters=data.tasks.filter(t=> (t.status!=='Archived'||filter.status==='Archived') && (!filter.domain||t.domainId===filter.domain) && (!filter.project||t.projectId===filter.project) && (!filter.priority||t.priority===filter.priority) && (!filter.status||t.status===filter.status) && (!search||[t.title,t.description,t.notes].join(' ').toLowerCase().includes(search.toLowerCase())));
  const outstanding=data.tasks.filter(t=>!['Completed','Archived'].includes(t.status));
  const priorities=[...outstanding].sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[a.priority]-{Critical:0,High:1,Medium:2,Low:3}[b.priority] || (a.dueDate||'9999').localeCompare(b.dueDate||'9999')));
  const resourceList=data.resources.filter(r=>(!search||[r.name,r.description,r.tags.join(' '),r.notes].join(' ').toLowerCase().includes(search.toLowerCase()))&&(!filter.domain||r.domainId===filter.domain));
  const projectOptions:[string,string][]= [['','None'],...data.projects.filter(p=>!p.archived).map(p=>[p.id,`${domain(p.domainId)?.name||'Unknown'} / ${p.name}`] as [string,string])];
  const domainOptions:[string,string][]= [['','Unassigned'],...domains.map(d=>[d.id,d.name] as [string,string])];
  const cardActions=(kind:Editor['kind'],rec:Record<string,unknown>)=><div className="card-actions"><button type="button" onClick={()=>openEditor(kind,rec)} aria-label={`Edit ${String(rec.name||rec.title)}`}>Edit</button><button type="button" onClick={()=>remove(kind,rec)} aria-label={`Remove ${String(rec.name||rec.title)}`}>Remove</button></div>;
  const taskCard=(t:Task)=><article className="task-row" key={t.id}><button className={`check ${t.status==='Completed'?'checked':''}`} type="button" aria-label={t.status==='Completed'?'Mark incomplete':'Mark complete'} onClick={()=>mutate('tasks',{...t,status:t.status==='Completed'?'Ready':'Completed',completedAt:t.status==='Completed'?'':new Date().toISOString()})}>{t.status==='Completed'?'✓':''}</button><div className="task-copy"><strong>{t.title}</strong><span>{domain(t.domainId)?.name||'Unassigned'}{t.projectId?` · ${project(t.projectId)?.name||'Project'}`:''} · {dateFmt(t.dueDate)}</span></div><Pill tone={t.priority.toLowerCase()}>{t.priority}</Pill><Pill tone="neutral">{t.status}</Pill><button className="icon-button" type="button" aria-label={`Edit ${t.title}`} onClick={()=>openEditor('task',t)}>⋯</button></article>;
  const projectTree=(domainId:string,parentId:string|null,level=0):React.ReactNode=>data.projects.filter(p=>p.domainId===domainId&&p.parentId===parentId&&(showArchived||!p.archived)).map(p=><div className="tree-block" key={p.id}><button type="button" className={`tree-item ${activeProject===p.id?'selected':''}`} style={{paddingLeft:16+level*20}} onClick={()=>setActiveProject(p.id)}><span aria-hidden="true">◇</span><span>{p.name}</span>{p.archived&&<small>Archived</small>}<span className="tree-arrow">›</span></button>{projectTree(domainId,p.id,level+1)}</div>);
  return <div className="app-shell">
    <aside className={`sidebar ${menu?'open':''}`}>
      <div className="brand"><div className="brand-mark" aria-hidden="true">◇<span>◇</span></div><div><small>THE</small><strong>COMMAND<br/>BRIDGE</strong><em>PERSONAL OPERATIONS NETWORK</em></div></div>
      <div className="sidebar-label">NAVIGATION <span>01 / 06</span></div>
      <nav aria-label="Main navigation">{nav.map(([s,label,glyph])=><button key={s} type="button" className={section===s?'active':''} onClick={()=>go(s)}><Icon name={glyph}/><span>{label}</span><span className="nav-chevron">›</span></button>)}</nav>
      <div className="sidebar-label sidebar-domains">YOUR DOMAINS <button type="button" onClick={()=>{go('domains');openEditor('domain')}} aria-label="Add domain">＋</button></div>
      <div className="sidebar-domain-list">{domains.map(d=><button type="button" key={d.id} onClick={()=>{setActiveDomain(d.id);setActiveProject('');go('domains')}}><i style={{background:d.color}}/>{d.name}</button>)}</div>
      <div className="sidebar-footer"><span className="status-dot"/> LOCAL MODE <small>Stored on this device</small></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button type="button" className="mobile-menu icon-button" onClick={()=>setMenu(!menu)} aria-label={menu?'Close navigation':'Open navigation'}>{menu?'✕':'☰'}</button><div className="topbar-path">THE COMMAND BRIDGE <span>/</span> <b>{nav.find(x=>x[0]===section)?.[1].toUpperCase()}</b></div><div className="topbar-actions"><span className="local-badge"><span className="status-dot"/> LOCAL WORKSPACE</span><button type="button" className="icon-button" aria-label="Open data settings" onClick={()=>document.getElementById('data-control')?.scrollIntoView({behavior:'smooth'})}>⚙</button><div className="avatar" title="Commander Darren">D</div></div></header>
      {menu&&<button type="button" className="menu-shade" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
      <main>
        {section==='bridge'&&<>
          <div className="hero"><div className="hero-copy"><span className="eyebrow">COMMAND OVERVIEW <span className="hero-line"/></span><h1>Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, Darren.</h1><p>Your operations, projects, and possibilities — unified.</p></div><div className="hero-date"><span>◷</span><div>{new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}<small>YOUR BRIDGE · VERSION 1.0</small></div></div></div>
          <div className="overview-strip"><div><span>◈</span><strong>{domains.filter(x=>!x.archived).length}</strong><small>DOMAINS</small></div><div><span>⬡</span><strong>{data.projects.filter(x=>!x.archived).length}</strong><small>PROJECTS</small></div><div><span>☑</span><strong>{outstanding.length}</strong><small>OPEN DIRECTIVES</small></div><div><span>✦</span><strong>{data.agents.length}</strong><small>AGENT PROFILES</small></div></div>
          <div className="dashboard-grid">
            <section className="panel domain-panel"><SectionHead eyebrow="OPERATIONS HUB" title="Your domains" aside={<button className="text-action" onClick={()=>go('domains')}>View all ↗</button>}/><div className="domain-grid">{domains.map((d,i)=><button type="button" className="domain-tile" style={{'--accent':d.color} as React.CSSProperties} key={d.id} onClick={()=>{setActiveDomain(d.id);setActiveProject('');go('domains')}}><span className="tile-icon">{['⛩','⬡','✦','◈','⌘','▤'][i%6]}</span><strong>{d.name}</strong><small>{data.projects.filter(p=>p.domainId===d.id&&!p.archived).length} projects</small><span className="tile-arrow">↗</span></button>)}</div></section>
            <section className="panel focus-panel"><SectionHead eyebrow="CURRENT PRIORITIES" title="Directives" aside={<button className="text-action" onClick={()=>go('directives')}>All tasks ↗</button>}/>{priorities.length?priorities.slice(0,4).map(taskCard):<Empty title="Your focus is clear" detail="Create a directive to track your next priority." action={<Button onClick={()=>openEditor('task')}>＋ New directive</Button>}/>}</section>
            <section className="panel quick-panel"><SectionHead eyebrow="SHORTCUTS" title="Quick access" aside={<button className="text-action" onClick={()=>go('launcher')}>Manage ↗</button>}/><div className="quick-grid">{data.shortcuts.slice(0,8).map(s=><div className="quick-item" key={s.id}><External url={s.url} className="quick-link"><span className="quick-icon">{s.icon}</span><span>{s.name}</span></External></div>)}</div></section>
            <section className="panel signal-panel"><SectionHead eyebrow="SYSTEM SIGNAL" title="Connections & agents"/><div className="signal-list"><div><span className="signal-icon">◉</span><div><strong>Business analytics</strong><small>Spark Membership, commerce and website data</small></div><Pill>Not connected</Pill></div><div><span className="signal-icon">✦</span><div><strong>AI execution</strong><small>Profiles available for manual launch</small></div><Pill>Not connected</Pill></div><div><span className="signal-icon">◇</span><div><strong>Knowledge vault</strong><small>Obsidian and Notion shortcuts only</small></div><Pill>Not connected</Pill></div></div><button className="text-action" onClick={()=>{setActiveAgent('muse');go('nexus')}}>Open The Nexus ↗</button></section>
            <section className="panel full-panel"><SectionHead eyebrow="ACTIVITY" title="Recent activity"/><Empty title="No activity history yet" detail="New records will appear here in a later version. No external accounts are connected."/></section>
          </div>
        </>}
        {section==='domains'&&<>
          <div className="page-intro"><div><span className="eyebrow">01 / ORGANIZATION</span><h1>Domains</h1><p>Every project has a place. Expand and reorganize this structure as your work grows.</p></div><Button onClick={()=>openEditor('domain')}>＋ New domain</Button></div>
          <div className="toolbar"><label className="toggle"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Show archived</label></div>
          <div className="domains-layout"><div className="panel domain-nav"><span className="eyebrow">DEPARTMENTS</span>{domains.map(d=><button key={d.id} type="button" className={activeDomain===d.id?'selected':''} onClick={()=>{setActiveDomain(d.id);setActiveProject('')}}><i style={{background:d.color}}/>{d.name}<span>{data.projects.filter(p=>p.domainId===d.id&&!p.archived).length}</span></button>)}</div>
          <div className="panel domain-detail">{activeDomain&&domain(activeDomain)?<><div className="detail-top"><div className="detail-insignia" style={{'--accent':domain(activeDomain)?.color} as React.CSSProperties}>⬡</div><div><span className="eyebrow">DOMAIN</span><h2>{domain(activeDomain)?.name}</h2><p>{domain(activeDomain)?.description||'No description yet.'}</p></div></div><div className="detail-actions"><Button onClick={()=>openEditor('project',undefined,{domainId:activeDomain})}>＋ Add project</Button><Button secondary onClick={()=>openEditor('domain',domain(activeDomain))}>Edit domain</Button><Button secondary onClick={()=>toggleArchive('domain',domain(activeDomain)!)}>{domain(activeDomain)?.archived?'Restore':'Archive'}</Button><button className="danger-link" onClick={()=>remove('domain',domain(activeDomain)!)}>Remove</button></div><div className="detail-split"><div><h3>Project structure</h3><div className="tree">{projectTree(activeDomain,null)}{!data.projects.some(p=>p.domainId===activeDomain)&&<Empty title="No projects" detail="Create the first project in this domain."/>}</div></div><div className="project-detail">{activeProject&&project(activeProject)?.domainId===activeDomain?<><span className="eyebrow">SELECTED PROJECT</span><h3>{project(activeProject)?.name}</h3><p>{project(activeProject)?.description||'Add a description to give this project context.'}</p><div className="stack-actions"><Button secondary onClick={()=>openEditor('project',project(activeProject))}>Edit / move</Button><Button secondary onClick={()=>openEditor('project',undefined,{domainId:activeDomain,parentId:activeProject})}>＋ Subproject</Button><Button secondary onClick={()=>openEditor('resource',undefined,{domainId:activeDomain,projectId:activeProject})}>＋ Resource</Button><Button secondary onClick={()=>openEditor('task',undefined,{domainId:activeDomain,projectId:activeProject})}>＋ Task</Button><Button secondary onClick={()=>toggleArchive('project',project(activeProject)!)}>{project(activeProject)?.archived?'Restore':'Archive'}</Button><button className="danger-link" onClick={()=>remove('project',project(activeProject)!)}>Remove project</button></div><h4>Related items</h4>{data.resources.filter(r=>r.projectId===activeProject).map(r=><div className="related" key={r.id}><External url={r.url}>{r.name}</External><button onClick={()=>openEditor('resource',r)}>Edit</button></div>)}{data.tasks.filter(t=>t.projectId===activeProject).map(t=><div className="related" key={t.id}>{t.title}<button onClick={()=>openEditor('task',t)}>Edit</button></div>)}{!data.resources.some(r=>r.projectId===activeProject)&&!data.tasks.some(t=>t.projectId===activeProject)&&<p className="muted">No resources or tasks linked yet.</p>}</>:<Empty title="Select a project" detail="Choose a project to see its resources, tasks, and management tools."/>}</div></div></>:<Empty title="Choose a domain" detail="Select a domain on the left, or create a new one."/>}</div></div>
        </>}
        {section==='nexus'&&<>
          <div className="page-intro"><div><span className="eyebrow">02 / AI ADMINISTRATION</span><h1>The Nexus</h1><p>A directory for your AI collaborators and the instructions you hand them.</p></div><Button onClick={()=>openEditor('agent')}>＋ New agent profile</Button></div>
          <div className="notice-panel">◈ Profiles and assignments are local records. No AI agent is running from this website, and provider subscriptions do not imply API access.</div>
          <div className="nexus-layout"><div className="agent-list">{data.agents.map((a,i)=><button className={`agent-select ${activeAgent===a.id?'selected':''}`} type="button" key={a.id} onClick={()=>setActiveAgent(a.id)}><span className="agent-avatar" style={{'--accent':accent[i%accent.length]} as React.CSSProperties}>{a.name.slice(0,1)}</span><span><strong>{a.name}</strong><small>{a.role}</small></span><span>›</span></button>)}</div><div className="panel agent-detail">{agent(activeAgent)?<><div className="agent-heading"><span className="agent-avatar big">{agent(activeAgent)?.name.slice(0,1)}</span><div><span className="eyebrow">AGENT PROFILE</span><h2>{agent(activeAgent)?.name}</h2><p>{agent(activeAgent)?.role}</p></div><Pill tone="neutral">{agent(activeAgent)?.status}</Pill></div><p>{agent(activeAgent)?.description}</p><div className="info-grid"><div><span>CAPABILITIES</span><strong>{agent(activeAgent)?.capabilities||'Not specified'}</strong></div><div><span>ASSOCIATED DOMAINS</span><strong>{agent(activeAgent)?.domainIds.map(x=>domain(x)?.name).filter(Boolean).join(', ')||'None'}</strong></div><div><span>NOTES</span><strong>{agent(activeAgent)?.notes||'None yet'}</strong></div><div><span>RESOURCE LINK</span><External url={agent(activeAgent)?.links||''}>Open service</External></div></div><div className="detail-actions"><Button onClick={()=>openEditor('assignment',undefined,{agentId:activeAgent})}>＋ Create assignment</Button><Button secondary onClick={()=>openEditor('agent',agent(activeAgent))}>Edit profile</Button><button className="danger-link" onClick={()=>remove('agent',agent(activeAgent)!)}>Remove</button></div><h3>Saved assignments</h3>{data.assignments.filter(x=>x.agentId===activeAgent).map(a=><article className="assignment" key={a.id}><div><strong>{a.title}</strong><small>{new Date(a.createdAt).toLocaleDateString()}</small></div><p>{a.instructions}</p><div className="card-actions"><button onClick={()=>{navigator.clipboard.writeText(a.instructions).then(()=>setNotice('Instructions copied')).catch(()=>setNotice('Clipboard unavailable'))}}>Copy instructions</button><button onClick={()=>openEditor('assignment',a)}>Edit</button><button onClick={()=>remove('assignment',a)}>Remove</button></div></article>)}{!data.assignments.some(x=>x.agentId===activeAgent)&&<Empty title="No assignments yet" detail="Save a prompt here, then copy it into the agent’s service manually."/>}</>:<Empty title="Choose an agent" detail="Select an agent profile or create your own."/ >}</div></div>
          <section className="panel graph-panel"><SectionHead eyebrow="KNOWLEDGE NETWORK" title="The Lattice"/><p>Explore your local domain and project relationships. Obsidian remains an external shortcut.</p><div className="lattice">{domains.map((d,i)=><button type="button" key={d.id} style={{'--accent':d.color} as React.CSSProperties} onClick={()=>{setActiveDomain(d.id);setActiveProject('');go('domains')}}><span>{['⛩','⬡','✦','◈','⌘','▤'][i%6]}</span><strong>{d.name}</strong><small>{data.projects.filter(p=>p.domainId===d.id&&!p.archived).length} projects ↗</small></button>)}</div><External url="https://obsidian.md/" className="text-action">Obsidian website</External></section>
        </>}
        {section==='codex'&&<>
          <div className="page-intro"><div><span className="eyebrow">03 / KNOWLEDGE & RECORDS</span><h1>The Codex</h1><p>Find and organize links, references, documents, and notes.</p></div><Button onClick={()=>openEditor('resource')}>＋ Add resource</Button></div>
          <div className="toolbar"><input type="search" aria-label="Search resources" placeholder="Search resources, tags, or notes…" value={search} onChange={e=>setSearch(e.target.value)}/><SelectField label="Domain" value={filter.domain} onChange={v=>setFilter({...filter,domain:v})} options={[['','All domains'],...domainOptions.slice(1)]}/></div>
          <div className="resource-grid">{resourceList.map(r=><article className="panel resource-card" key={r.id}><div className="resource-top"><span>▧</span><Pill>{r.category||'Resource'}</Pill></div><h3>{r.name}</h3><p>{r.description||'No description added.'}</p><div className="tag-row">{r.tags.map(tag=><span key={tag}>#{tag}</span>)}</div><small>{domain(r.domainId)?.name||'Unassigned'}{r.projectId?` / ${project(r.projectId)?.name||'Project'}`:''}</small><div className="resource-footer"><External url={r.url}>Open resource</External>{cardActions('resource',r)}</div></article>)}</div>
          {!resourceList.length&&<div className="panel"><Empty title={search?'No matching resources':'Your Codex is ready'} detail={search?'Try another search or filter.':'Add your first reference, link, or note.'} action={<Button onClick={()=>openEditor('resource')}>＋ Add resource</Button>}/></div>}
          <div className="panel external-resources"><h3>External knowledge spaces</h3><External url="https://www.notion.so/">Notion</External><External url="https://obsidian.md/">Obsidian</External><p>These open the service websites. No vault or workspace is connected.</p></div>
        </>}
        {section==='directives'&&<>
          <div className="page-intro"><div><span className="eyebrow">04 / TASKS & DIRECTIVES</span><h1>Directives</h1><p>Plan, assign, update, and close the work in front of you.</p></div><Button onClick={()=>openEditor('task')}>＋ New directive</Button></div>
          <div className="toolbar filter-bar"><input type="search" aria-label="Search tasks" placeholder="Search directives…" value={search} onChange={e=>setSearch(e.target.value)}/><SelectField label="Domain" value={filter.domain} onChange={v=>setFilter({...filter,domain:v,project:''})} options={[['','All domains'],...domainOptions.slice(1)]}/><SelectField label="Project" value={filter.project} onChange={v=>setFilter({...filter,project:v})} options={[['','All projects'],...projectOptions.slice(1).filter(([v])=>!filter.domain||project(v)?.domainId===filter.domain)]}/><SelectField label="Priority" value={filter.priority} onChange={v=>setFilter({...filter,priority:v})} options={['','Critical','High','Medium','Low'].map(x=>[x,x||'Any priority'])}/><SelectField label="Status" value={filter.status} onChange={v=>setFilter({...filter,status:v})} options={[['','Any status'],...statuses.map(x=>[x,x] as [string,string])]}/></div>
          <div className="panel task-list"><div className="list-heading"><span>DIRECTIVE</span><span>PRIORITY</span><span>STATUS</span></div>{taskFilters.map(taskCard)}{!taskFilters.length&&<Empty title={data.tasks.length?'No matches':'No directives yet'} detail={data.tasks.length?'Adjust the filters to see more tasks.':'Add a task to start organizing your priorities.'} action={<Button onClick={()=>openEditor('task')}>＋ New directive</Button>}/>}</div>
        </>}
        {section==='launcher'&&<>
          <div className="page-intro"><div><span className="eyebrow">05 / APPLICATION LAUNCHER</span><h1>Quick Access</h1><p>Your launchpad for tools across every domain. Unconfigured links are clearly marked.</p></div><Button onClick={()=>openEditor('shortcut')}>＋ Add shortcut</Button></div>
          {domains.map(d=>{const list=data.shortcuts.filter(s=>s.domainId===d.id);return list.length?<section className="launcher-group" key={d.id}><h2><i style={{background:d.color}}/>{d.name}</h2><div className="launcher-grid">{list.map(s=><article className="panel launch-card" key={s.id}><span className="launch-icon">{s.icon||'◇'}</span><strong>{s.name}</strong><External url={s.url}>Launch</External>{cardActions('shortcut',s)}</article>)}</div></section>:null})}
          {data.shortcuts.filter(s=>!s.domainId||!domain(s.domainId)).length>0&&<section className="launcher-group"><h2>Unassigned</h2><div className="launcher-grid">{data.shortcuts.filter(s=>!s.domainId||!domain(s.domainId)).map(s=><article className="panel launch-card" key={s.id}><span className="launch-icon">{s.icon}</span><strong>{s.name}</strong><External url={s.url}>Launch</External>{cardActions('shortcut',s)}</article>)}</div></section>}
        </>}
        <section className="data-control" id="data-control"><div><span className="eyebrow">LOCAL DATA</span><h3>Data & portability</h3><p>Records live in this browser on this device. They do not sync. Do not store passwords, API keys, or student details here.</p></div><div className="data-actions"><Button secondary onClick={()=>exportData(data)}>↓ Export JSON</Button><Button secondary onClick={()=>fileRef.current?.click()}>↑ Import JSON</Button><input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={e=>readFile(e.target.files?.[0])}/></div></section>
      </main>
    </div>
    {notice&&<div role="status" className="toast">{notice}</div>}
    {editor&&<EditorDialog editor={editor} data={data} onClose={()=>setEditor(null)} onSave={mutate} onRemove={remove}/>}
    {importing&&<div className="modal-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="import-title" className="dialog import-dialog"><span className="eyebrow">DATA IMPORT</span><h2 id="import-title">Review backup</h2><p>Valid Version 1 backup: {importing.domains.length} domains, {importing.projects.length} projects, {importing.resources.length} resources, {importing.tasks.length} tasks, {importing.agents.length} agents, {importing.assignments.length} assignments, {importing.shortcuts.length} shortcuts.</p><p className="warning">Replacing will overwrite every current browser record. Export your current data first if you want to keep it.</p><div className="dialog-actions"><Button secondary onClick={()=>setImporting(null)}>Cancel</Button><Button onClick={()=>{setData(importing);setActiveDomain('');setActiveProject('');setImporting(null);setNotice('Backup restored')}}>Replace all records</Button></div></div></div>}
  </div>;
}

function EditorDialog({editor,data,onClose,onSave,onRemove}:{editor:Editor;data:Data;onClose:()=>void;onSave:(key:keyof Data,record:Record<string,unknown>)=>void;onRemove:(kind:Editor['kind'],rec:Record<string,unknown>)=>void}){
  const {kind,record,defaults}=editor;
  const [form,setForm]=useState<Record<string,unknown>>({...defaults,...record});
  const set=(k:string,v:unknown)=>setForm(f=>({...f,[k]:v}));
  const val=(k:string)=>String(form[k]??'');
  const opts:[string,string][]= [['','Unassigned'],...data.domains.filter(x=>!x.archived).map(d=>[d.id,d.name] as [string,string])];
  const projectOpts=(domainId=val('domainId'),exclude=''):[string,string][]=> [['','None'],...data.projects.filter(p=>!p.archived&&!!domainId&&p.domainId===domainId&&p.id!==exclude).map(p=>[p.id,p.name] as [string,string])];
  const title={domain:'Domain',project:'Project',resource:'Resource',task:'Directive',agent:'Agent profile',assignment:'Assignment',shortcut:'Shortcut'}[kind];
  const submit=(e:React.FormEvent)=>{e.preventDefault();const name=val(kind==='task'||kind==='assignment'?'title':'name').trim();if(!name){return}
    const base={...form,id:record?.id||id(),origin:record?.origin||'user'};
    let result:Record<string,unknown>;
    switch(kind){
      case 'domain':result={description:'',color:'#af73e5',archived:false,...base,name};break;
      case 'project':result={domainId:'',parentId:null,description:'',archived:false,...base,name};result.parentId=val('parentId')||null;if(!result.domainId){alert('Choose a domain.');return}if(result.parentId){const p=data.projects.find(x=>x.id===result.parentId);if(p?.domainId!==result.domainId){alert('A subproject must be in the same domain.');return}let cursor:Project|undefined=p;while(cursor){if(cursor.id===result.id){alert('A project cannot contain itself.');return}cursor=data.projects.find(x=>x.id===cursor?.parentId)}}break;
      case 'resource':result={description:'',category:'Reference',domainId:'',projectId:'',url:'',tags:[],notes:'',...base,name};result.tags=val('tags').split(',').map(x=>x.trim()).filter(Boolean);result.url=val('url').trim();break;
      case 'task':result={description:'',domainId:'',projectId:'',priority:'Medium',status:'Planned',dueDate:'',assignee:'',notes:'',createdAt:new Date().toISOString(),completedAt:'',...base,title:name};result.completedAt=result.status==='Completed'?(result.completedAt||new Date().toISOString()):'';break;
      case 'agent':result={role:'',description:'',domainIds:[],capabilities:'',links:'',notes:'',status:'Not Connected',...base,name};result.domainIds=val('domainIds').split(',').filter(Boolean);break;
      case 'assignment':result={agentId:'',instructions:'',createdAt:new Date().toISOString(),taskId:'',...base,title:name};break;
      case 'shortcut':result={icon:'◇',domainId:'',url:'',...base,name};result.url=val('url').trim();break;
    }
    for(const field of ['url','links'])if(result[field]&& !safeUrl(result[field] as string)){alert('Use a full http:// or https:// URL.');return}
    onSave(kind==='assignment'?'assignments':kind+'s' as keyof Data,result);
  };
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div role="dialog" aria-modal="true" aria-labelledby="editor-title" className="dialog"><div className="dialog-heading"><div><span className="eyebrow">{record?'EDIT RECORD':'NEW RECORD'}</span><h2 id="editor-title">{record?'Edit':'Create'} {title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close">✕</button></div><form onSubmit={submit}>
    <TextField label={kind==='task'||kind==='assignment'?'Title':'Name'} value={val(kind==='task'||kind==='assignment'?'title':'name')} onChange={v=>set(kind==='task'||kind==='assignment'?'title':'name',v)} required/>
    {kind==='domain'&&<><TextField label="Description" value={val('description')} onChange={v=>set('description',v)} multi/><label className="field"><span>Accent color</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(val('color'))?val('color'):'#af73e5'} onChange={e=>set('color',e.target.value)}/></label></>}
    {kind==='project'&&<><SelectField label="Domain" value={val('domainId')} onChange={v=>{set('domainId',v);set('parentId','')}} options={opts}/><SelectField label="Parent project" value={val('parentId')} onChange={v=>set('parentId',v)} options={projectOpts(val('domainId'),val('id')||String(record?.id||''))}/><TextField label="Description" value={val('description')} onChange={v=>set('description',v)} multi/></>}
    {kind==='resource'&&<><TextField label="Description" value={val('description')} onChange={v=>set('description',v)} multi/><TextField label="Category" value={val('category')} onChange={v=>set('category',v)}/><SelectField label="Domain" value={val('domainId')} onChange={v=>{set('domainId',v);set('projectId','')}} options={opts}/><SelectField label="Project" value={val('projectId')} onChange={v=>set('projectId',v)} options={projectOpts()}/><TextField label="External URL" type="url" value={val('url')} onChange={v=>set('url',v)} placeholder="https://…"/><TextField label="Tags (comma separated)" value={Array.isArray(form.tags)?(form.tags as string[]).join(', '):val('tags')} onChange={v=>set('tags',v)}/><TextField label="Notes" value={val('notes')} onChange={v=>set('notes',v)} multi/></>}
    {kind==='task'&&<><TextField label="Description" value={val('description')} onChange={v=>set('description',v)} multi/><SelectField label="Domain" value={val('domainId')} onChange={v=>{set('domainId',v);set('projectId','')}} options={opts}/><SelectField label="Project" value={val('projectId')} onChange={v=>set('projectId',v)} options={projectOpts()}/><div className="form-pair"><SelectField label="Priority" value={val('priority')||'Medium'} onChange={v=>set('priority',v)} options={['Low','Medium','High','Critical'].map(x=>[x,x])}/><SelectField label="Status" value={val('status')||'Planned'} onChange={v=>set('status',v)} options={statuses.map(x=>[x,x])}/></div><TextField label="Due date" type="date" value={val('dueDate')} onChange={v=>set('dueDate',v)}/><SelectField label="Assigned to" value={val('assignee')} onChange={v=>set('assignee',v)} options={[['','Unassigned'],['Darren','Darren'],...data.agents.map(a=>[a.name,a.name] as [string,string])]}/><TextField label="Notes" value={val('notes')} onChange={v=>set('notes',v)} multi/></>}
    {kind==='agent'&&<><TextField label="Role" value={val('role')} onChange={v=>set('role',v)}/><TextField label="Description" value={val('description')} onChange={v=>set('description',v)} multi/><label className="field"><span>Associated domains</span><div className="checkbox-grid">{data.domains.map(d=><label key={d.id}><input type="checkbox" checked={(Array.isArray(form.domainIds)?form.domainIds as string[]:val('domainIds').split(',')).includes(d.id)} onChange={e=>{const current=Array.isArray(form.domainIds)?form.domainIds as string[]:val('domainIds').split(',').filter(Boolean);set('domainIds',e.target.checked?[...current,d.id]:current.filter(x=>x!==d.id))}}/>{d.name}</label>)}</div></label><TextField label="Capabilities" value={val('capabilities')} onChange={v=>set('capabilities',v)}/><TextField label="Service URL" type="url" value={val('links')} onChange={v=>set('links',v)} placeholder="https://…"/><SelectField label="Connection status" value={val('status')||'Not Connected'} onChange={v=>set('status',v)} options={['Not Connected','Manual Launch Available','API Connection Planned'].map(x=>[x,x])}/><TextField label="Notes" value={val('notes')} onChange={v=>set('notes',v)} multi/></>}
    {kind==='assignment'&&<><SelectField label="Agent profile" value={val('agentId')} onChange={v=>set('agentId',v)} options={data.agents.map(a=>[a.id,a.name] as [string,string])}/><TextField label="Instructions" value={val('instructions')} onChange={v=>set('instructions',v)} multi required/><SelectField label="Related task (optional)" value={val('taskId')} onChange={v=>set('taskId',v)} options={[['','None'],...data.tasks.map(t=>[t.id,t.title] as [string,string])]}/></>}
    {kind==='shortcut'&&<><TextField label="Icon or symbol" value={val('icon')||'◇'} onChange={v=>set('icon',v)}/><SelectField label="Domain" value={val('domainId')} onChange={v=>set('domainId',v)} options={opts}/><TextField label="Destination URL" type="url" value={val('url')} onChange={v=>set('url',v)} placeholder="Leave blank until configured"/></>}
    <div className="dialog-actions">{record&&<button type="button" className="danger-link" onClick={()=>onRemove(kind,record)}>Remove</button>}<Button secondary onClick={onClose}>Cancel</Button><button className="button" type="submit">Save {title.toLowerCase()}</button></div>
  </form></div></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
