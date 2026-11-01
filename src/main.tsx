import {initializeOfflineRuntime} from './features/offline/runtime-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/glass.css';
import './styles/themes.css';
import {initializeTheme} from './lib/theme';
initializeTheme();
initializeOfflineRuntime();
const root=createRoot(document.getElementById('root')!),audience=location.pathname.match(/^\/audience\/([^/]+)\/?$/);
if(audience){
 document.documentElement.dataset.surface='audience';document.title='PraisePoint · Projector';
 void import('./features/presenter/AudiencePage').then(({AudiencePage})=>root.render(<StrictMode><AudiencePage sessionId={audience[1]}/></StrictMode>));
}else if(/^\/offline(?:\/|$)/.test(location.pathname)){void import('./features/offline/OfflineApp').then(({OfflineApp})=>root.render(<StrictMode><OfflineApp/></StrictMode>));}
else void import('./app/WorkspaceApp').then(({WorkspaceApp})=>root.render(<StrictMode><WorkspaceApp/></StrictMode>));
