/*
 * The home page after login:
 *   1. a welcome banner (greeting for the time of day, today's date, role and campus) on a slowly
 *      drifting "aurora" of brand colours;
 *   2. "At a glance": tiles chosen by the backend for the user's role, whose numbers count up;
 *   3. "Jump back in": a shortcut to every page this role can open.
 */
import { motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  BookCopy,
  BookOpen,
  Building,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CircleX,
  Clock,
  Command,
  Eye,
  FileText,
  FileUp,
  Hourglass,
  Inbox,
  Landmark,
  ListChecks,
  Mail,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  TriangleAlert,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../api/endpoints';
import { useUser } from '../auth/AuthContext';
import { StatCard } from '../components/StatCard';
import { EmptyState, ErrorBanner, IconTile } from '../components/ui';
import { useLoad } from '../hooks/useLoad';
import { t } from '../i18n/messages';
import { EASE_OUT } from '../motion/presets';
import { Stagger, StaggerItem } from '../motion/Reveal';
import { MENU, ROLE_ICONS } from '../navigation';
import { formatLongDay } from '../utils/format';
import { firstName, timeOfDay } from '../utils/visuals';

/** An icon for each kind of tile the backend can send (DashboardService.java names them by `key`). */
const CARD_ICONS: Record<string, LucideIcon> = {
  attendance: CalendarCheck,
  shortfall: TriangleAlert,
  fees: Wallet,
  hallTicket: Ticket,
  results: Trophy,
  library: BookOpen,
  courses: BookCopy,
  today: CalendarClock,
  awaiting: Hourglass,
  approved: BadgeCheck,
  published: Send,
  submitted: Inbox,
  review: Eye,
  shortlisted: ListChecks,
  enrolled: UserCheck,
  collected: Landmark,
  failed: CircleX,
  pending: Clock,
  open: BookOpen,
  overdue: CalendarX,
  status: FileText,
  documents: FileUp,
  consent: ShieldCheck,
  outbox: Mail,
  faculty: Users,
  audit: ScrollText,
};

export function DashboardPage() {
  const user = useUser();
  const { data: cards, error, loading, reload } = useLoad(() => api.dashboard(), []);
  const now = new Date();
  const RoleIcon = ROLE_ICONS[user.role];
  const shortcuts = MENU[user.role].filter((item) => item.to !== '/');

  return (
    <>
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        <div className="aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="grid-lines" aria-hidden="true" />
        <div>
          <div className="page-eyebrow">
            <span className="page-eyebrow-icon">
              <Sparkles size={14} />
            </span>
            {formatLongDay(now)}
          </div>
          <h1>
            {t.dashboard.timeOfDay[timeOfDay(now.getHours())]},{' '}
            <span className="serif text-gradient">{firstName(user.fullName)}</span>
          </h1>
          <p>{t.dashboard.subtitle}</p>
          <div className="hero-meta">
            <span className="chip">
              <RoleIcon size={14} /> {t.roles[user.role]}
            </span>
            <span className="chip">
              <Building size={14} /> {t.topbar.campus(user.campusCode)}
            </span>
            <span className="chip">
              <Command size={14} /> {t.dashboard.searchHint}
            </span>
          </div>
        </div>
      </motion.section>

      <div className="section-title">
        <h2>{t.dashboard.glanceTitle}</h2>
      </div>
      {loading && <TileSkeletons />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {cards && cards.length === 0 && <EmptyState text={t.dashboard.empty} />}
      {cards && cards.length > 0 && (
        <Stagger className="grid" gap={0.08} delay={0.15}>
          {cards.map((card) => (
            <StaggerItem key={card.key}>
              <StatCard
                label={card.label}
                value={card.value}
                hint={card.hint}
                tone={card.tone}
                icon={CARD_ICONS[card.key] ?? Sparkles}
                to={card.link}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {shortcuts.length > 0 && (
        <>
          <div className="section-title">
            <h2>{t.dashboard.quickTitle}</h2>
            <span className="muted small">{t.dashboard.quickHint}</span>
          </div>
          <Stagger className="quick-links" gap={0.05} inView>
            {shortcuts.map((item) => (
              <StaggerItem key={item.to}>
                <Link className="quick-link" to={item.to}>
                  <IconTile icon={item.icon} size="sm" />
                  {item.label}
                  <ArrowRight size={16} className="arrow" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </>
  );
}

/** Four shimmering placeholder tiles while the numbers load. */
function TileSkeletons() {
  return (
    <div className="grid" aria-busy="true">
      <span className="sr-only">{t.common.loading}</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="stat" aria-hidden="true">
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: '45%', height: 12, marginTop: 10 }} />
          <div className="skeleton" style={{ width: '60%', height: 28, marginTop: 6 }} />
          <div className="skeleton" style={{ width: '70%', height: 10, marginTop: 'auto' }} />
        </div>
      ))}
    </div>
  );
}
