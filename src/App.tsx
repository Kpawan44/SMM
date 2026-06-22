/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from './lib/firebase';
import { HeroSection } from './components/HeroSection';
import { StatsSection } from './components/StatsSection';
import { FAQSection } from './components/FAQSection';
import { PricingTable } from './components/PricingTable';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { Toast } from './components/Toast';
import { WalletSection } from './components/Wallet';
import { NotificationCenter } from './components/NotificationCenter';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Compass, 
  Wallet, 
  ShieldCheck, 
  Sparkles, 
  LogOut, 
  Shield, 
  User, 
  Activity,
  DollarSign
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('admin'); // Simulate admin for now
  const [globalMarkup, setGlobalMarkup] = useState(150);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [emailInput, setEmailInput] = useState('demo@growsocials.co.in');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wallet' | 'admin'>('dashboard');
  const [balance, setBalance] = useState<number | null>(null);

  // Monitor perspective role: transition tab view gracefully if admin privileges are toggled off
  useEffect(() => {
    if (role === 'user' && activeTab === 'admin') {
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

  // Global real-time wallet balance sub to synchronize header navigation badge
  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }
    const walletRef = doc(db, 'wallets', user.uid);
    const unsubscribe = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        setBalance(snap.data().balance || 0);
      }
    }, (err) => {
      console.error("Global header ledger sub failure:", err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const emailToUse = currentUser.email || localStorage.getItem('demo_email') || 'demo@growsocials.co.in';
        setUser({
          uid: currentUser.uid,
          email: emailToUse,
          isAnonymous: currentUser.isAnonymous,
          emailVerified: currentUser.emailVerified ?? true
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const triggerToast = (message: string) => {
    setToast({ show: true, message });
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      triggerToast("Signed in as " + result.user.email);
    } catch (err: any) {
      console.warn("Google Pop-up blocked or cancelled:", err);
      triggerToast("Pop-up blocked or restricted by browser. Opening fallback credentials gateway.");
      setShowManualLogin(true);
    }
  };

  const handleDemoLogin = async () => {
    try {
      const emailToUse = emailInput || 'pawan.kummar16@gmail.com';
      localStorage.setItem('demo_email', emailToUse);
      
      // Sign in anonymously to establish a valid real-time Firestore auth context
      await signInAnonymously(auth);
      
      triggerToast("Success! Authenticated via GrowSocials Sandbox.");
      setShowManualLogin(false);
    } catch (err) {
      console.error("Anonymously authenticator error:", err);
      // Local fallback still allows basic client usage if auth node is unreachable
      setUser({
        uid: 'demo-user-123',
        email: emailInput || 'pawan.kummar16@gmail.com',
      });
      triggerToast("Fallback local authentication session active.");
      setShowManualLogin(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('demo_email');
    auth.signOut().catch(() => {});
    setUser(null);
    triggerToast("Signed out successfully.");
  };

  const handlePricingBuy = (serviceId: string) => {
    localStorage.setItem('preselected_category', serviceId);
    triggerToast("Proceeding with package. Please authenticate your GrowSocials sandbox.");
    setShowManualLogin(true);
  };

  return (
    <div className="w-full bg-[#09090b] text-slate-300 min-h-screen flex flex-col relative font-sans overflow-hidden">
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full"></div>
      
      <AnimatePresence>
        {toast.show && <Toast message={toast.message} onClose={() => setToast({ show: false, message: '' })} />}
      </AnimatePresence>

      {showManualLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#111114] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Browser Pop-up Blocked</h3>
              <p className="text-xs text-slate-500 mt-1">We loaded a sandbox container backup so you can bypass standard OAuth popup block rules.</p>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Simulated Account Email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleDemoLogin}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-xs"
            >
              Sign In to GrowSocials Workspace
            </button>
            <button
              onClick={() => setShowManualLogin(false)}
              className="w-full text-slate-500 hover:text-white transition-colors text-xs py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!user ? (
        <>
          <nav className="h-14 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-tr from-blue-600 to-purple-600 rounded flex items-center justify-center text-xs text-white">G</div>
              Grow<span className="text-blue-500">Socials</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowManualLogin(true)} className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all">Sandbox Login</button>
              <button onClick={handleGoogleSignIn} className="bg-blue-600 px-4 py-1.5 rounded-full text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20">Google Sign In</button>
            </div>
          </nav>
          <div className="flex-1 z-10">
            <HeroSection onGetStarted={handleGoogleSignIn} />
            <PricingTable onBuy={handlePricingBuy} />
            <StatsSection />
            <FAQSection />
          </div>
        </>
      ) : (
        <div className="flex-1 p-4 flex flex-col gap-4 z-10 max-w-[1400px] mx-auto w-full">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 font-mono text-xs">
                {user.email ? user.email[0].toUpperCase() : 'G'}
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Active Operator</p>
                <h1 className="text-sm font-bold text-white leading-none mt-0.5">{user.email}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
                <button 
                  onClick={() => { setRole('user'); triggerToast('Switched perspective to: Client Mode'); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Client Mode
                </button>
                <button 
                  onClick={() => { setRole('admin'); triggerToast('Switched perspective to: SMM Reseller Admin Mode'); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${role === 'admin' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  SMM Admin Mode
                </button>
              </div>

              <NotificationCenter user={user} triggerToast={triggerToast} />

              <button onClick={handleSignOut} className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all cursor-pointer">Sign Out</button>
            </div>
          </div>

          {/* New Premium Workspace Tab Navigation & Real-time Quick KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center justify-between border-b border-white/5 pb-3">
            <div className="md:col-span-8 flex items-center gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5 w-full md:max-w-md font-sans">
              <button
                type="button"
                onClick={() => { setActiveTab('dashboard'); triggerToast('Navigated to: Campaign Placement Hub'); }}
                className={`flex-1 py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Placement Hub</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('wallet'); triggerToast('Navigated to: Secure Refill Wallet'); }}
                className={`flex-1 py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'wallet'
                    ? 'bg-blue-600 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Secure Vault</span>
              </button>

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('admin'); triggerToast('Navigated to: SMM Reseller Command Center'); }}
                  className={`flex-1 py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Command Center</span>
                </button>
              )}
            </div>

            <div className="md:col-span-4 flex items-center justify-end gap-3 font-sans">
              <div className="bg-black/30 border border-white/5 py-1.5 px-3 rounded-xl flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Sandbox Redirections Live</span>
              </div>

              <div className="bg-[#111114] border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2.5">
                <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 text-xs font-bold">₹</div>
                <div>
                  <p className="text-[8px] text-slate-500 font-mono uppercase tracking-wider leading-none">Wallet balance</p>
                  <p className="text-xs font-black text-white font-mono mt-0.5 leading-none">
                    {balance === null ? 'Syncing...' : `₹${balance.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Workspace Viewport Panel */}
          <div className="w-full mt-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
                className="w-full font-sans"
              >
                {activeTab === 'dashboard' && (
                  <div className="w-full">
                    <Dashboard user={user} triggerToast={triggerToast} globalMarkup={globalMarkup} />
                  </div>
                )}

                {activeTab === 'wallet' && (
                  <div className="w-full">
                    <WalletSection user={user} triggerToast={triggerToast} />
                  </div>
                )}

                {activeTab === 'admin' && role === 'admin' && (
                  <div className="w-full">
                    <AdminPanel globalMarkup={globalMarkup} setGlobalMarkup={setGlobalMarkup} triggerToast={triggerToast} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
