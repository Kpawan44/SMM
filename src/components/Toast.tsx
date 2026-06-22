import { motion } from 'motion/react';
import { useEffect } from 'react';

export const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 bg-slate-900 border border-white/10 text-white px-6 py-3 rounded-xl shadow-2xl font-bold z-50 flex items-center gap-2"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
      {message}
    </motion.div>
  );
};
