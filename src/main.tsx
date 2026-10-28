import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/glass.css';
if (localStorage.getItem('gather-transparency') === 'reduced') document.documentElement.dataset.transparency = 'reduced';
const root=createRoot(document.getElementById('root')!),audience=location.pathname.match(/^\/audience\/([^/]+)\/?$/);
if(audience){
 document.documentElement.dataset.surface='audience';document.title='Gather · Projector';
 void import('./features/presenter/AudiencePage').then(({AudiencePage})=>root.render(<StrictMode><AudiencePage sessionId={audience[1]}/></StrictMode>));
}else void import('./app/WorkspaceApp').then(({WorkspaceApp})=>root.render(<StrictMode><WorkspaceApp/></StrictMode>));
