import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { 
  Play, 
  Check, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  ShoppingBag, 
  CreditCard, 
  Landmark, 
  ShieldCheck,
  TrendingUp,
  Settings,
  ListOrdered,
  Calendar,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  globalMarkup: number;
  setGlobalMarkup: (val: number) => void;
  triggerToast: (msg: string) => void;
}

export const AdminPanel = ({ globalMarkup, setGlobalMarkup, triggerToast }: AdminPanelProps) => {
  const [providerUrl, setProviderUrl] = useState('https://wholesalesmm.com/api/v2');
  const [apiKey, setApiKey] = useState('gs_live_9a7d2b8e3f1c5d7a');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Payment Setup States
  const [upiId, setUpiId] = useState('gs-pay-sandbox@ybl');
  const [minRefill, setMinRefill] = useState(200);
  const [enableUpi, setEnableUpi] = useState(true);
  const [enableCard, setEnableCard] = useState(true);
  const [enableNetBanking, setEnableNetBanking] = useState(true);
  const [successRate, setSuccessRate] = useState('100%');
  const [instructionCaption, setInstructionCaption] = useState('Verify transactions securely inside SMM control panel.');

  // Simulation, Display & Analytics state
  const [activeTab, setActiveTab] = useState<'analytics' | 'config' | 'orders'>('analytics');
  const [showSimulated, setShowSimulated] = useState(true);

  // Subscribe to payment settings document
  useEffect(() => {
    const docRef = doc(db, 'settings', 'payment_config');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.upiId) setUpiId(data.upiId);
        if (data.minRefill !== undefined) setMinRefill(data.minRefill);
        if (data.enableUpi !== undefined) setEnableUpi(data.enableUpi);
        if (data.enableCard !== undefined) setEnableCard(data.enableCard);
        if (data.enableNetBanking !== undefined) setEnableNetBanking(data.enableNetBanking);
        if (data.successRate) setSuccessRate(data.successRate);
        if (data.instructionCaption) setInstructionCaption(data.instructionCaption);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load all platform orders in real-time
  useEffect(() => {
    const q = query(collection(db, 'orders'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      // Sort by createdAt descending locally to prevent Firebase index requirement
      ordersData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      setOrders(ordersData);
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'payment_config');
      await setDoc(docRef, {
        upiId,
        minRefill,
        enableUpi,
        enableCard,
        enableNetBanking,
        successRate,
        instructionCaption
      }, { merge: true });
      triggerToast('Wholesale settings & Payment Gateways successfully saved!');
    } catch (err) {
      console.error(err);
      triggerToast('Error saving payment configurations.');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'processing' | 'completed') => {
    setIsUpdating(orderId);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus
      });
      triggerToast(`Order #${orderId.substring(0, 5)} status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      triggerToast('Error updating order status.');
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'processing':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
      case 'pending':
      default:
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    }
  };

  // Process revenue trends for June 2026
  const getDailyRevenueData = () => {
    const currentYear = 2026;
    const currentMonthIdx = 5; // June (0-indexed)
    const daysInMonth = 30;

    // Generate beautiful baseline organic growth trend (₹1500 to ₹4000/day vary organically)
    const dailyData = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      // Organic visual curve: baseline starts around 1400, scales with week of the month
      let baseRevenue = 1400 + Math.sin(day * 0.4) * 500 + (day * 65);
      const noise = ((day * 17) % 5) * 100 - 200;
      baseRevenue += noise;

      // Current date mock is June 22, 2026. Set projected/future baseline to zero to be visually realistic!
      if (day > 22) {
        baseRevenue = 0;
      }

      return {
        dayStr: `Jun ${day}`,
        dayNum: day,
        simulated: Math.round(baseRevenue),
        real: 0,
        total: Math.round(baseRevenue)
      };
    });

    // Merge actual active orders from DB
    orders.forEach(order => {
      if (!order.createdAt) return;

      let orderDate: Date;
      if (order.createdAt.toDate) {
        orderDate = order.createdAt.toDate();
      } else if (order.createdAt instanceof Date) {
        orderDate = order.createdAt;
      } else {
        orderDate = new Date(order.createdAt);
      }

      const isCurrentMonth = orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonthIdx;
      if (isCurrentMonth) {
        const day = orderDate.getDate();
        if (day >= 1 && day <= daysInMonth) {
          const item = dailyData[day - 1];
          if (item) {
            item.real += order.totalPrice || 0;
            item.total += order.totalPrice || 0;
          }
        }
      }
    });

    return dailyData.map(d => ({
      ...d,
      real: Math.round(d.real),
      total: showSimulated ? Math.round(d.total) : Math.round(d.real)
    }));
  };

  const getTopService = () => {
    if (orders.length === 0) return 'Instagram Premium Followers';
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.category] = (counts[o.category] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : 'Instagram Premium Followers';
  };

  return (
    <div className="bg-[#111114] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-5">
      {/* Visual lighting backglow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" /> Admin Control Panel
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">SMM Agency Dashboard & Analytics</p>
          </div>
          <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20 tracking-wider">
            SMM ENGINE v2
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 mb-5 font-sans">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-purple-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Config</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 'orders'
                ? 'bg-purple-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Queue</span>
            {orders.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white font-mono text-[8px] font-extrabold rounded-full leading-none">
                {orders.length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* TAB 1: REVENUE TRENDS ANALYTICS */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 font-sans"
            >
              {/* KPI Cards Overlay */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl pointer-events-none" />
                  <p className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider">June Est. Revenue</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-extrabold text-white font-mono">
                      ₹{getDailyRevenueData().reduce((acc, d) => acc + d.total, 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">
                      +14.8%
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">Organic + Live Sales</p>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl pointer-events-none" />
                  <p className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Customer Live Sales</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      ₹{orders.reduce((acc, o) => acc + (o.totalPrice || 0), 0).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      ({orders.length} order{orders.length === 1 ? '' : 's'})
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">Direct sales on platform</p>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold font-mono text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Daily Revenue Trends
                    </h4>
                    <p className="text-[9px] text-slate-500 font-mono">June 2026 Sandbox Redirection Channel</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSimulated(!showSimulated)}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono transition-colors border cursor-pointer ${
                      showSimulated 
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20' 
                        : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {showSimulated ? 'Baseline: COMBINED' : 'Baseline: RAW LIVE'}
                  </button>
                </div>

                <div className="w-full h-[200px] select-none pr-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={getDailyRevenueData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis 
                        dataKey="dayStr" 
                        stroke="#475569" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => val.replace('Jun ', '')}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `₹${v}`} 
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-[#111114] border border-white/10 p-2.5 rounded-xl shadow-xl flex flex-col gap-0.5 font-mono text-[9px]">
                                <p className="font-bold text-slate-300 font-sans tracking-wide mb-1 text-[10px]">June {d.dayNum}, 2026</p>
                                <div className="space-y-0.5 border-t border-white/5 pt-1">
                                  <p className="flex justify-between gap-6 text-white font-bold">
                                    <span>Total:</span>
                                    <span className="text-purple-400 font-extrabold">₹{d.total.toLocaleString()}</span>
                                  </p>
                                  {showSimulated && (
                                    <>
                                      <p className="flex justify-between gap-6 text-slate-500">
                                        <span>Simulated Base:</span>
                                        <span>₹{d.simulated.toLocaleString()}</span>
                                      </p>
                                      <p className="flex justify-between gap-6 text-emerald-400 font-semibold">
                                        <span>Active Orders:</span>
                                        <span>+₹{d.real.toLocaleString()}</span>
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#a855f7" 
                        strokeWidth={1.5} 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> June Active Revenue Map
                  </span>
                  <span className="italic">Refreshed live on campaign placement</span>
                </div>
              </div>

              {/* Platform Hot Insights */}
              <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10 rounded-xl p-3 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> Hot SMM Product Today:
                </span>
                <span className="text-[10px] font-bold text-white max-w-[170px] truncate">{getTopService()}</span>
              </div>
            </motion.div>
          )}

          {/* TAB 2: GATEWAY CONFIGURATIONS */}
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 font-sans"
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 ml-1 font-mono">Provider API Endpoint</label>
                  <input
                    type="text"
                    value={providerUrl}
                    onChange={(e) => setProviderUrl(e.target.value)}
                    placeholder="https://api.provider.com"
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white font-mono"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 ml-1 font-mono">Protected Auth API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white font-mono"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 ml-1 font-mono">Global Markup Margin</label>
                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{globalMarkup}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="300"
                    value={globalMarkup}
                    onChange={(e) => setGlobalMarkup(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className="text-[10px] text-slate-500 leading-relaxed font-serif italic text-center">
                    Wholesale SMM costs are multiplied by this markup coefficient in client-facing forms.
                  </p>
                </div>

                {/* Payment Gateway Channels Config & Setup Options */}
                <div className="border-t border-white/5 pt-4 mt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold font-mono text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" /> Payment Setup Option
                    </h3>
                    <span className="text-[8px] uppercase font-bold text-slate-500 font-mono">Config module</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-1">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 ml-1 font-mono">SMM UPI Address</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="pay@growsocials"
                        className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 transition-colors text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 ml-1 font-mono">Min Deposit (₹)</label>
                      <input
                        type="number"
                        value={minRefill}
                        onChange={(e) => setMinRefill(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 transition-colors text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 ml-1 font-mono">Simulated Instruction caption</label>
                    <input
                      type="text"
                      value={instructionCaption}
                      onChange={(e) => setInstructionCaption(e.target.value)}
                      placeholder="Ex: Verify transactions inside SMM control panel"
                      className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 transition-colors text-white"
                    />
                  </div>

                  {/* Allowed Channels Toggles */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 ml-1 font-mono">Enabled Channels</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEnableUpi(!enableUpi)}
                        className={`py-2 rounded-xl border text-center font-bold text-[9px] transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          enableUpi ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' : 'bg-black/30 border-white/5 text-slate-500'
                        }`}
                      >
                        <span>UPI Payment</span>
                        <span className="text-[7px] font-normal leading-none font-mono">{enableUpi ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEnableCard(!enableCard)}
                        className={`py-2 rounded-xl border text-center font-bold text-[9px] transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          enableCard ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' : 'bg-black/30 border-white/5 text-slate-500'
                        }`}
                      >
                        <span>Card checkout</span>
                        <span className="text-[7px] font-normal leading-none font-mono">{enableCard ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEnableNetBanking(!enableNetBanking)}
                        className={`py-2 rounded-xl border text-center font-bold text-[9px] transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          enableNetBanking ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' : 'bg-black/30 border-white/5 text-slate-500'
                        }`}
                      >
                        <span>NetBanking</span>
                        <span className="text-[7px] font-normal leading-none font-mono">{enableNetBanking ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Success Simulator Settings */}
                  <div className="space-y-1 pt-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 ml-1 font-mono">Sandbox Success Rate</label>
                    <select
                      value={successRate}
                      onChange={(e) => setSuccessRate(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="100%">100% Constant Success Rate</option>
                      <option value="90%">90% Success / 10% Failures</option>
                      <option value="failure">Constant Transaction Failure (Simulation Testing)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveSettings} 
                className="w-full mt-1 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-purple-600/10 text-xs cursor-pointer text-center"
              >
                Save Admin Config & Sync Feed
              </button>
            </motion.div>
          )}

          {/* TAB 3: DELIVERY QUEUE SIMULATOR */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 font-sans"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-400">Order Delivery Simulator</h3>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">{orders.length} in queue</span>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-10 bg-black/25 rounded-xl border border-dashed border-white/5">
                  <p className="text-[11px] text-slate-500">No customer campaign orders submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-black/40 border border-white/5 hover:border-white/10 p-3 rounded-xl transition-all flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 truncate flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white max-w-[130px] truncate">{order.category}</span>
                          <span className={`text-[8px] font-bold font-mono uppercase px-1.5 rounded border ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate font-mono">Link: {order.link}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            disabled={isUpdating === order.id}
                            className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20 flex items-center justify-center cursor-pointer"
                            title="Mark Processing"
                          >
                            {isUpdating === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {order.status !== 'completed' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            disabled={isUpdating === order.id}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20 flex items-center justify-center cursor-pointer"
                            title="Deliver Order"
                          >
                            {isUpdating === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {order.status === 'completed' && (
                          <span className="text-[9px] text-emerald-400/60 font-mono uppercase bg-emerald-500/5 px-1.5 py-0.5 rounded">
                            Delivered
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
