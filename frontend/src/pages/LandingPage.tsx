/*
 * The public welcome page: http://localhost:5173/welcome (a signed-out visitor opening "/" lands here).
 * It is EduMate's shop window, and the place where the scroll effects live:
 *
 *   Hero      the headline slides up word by word; the product preview below it is tilted back in 3D
 *             and straightens as you scroll; glass cards around it drift with the mouse.
 *   Marquee   two rows of module names gliding in opposite directions.
 *   Numbers   count up when they scroll into view.
 *   Modules   a "bento" grid of tiles that appear one after another.
 *   Journey   the left picture stays pinned (sticky) while the steps scroll past; the ring fills step by step.
 *   Roles     scrolling DOWN moves a row of cards SIDEWAYS (a pinned horizontal gallery).
 *   Quality   the tested fixes from the SQA report.
 */
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  CircleCheck,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Lock,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { Role } from '../api/types';
import { Ring } from '../components/charts';
import { useScrolled } from '../components/ScrollExtras';
import { followPointer } from '../components/StatCard';
import { ThemeToggle } from '../components/Topbar';
import { IconTile } from '../components/ui';
import { t } from '../i18n/messages';
import { CountUp } from '../motion/CountUp';
import { Float, usePointer } from '../motion/Parallax';
import { EASE_OUT } from '../motion/presets';
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal';
import { ROLE_ICONS } from '../navigation';

const L = t.landing;

/** Facts about EduMate shown as big numbers (they match the README and the SQA report). */
const STATS: { value: string; label: string }[] = [
  { value: '7', label: L.stats.modules },
  { value: '9', label: L.stats.roles },
  { value: '19', label: L.stats.findings },
  { value: '2', label: L.stats.campuses },
];

const MODULE_ICONS: Record<keyof typeof L.modules, LucideIcon> = {
  admissions: Inbox,
  attendance: CalendarCheck,
  exams: Trophy,
  fees: Wallet,
  timetable: CalendarRange,
  library: BookOpen,
  admin: ShieldCheck,
};

const JOURNEY_ICONS: Record<keyof typeof L.journey, LucideIcon> = {
  apply: FileText,
  attend: ClipboardCheck,
  examine: Ticket,
  results: Trophy,
  pay: CreditCard,
};

const QUALITY_ICONS: Record<keyof typeof L.quality, LucideIcon> = {
  rbac: ShieldCheck,
  locking: Lock,
  payments: ReceiptText,
  approval: Users,
  audit: History,
  lockout: KeyRound,
};

const MARQUEE_ICONS: LucideIcon[] = [
  Inbox,
  CalendarCheck,
  Ticket,
  Trophy,
  Wallet,
  CalendarRange,
  BookOpen,
  History,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  Users,
];

