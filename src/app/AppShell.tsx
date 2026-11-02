import {ThemeToggle} from '../components/ThemeToggle';
import {BrandMark} from '../components/BrandMark';
import {UpdatePrompt} from '../features/offline/UpdatePrompt';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink,useLocation } from 'react-router';
import { Home, Presentation, Music, ListOrdered, Image, LayoutTemplate, Users, HardDriveDownload, PanelLeft, ChevronLeft, LogOut, Menu, X } from 'lucide-react';
import type { ProfileWorkspace } from '../features/auth/auth-service';
import { DashboardPage } from './DashboardPage';
import { WorkspacePicker } from '../features/workspaces/WorkspacePicker';
import type { Workspace } from '../features/workspaces/workspace-service';
import { mayChangeAccount } from '../lib/navigation-guard';
export function AppShell({ profile, onSignOut, children, activeWorkspace, workspaces }: {
  profile: ProfileWorkspace; onSignOut(): Promise<void>; children?: ReactNode; activeWorkspace?: Workspace; workspaces?: Workspace[];
}) {
  const location=useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const selected: Workspace = activeWorkspace ?? { id: profile.workspaceId, kind: 'personal', name: 'Personal workspace', ownerId: profile.profileId, role: 'owner' };
  const base = '/app/w/' + selected.id;
  const items = [
    { label: 'Overview', icon: Home, path: base, end: true },
    { label: 'Presentations', icon: Presentation, path: base + '/decks' },
    { label: 'Song library', icon: Music, path: base + '/songs' },
    { label: 'Service plans', icon: ListOrdered, path: base + '/services' },
    { label: 'Media library', icon: Image, path: base + '/media' },
    { label: 'Templates', icon: LayoutTemplate, path: base + '/templates' },
  ];
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a,button,select')?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMobileOpen(false); menuRef.current?.focus(); }
      if (event.key !== 'Tab') return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>('a,button,select');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); };
  }, [mobileOpen]);
  function closeDrawer() { setMobileOpen(false); menuRef.current?.focus(); }
  const initials = profile.displayName.trim().split(/\s+/).slice(0, 2).map(s => Array.from(s)[0]).join('');
  return <div className={'workspace-shell' + (collapsed ? ' is-collapsed' : '') + (mobileOpen ? ' drawer-open' : '')}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    {mobileOpen && <button className="drawer-backdrop" onClick={closeDrawer} aria-label="Close navigation overlay" />}
    <aside className="side-panel glass" ref={drawerRef} id="workspace-navigation">
      <div className="sidebar-brand-row"><Link className="brand" to="/app" onClick={() => setMobileOpen(false)} aria-label="PraisePoint overview"><BrandMark/><span className="collapse-copy"><strong>PraisePoint</strong><small>Prepare. Present. Worship.</small></span></Link>
        <button className={'icon-button sidebar-toggle'+(collapsed?' brand-toggle':'')} aria-label={collapsed?'Expand navigation':'Collapse navigation'} aria-expanded={!collapsed} aria-controls="workspace-navigation" onClick={()=>setCollapsed(value=>!value)}>{collapsed?<><BrandMark/><Menu className="brand-menu-icon" size={22}/></>:<span className="collapse-icon" aria-hidden="true"><PanelLeft className="collapse-panel" size={19}/><ChevronLeft className="collapse-arrow" size={14} strokeWidth={2.2}/></span>}</button></div>
      <nav className="primary-navigation" aria-label="Workspace">{items.map(({ label, icon: Icon, path, end }) => <NavLink key={label} to={path} end={end} aria-label={label} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}><Icon size={19} /><span className="collapse-copy">{label}</span></NavLink>)}
      <a className="nav-item" href="/offline" aria-label="Prepared services"><HardDriveDownload size={19}/><span className="collapse-copy">Prepared services</span></a></nav>
      <div className="sidebar-bottom"><Link className="nav-item" to={base + '/team'} onClick={closeDrawer} aria-label="Church workspace"><Users size={19} /><span className="collapse-copy">Church workspace</span></Link>
        <ThemeToggle/>
        <div className="profile"><span className="avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}</span><span className="collapse-copy"><strong>{profile.displayName}</strong><small>Church volunteer</small></span>
          <button className="icon-button sign-out" aria-label="Sign out" disabled={signingOut} onClick={async () => { if (!await mayChangeAccount()) return; setSigningOut(true); try{await onSignOut();}finally{setSigningOut(false);} }}><LogOut size={17} /></button></div>
      </div>
    </aside>
    <div className="main-column"><header className="top-bar glass">
      <button ref={menuRef} className="icon-button mobile-menu" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="workspace-navigation" onClick={() => mobileOpen ? closeDrawer() : setMobileOpen(true)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <div className="breadcrumb"><span>Workspace</span></div>
      <div className="top-bar-right"><WorkspacePicker workspaces={workspaces ?? [selected]} selected={selected}/></div>
    </header><main id="main-content" className="main-panel glass"><UpdatePrompt/>{selected.deletionPending && location.pathname!==base+'/team'?<section className="page-content"><h1>Workspace deletion is in progress.</h1><p>Changes are paused while this workspace’s content and files are removed.</p><Link className="button" to={base+'/team'}>{selected.role==='owner'?'Resume workspace deletion':'View workspace status'}</Link></section>:children ?? <DashboardPage workspaceId={selected.id} shared={selected.kind==='church'} />}</main></div>
  </div>;
}
