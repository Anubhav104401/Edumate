/*
 * Shown for any address that is not in App.tsx: a big gradient "404" and a floating compass.
 */
import { motion } from 'motion/react';
import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router';
import { t } from '../i18n/messages';
import { EASE_OUT } from '../motion/presets';

export function NotFoundPage() {
  return (
    <div className="nf">
      <div className="empty-icon">
        <Compass size={28} />
      </div>
      <motion.div
        className="nf-code text-gradient"
        initial={{ opacity: 0, scale: 0.8, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        {t.notFound.code}
      </motion.div>
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.body}</p>
      <Link className="btn btn-lg" to="/">
        <ArrowLeft size={18} /> {t.notFound.home}
      </Link>
    </div>
  );
}
