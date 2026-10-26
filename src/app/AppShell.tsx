import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { Home, Presentation, Music, ListOrdered, Image, LayoutTemplate, Users, ShieldCheck, PanelLeftClose, PanelLeftOpen, ChevronDown, LogOut, Menu, X } from 'lucide-react';
import type { ProfileWorkspace } from '../features/auth/auth-service';
import { DashboardPage } from './DashboardPage';
export function AppShell({ profile, onSignOut, children }: { profile: ProfileWorkspace; onSignOut(): Promise<void>; children?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solid, setSolid] = useState(() => localStorage.getItem('gather-transparency') === 'reduced');
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const base = '/app/w/' + profile.workspaceId;
  const items = [
    { label: 'Overview', icon: Home, path: base, end: true },
    { label: 'Presentations', icon: Presentation, path: base + '/decks' },
    { label: 'Song library', icon: Music, path: base + '/songs' },
    { label: 'Service plans', icon: ListOrdered, path: base + '/services' },
    { label: 'Media library', icon: Image, path: base + '/media' },
    { label: 'Templates', icon: LayoutTemplate, path: base + '/templates' },
  ];
  useEffect(() => {
    document.documentElement.dataset.transparency = solid ? 'reduced' : 'full';
    localStorage.setItem('gather-transparency', solid ? 'reduced' : 'full');
  }, [solid]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMobileOpen(false); menuRef.current?.focus(); }
      if (event.key !== 'Tab') return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>('a,button');
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
      <Link className="brand" to="/app" onClick={() => setMobileOpen(false)} aria-label="Gather overview"><span className="brand-cross" aria-hidden="true" /><span className="collapse-copy"><strong>Gather</strong><small>Prepare. Present. Worship.</small></span></Link>
      <Link className="workspace-picker glass-control" to={base + '/team'} aria-label="Personal workspace"><span className="workspace-letter">P</span><span className="collapse-copy"><strong>Personal workspace</strong><small>Private to you</small></span><ChevronDown className="collapse-copy" size={15} /></Link>
      <nav className="primary-navigation" aria-label="Workspace">{items.map(({ label, icon: Icon, path, end }) => <NavLink key={label} to={path} end={end} aria-label={label} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}><Icon size={19} /><span className="collapse-copy">{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><Link className="nav-item" to={base + '/team'} aria-label="Church workspace"><Users size={19} /><span className="collapse-copy">Church workspace</span></Link>
        <button className="nav-item" aria-label="Reduce transparency" aria-pressed={solid} onClick={() => setSolid(v => !v)}><ShieldCheck size={19} /><span className="collapse-copy">Reduce transparency</span></button>
        <button className="collapse-button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} onClick={() => setCollapsed(v => !v)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span className="collapse-copy">Collapse sidebar</span></button>
        <div className="profile"><span className="avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}</span><span className="collapse-copy"><strong>{profile.displayName}</strong><small>Church volunteer</small></span>
          <button className="icon-button sign-out" aria-label="Sign out" disabled={signingOut} onClick={async () => { setSigningOut(true); await onSignOut(); setSigningOut(false); }}><LogOut size={17} /></button></div>
      </div>
    </aside>
    <div className="main-column"><header className="top-bar glass">
      <button ref={menuRef} className="icon-button mobile-menu" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="workspace-navigation" onClick={() => mobileOpen ? closeDrawer() : setMobileOpen(true)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <div className="breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>Personal</strong></div>
      <div className="top-bar-right"><span className="private-label"><ShieldCheck size={14} />Private workspace</span><span className="avatar" aria-label={profile.displayName}>{initials}</span></div>
    </header><main id="main-content" className="main-panel glass">{children ?? <DashboardPage workspaceId={profile.workspaceId} />}</main></div>
  </div>;
}
