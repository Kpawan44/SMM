import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Check, Flame, X, Sparkles, MessageSquare } from 'lucide-react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  user: any;
  triggerToast: (msg: string) => void;
}

export const NotificationCenter = ({ user, triggerToast }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldAnimateBell, setShouldAnimateBell] = useState(false);

  // Use refs to track statuses and avoid trigger on first load
  const orderStatusLedger = useRef<Record<string, string>>({});
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      orderStatusLedger.current = {};
      isFirstLoad.current = true;
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // If first load, populate our ledger without notifying the user
      if (isFirstLoad.current) {
        snapshot.docs.forEach((doc) => {
          orderStatusLedger.current[doc.id] = doc.data().status || 'pending';
        });
        isFirstLoad.current = false;
        return;
      }

      // Check current changes against ledger
      snapshot.docChanges().forEach((change) => {
        const orderId = change.doc.id;
        const oData = change.doc.data();
        const nextStatus = oData.status || 'pending';
        const prevStatus = orderStatusLedger.current[orderId];

        // If something was modified and transition from pending/processing to completed occurs
        if (change.type === 'modified') {
          if (prevStatus && prevStatus !== 'completed' && nextStatus === 'completed') {
            triggerCampaignCompletionNotification(orderId, oData);
          }
        }
        
        // Update ledger state
        orderStatusLedger.current[orderId] = nextStatus;
      });
    });

    return () => unsubscribe();
  }, [user]);

  const triggerCampaignCompletionNotification = (orderId: string, orderData: any) => {
    // Generate notification object
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(7),
      title: 'Campaign Order Delivered! 🎉',
      message: `Your campaign for "${orderData.category}" has shifted to Completed. Sent to: ${orderData.link}`,
      category: orderData.category,
      timestamp: new Date(),
      read: false
    };

    // Ring visual cue
    setShouldAnimateBell(true);
    setTimeout(() => {
      setShouldAnimateBell(false);
    }, 2500);

    // Audio cue (high-end elegant synth bloop)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio sandbox restricted or not supported is fine
    }

    // Prepend to our notifications list
    setNotifications(prev => [newNotif, ...prev]);

    // Push local in-app toaster
    triggerToast(`Success! Campaign #${orderId.substring(0, 5)} has completed.`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    triggerToast("All campaigns notifications cleared.");
  };

  const markSingleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative font-sans z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
        aria-label="Campaign Notifications Center"
      >
        {unreadCount > 0 ? (
          <motion.div
            animate={shouldAnimateBell ? {
              rotate: [0, -15, 15, -15, 15, -10, 10, -5, 5, 0],
              scale: [1, 1.1, 1]
            } : {}}
            transition={{ duration: 1.5 }}
          >
            <BellRing className="w-4.5 h-4.5 text-blue-400" />
          </motion.div>
        ) : (
          <Bell className="w-4.5 h-4.5 text-slate-400 hover:text-white" />
        )}

        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center animate-pulse border border-[#09090b]">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away backdrop */}
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)} 
            />

            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3 w-80 bg-[#111114] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40"
            >
              <div className="p-4 border-b border-white/5 bg-gradient-to-r from-blue-950/10 to-[#111114] flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Live Campaign Alerts</h4>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Real-time delivery tracer feed</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-500">
                      <Flame className="w-5 h-5 opacity-40" />
                    </div>
                    <p className="text-xs text-slate-400 font-bold">No new order changes logged</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[180px] mx-auto leading-relaxed font-mono">
                      Statuses will stream here as backend SMM nodes process campaigns.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markSingleRead(notif.id)}
                      className={`p-4 transition-all hover:bg-white/[2%] cursor-pointer relative ${
                        !notif.read ? 'bg-blue-500/[3%]' : ''
                      }`}
                    >
                      {/* Unread Indicator Dot */}
                      {!notif.read && (
                        <div className="absolute left-2.5 top-4 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      )}

                      <div className="pl-2 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-extrabold text-white text-[11px] leading-snug">
                            {notif.title}
                          </span>
                          <button
                            onClick={(e) => deleteNotification(e, notif.id)}
                            className="text-slate-500 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                          {notif.message}
                        </p>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[8px] uppercase font-bold text-slate-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                            {notif.category}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {notif.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-black/30 p-2 text-center text-[9px] text-slate-500 border-t border-white/5 select-none tracking-tighter">
                Connected node: <span className="text-emerald-500 font-mono">gs_live_gateway_v2</span> • Sandbox
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
