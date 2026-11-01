import {useState} from 'react';
import {Link} from 'react-router';
import {ArrowUpRight,Image,Film} from 'lucide-react';
import type {Workspace} from '../workspaces/workspace-service';

const backgrounds=[
 {id:'mountains',kind:'image',title:'Mountains at sunset',author:'H. Hümâ Yardim',detail:'Still image · 3:2; crop to fit your slide',source:'https://www.pexels.com/photo/the-sun-is-setting-over-the-mountains-and-hills-27251563/',preview:'https://images.pexels.com/photos/27251563/pexels-photo-27251563/free-photo-of-the-sun-is-setting-over-the-mountains-and-hills.jpeg?auto=compress&fit=crop&w=640&h=360'},
 {id:'ocean',kind:'image',title:'Quiet ocean',author:'Johannes Plenio',detail:'Still image · 16:9',source:'https://www.pexels.com/photo/scenic-view-of-ocean-during-sunset-2304423/',preview:'https://images.pexels.com/photos/2304423/pexels-photo-2304423.jpeg?auto=compress&fit=crop&w=640&h=360'},
 {id:'clouds',kind:'video',title:'Sunset clouds',author:'Dmitry Marchenkov',detail:'Moving background · 16:9 · 1 minute',source:'https://www.pexels.com/video/clouds-on-sky-during-sunset-11345330/',preview:'https://images.pexels.com/videos/11345330/pexels-photo-11345330.jpeg?auto=compress&fit=crop&w=640&h=360'},
 {id:'twilight',kind:'video',title:'Colorful twilight',author:'Marianna Sigov',detail:'Moving background · 16:9 · 21 seconds',source:'https://www.pexels.com/video/vibrant-sunset-clouds-in-colorful-sky-34118027/',preview:'https://images.pexels.com/videos/34118027/pexels-photo-34118027.jpeg?auto=compress&fit=crop&w=640&h=360'},
] as const;
function BackgroundPreview({item}:{item:typeof backgrounds[number]}){
 const [failed,setFailed]=useState(false);
 return <div className="background-preview">{failed?<p>Preview unavailable. Open the source to view this background.</p>:<img src={item.preview} alt={item.title} width={640} height={360} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}<span>{item.kind==='video'?<Film size={15}/>:<Image size={15}/>}<span>{item.kind==='video'?'Video':'Image'}</span></span></div>;
}
export function BackgroundGalleryPage({workspace}:{workspace:Workspace}){
 const [filter,setFilter]=useState<'all'|'image'|'video'>('all');
 return <div className="page-content background-gallery"><header className="page-heading"><h1>Backgrounds for worship.</h1><p>Free still images and moving backgrounds to complement your words.</p></header>
  <section className="background-guide" aria-label="Use a background"><h2>From inspiration to your next slide.</h2><ol><li>View a background on Pexels and download a suitable size.</li><li>Import the file into Media library, then choose it in your presentation’s background settings.</li><li>Prepare the service on this laptop before presenting offline.</li></ol><div className="action-row"><Link className="button button-primary" to={'/app/w/'+workspace.id+'/media'}>Import downloaded media</Link><a className="text-button" href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Read Pexels license<ArrowUpRight size={15}/></a></div><p className="field-help">Choose images up to 1920 × 1080 and 5 MiB, or MP4 videos up to 128 MiB. Keep videos on this laptop. Previews need internet; viewing them does not upload files to your workspace.</p></section>
  <div className="background-filters action-row" role="group" aria-label="Background type">{([['all','All backgrounds'],['image','Still images'],['video','Moving backgrounds']] as const).map(([value,label])=><button key={value} className={'button'+(filter===value?' button-secondary':'')} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
  <div className="background-grid">{backgrounds.filter(item=>filter==='all'||item.kind===filter).map(item=><article className="background-card glass" key={item.id}><BackgroundPreview item={item}/><div className="background-card-content"><h2>{item.title}</h2><p>{item.detail}</p><p>By {item.author} on Pexels</p><a className="button" href={item.source} aria-label={'View '+item.title+' on Pexels'} target="_blank" rel="noopener noreferrer">{item.kind==='video'?'Watch and download':'View and download'}<ArrowUpRight size={16}/></a></div></article>)}</div>
 </div>;
}
