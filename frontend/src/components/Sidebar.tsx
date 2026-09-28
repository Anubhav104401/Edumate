/*
 * The side menu: the EduMate logo, the links this role may use (grouped under small headings),
 * and the signed-in person at the bottom.
 *
 * - The highlighted background behind the active link is ONE element that motion slides from
 *   link to link (a "shared layout animation", tied together by layoutId="nav-pill").
 * - On a computer the menu can be collapsed to icons only; hovering an icon then shows its name
 *   in a tooltip (Radix UI Tooltip).
 * - On a phone it becomes a drawer that slides in from the left (see app.css, max-width: 960px).
 */
import { motion } from 'motion/react';
import { GraduationCap, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Tooltip } from 'radix-ui';
import { Fragment, type ReactElement } from 'react';
import { Link, NavLink } from 'react-router';
import { useUser } from '../auth/AuthContext';
import { t } from '../i18n/messages';
import { SPRING } from '../motion/presets';
import { MENU } from '../navigation';
import { Avatar } from './ui';

interface Props {
  collapsed: boolean;
  open: boolean;
  onNavigate: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, open, onNavigate, onToggleCollapse }: Props) {
  const user = useUser();
  const items = MENU[user.role];

  return (
    <Tooltip.Provider delayDuration={150}>
      <nav className="sidebar" aria-label={t.common.mainMenu} data-open={open}>
        <Link to="/" className="sidebar-brand" onClick={onNavigate}>
          <span className="brand-mark">
            <GraduationCap size={20} />
          </span>
          <span>{t.app.name}</span>
        </Link>

        <div className="sidebar-nav">
          {items.map((item, index) => (
            <Fragment key={item.to}>
              {/* A small heading whenever the section changes from the previous link. */}
              {(index === 0 || items[index - 1].section !== item.section) && <div className="nav-section">{item.section}</div>}
              <NavTip label={item.label} show={collapsed}>
                <NavLink to={item.to} end={item.to === '/'} className="nav-link" onClick={onNavigate}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={SPRING} />}
                      <item.icon size={18} className="nav-icon" />
                      <span className="nav-label">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </NavTip>
            </Fragment>
          ))}
        </div>

        <div className="sidebar-footer">
          <NavTip label={`${user.fullName} · ${t.roles[user.role]}`} show={collapsed}>
            <div className="user-chip" tabIndex={collapsed ? 0 : undefined}>
              <Avatar name={user.fullName} />
              <div className="user-chip-text">
                <strong>{user.fullName}</strong>
                <span>
                  {t.roles[user.role]} · {user.campusCode}
                </span>
              </div>
            </div>
          </NavTip>
          <NavTip label={t.common.expand} show={collapsed}>
            <button type="button" className="nav-link collapse-btn" onClick={onToggleCollapse} aria-expanded={!collapsed}>
              {collapsed ? <PanelLeftOpen size={18} className="nav-icon" /> : <PanelLeftClose size={18} className="nav-icon" />}
              <span className="nav-label">{t.common.collapse}</span>
            </button>
          </NavTip>
        </div>
      </nav>
    </Tooltip.Provider>
  );
}

/** Shows `label` in a tooltip to the right of the child, but only while `show` is true. */
function NavTip({ label, show, children }: { label: string; show: boolean; children: ReactElement }) {
  if (!show) {
    return children;
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={12} className="tooltip">
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