export function LandingPage() {
  const scrolled = useScrolled(24);

  return (
    <div className="landing">
      <header className="l-nav" data-scrolled={scrolled}>
        <Link to="/welcome" className="sidebar-brand">
          <span className="brand-mark">
            <GraduationCap size={18} />
          </span>
          <span>{t.app.name}</span>
        </Link>
        <nav className="l-links" aria-label={t.common.mainMenu}>
          <a href="#modules">{L.nav.modules}</a>
          <a href="#journey">{L.nav.journey}</a>
          <a href="#roles">{L.nav.roles}</a>
          <a href="#quality">{L.nav.quality}</a>
        </nav>
        <div className="l-nav-actions">
          <ThemeToggle />
          <Link to="/login" className="btn">
            {L.nav.signIn} <ArrowRight size={16} className="arrow" />
          </Link>
        </div>
      </header>

      <Hero />
      <Marquee />

      <section className="l-section">
        <div className="l-container l-stats">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} className="l-stat" delay={i * 0.08}>
              <strong className="text-gradient">
                <CountUp value={stat.value} duration={1.6} />
              </strong>
              <span>{stat.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="l-section" id="modules" style={{ paddingTop: 0 }}>
        <div className="l-container">
          <SectionHead eyebrow={L.modulesEyebrow} title={L.modulesTitle} body={L.modulesBody} />
          <Stagger className="bento" gap={0.08} inView>
            {(Object.keys(L.modules) as (keyof typeof L.modules)[]).map((key) => (
              <StaggerItem key={key} className="bento-item">
                <div className="stat interactive" onPointerMove={followPointer}>
                  <IconTile icon={MODULE_ICONS[key]} size="lg" />
                  <h3>{L.modules[key].title}</h3>
                  <p>{L.modules[key].body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <Journey />
      <RolesGallery />

      <section className="l-section" id="quality">
        <div className="l-container">
          <SectionHead eyebrow={L.qualityEyebrow} title={L.qualityTitle} body={L.qualityBody} />
          <Stagger className="quality" gap={0.07} inView>
            {(Object.keys(L.quality) as (keyof typeof L.quality)[]).map((key) => (
              <StaggerItem key={key}>
                <div className="stat tone-good interactive" onPointerMove={followPointer}>
                  <IconTile icon={QUALITY_ICONS[key]} tone="good" />
                  <h3>{L.quality[key].title}</h3>
                  <p>{L.quality[key].body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="l-section" style={{ paddingTop: 0 }}>
        <Reveal className="l-container">
          <div className="l-cta noise">
            <div className="aurora" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2>
              <span className="text-gradient">{L.ctaTitle}</span>
            </h2>
            <p>{L.ctaBody}</p>
            <Link to="/login" className="btn btn-lg">
              {L.ctaButton} <ArrowRight size={18} className="arrow" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="l-footer">
        {L.footer} · {t.app.release}
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <Reveal className="l-head">
      <span className="l-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </Reveal>
  );
}

/** Words that slide up one after another, each out of its own clipped box. */
function Words({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <Fragment key={i}>
          <span className="word">
            <motion.span
              className={className}
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: delay + i * 0.07 }}
            >
              {word}
            </motion.span>
          </span>{' '}
        </Fragment>
      ))}
    </>
  );
}

function Hero() {
  const stage = useRef<HTMLDivElement>(null);
  const pointer = usePointer();
  const reduce = useReducedMotion();
  // 0 when the preview's top edge is at the bottom of the window, 1 when it reaches the top.
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start end', 'start start'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [26, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.9, 1]);
  const titleWords = L.titleA.split(' ').length;

  return (
    <section className="l-hero noise" onPointerMove={pointer.onPointerMove} onPointerLeave={pointer.onPointerLeave}>
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="grid-lines" aria-hidden="true" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <span className="glow-pill">
          <span className="dot">
            <Sparkles size={12} />
          </span>
          {L.badge}
        </span>
      </motion.div>

      <h1 className="l-title">
        <Words text={L.titleA} delay={0.1} />
        <Words text={L.titleAccent} delay={0.1 + titleWords * 0.07} className="serif text-gradient" />
        <Words text={L.titleB} delay={0.2 + (titleWords + 1) * 0.07} />
      </h1>

      <motion.p
        className="l-lead"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55, ease: EASE_OUT }}
      >
        {L.body}
      </motion.p>
      <motion.div
        className="l-ctas"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT }}
      >
        <Link to="/login" className="btn btn-lg">
          {L.ctaPrimary} <ArrowRight size={18} className="arrow" />
        </Link>
        <a href="#modules" className="btn btn-secondary btn-lg">
          {L.ctaSecondary}
        </a>
      </motion.div>

      <div className="scroll-hint" aria-hidden="true">
        <span className="mouse" />
        {L.scrollHint}
      </div>

      <div className="l-stage" ref={stage} aria-hidden="true">
        <Float pointer={pointer} depth={-26} className="float-card" style={{ left: '-4%', top: '18%' }}>
          <Ring percent={92} size={52} stroke={6} tone="good">
            <strong style={{ fontSize: 12 }}>92%</strong>
          </Ring>
          <div>
            <strong>{t.preview.attendance}</strong>
            <span>{t.attendance.status.OK}</span>
          </div>
        </Float>
        <Float pointer={pointer} depth={34} className="float-card" style={{ right: '-5%', top: '8%' }}>
          <IconTile icon={CircleCheck} tone="good" />
          <div>
            <strong>{t.preview.paid}</strong>
            <span>{t.preview.paidHint}</span>
          </div>
        </Float>
        <Float pointer={pointer} depth={18} className="float-card" style={{ right: '4%', bottom: '14%' }}>
          <IconTile icon={ShieldCheck} tone="accent" />
          <div>
            <strong>{t.preview.approved}</strong>
            <span>{t.preview.approvedHint}</span>
          </div>
        </Float>

        <motion.div className="mock" style={{ rotateX, scale }}>
          <div className="mock-bar">
            <i />
            <i />
            <i />
          </div>
          <div className="mock-side">
            {[LayoutDashboard, CalendarCheck, Ticket, Trophy, Wallet].map((Icon, i) => (
              <span key={i} className={i === 0 ? 'nav-link active' : 'nav-link'}>
                {i === 0 && <span className="nav-pill" />}
                <Icon size={15} className="nav-icon" />
                <span className="nav-label">
                  {[t.nav.dashboard, t.nav.myAttendance, t.nav.hallTicket, t.nav.myResults, t.nav.myFees][i]}
                </span>
              </span>
            ))}
          </div>
          <div className="mock-main">
            <div className="hero">
              <div className="aurora">
                <span />
                <span />
                <span />
              </div>
              <div className="grid-lines" />
              <h1>
                {t.dashboard.timeOfDay.morning}, <span className="serif text-gradient">{t.preview.name}</span>
              </h1>
            </div>
            <div className="grid">
              <div className="stat tone-good">
                <IconTile icon={CalendarCheck} tone="good" size="sm" />
                <span className="stat-label">{t.preview.attendance}</span>
                <span className="stat-value">92.40%</span>
              </div>
              <div className="stat tone-neutral">
                <IconTile icon={Trophy} tone="neutral" size="sm" />
                <span className="stat-label">{t.preview.cgpa}</span>
                <span className="stat-value">8.63</span>
              </div>
              <div className="stat tone-warn">
                <IconTile icon={Wallet} tone="warn" size="sm" />
                <span className="stat-label">{t.preview.feesDue}</span>
                <span className="stat-value">₹0</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = L.marquee.map((label, i) => ({ label, Icon: MARQUEE_ICONS[i % MARQUEE_ICONS.length] }));
  // Each row holds the list twice; sliding it by exactly half makes the loop seamless.
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-row">
        {row.map(({ label, Icon }, i) => (
          <span key={i} className="chip">
            <Icon size={15} /> {label}
          </span>
        ))}
      </div>
      <div className="marquee-row reverse">
        {[...row].reverse().map(({ label, Icon }, i) => (
          <span key={i} className="chip">
            <Icon size={15} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Journey() {
  const keys = Object.keys(L.journey) as (keyof typeof L.journey)[];
  const [active, setActive] = useState(0);
  const ActiveIcon = JOURNEY_ICONS[keys[active]];

  return (
    <section className="l-section" id="journey">
      <div className="l-container">
        <SectionHead eyebrow={L.journeyEyebrow} title={L.journeyTitle} body={L.journeyBody} />
        <div className="journey">
          <div className="journey-sticky" aria-hidden="true">
            <div className="journey-orb">
              <Ring key={active} percent={((active + 1) / keys.length) * 100} size={400} stroke={5} tone="info" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="journey-icon"
                  initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                  transition={{ duration: 0.35 }}
                >
                  <IconTile icon={ActiveIcon} size="lg" tone="accent" />
                </motion.div>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.span
                  key={active}
                  className="journey-num text-gradient"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                >
                  0{active + 1}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <ol className="journey-steps" style={{ listStyle: 'none', margin: 0 }}>
            {keys.map((key, i) => (
              <JourneyStep key={key} index={i} onActive={setActive} title={L.journey[key].title} body={L.journey[key].body} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** One step. When it reaches the middle band of the window it becomes the active one. */
function JourneyStep({
  index,
  title,
  body,
  onActive,
}: {
  index: number;
  title: string;
  body: string;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inMiddle = useInView(ref, { margin: '-45% 0px -45% 0px' });

  useLayoutEffect(() => {
    if (inMiddle) onActive(index);
  }, [inMiddle, index, onActive]);

  return (
    <motion.li
      ref={ref}
      className="journey-step"
      initial={{ opacity: 0.25 }}
      animate={{ opacity: inMiddle ? 1 : 0.35 }}
      transition={{ duration: 0.4 }}
    >
      <span className="step-index">0{index + 1}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </motion.li>
  );
}

function RolesGallery() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const distance = useMotionValue(0); // how far the row must slide: its width minus the window width
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const x = useTransform([scrollYProgress, distance], ([progress, far]: number[]) => -progress * far);
  const roles = Object.keys(L.roleBlurbs) as Role[];

  useLayoutEffect(() => {
    const measure = () => distance.set(Math.max(0, (track.current?.scrollWidth ?? 0) - window.innerWidth));
    measure();
    const observer = new ResizeObserver(measure);
    if (track.current) observer.observe(track.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [distance]);

  return (
    <section className="h-scroll" id="roles" ref={section}>
      <div className="h-sticky">
        <div className="l-container">
          <SectionHead eyebrow={L.rolesEyebrow} title={L.rolesTitle} body={L.rolesBody} />
        </div>
        <motion.div className="h-track" ref={track} style={{ x }}>
          {roles.map((role, i) => {
            const Icon = ROLE_ICONS[role];
            return (
              <article key={role} className="role-card">
                <IconTile icon={Icon} size="lg" tone={i % 2 === 0 ? 'info' : 'accent'} />
                <h3>{t.roles[role]}</h3>
                <p>{L.roleBlurbs[role]}</p>
                <span className="role-num">
                  0{i + 1} / 0{roles.length}
                </span>
              </article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
