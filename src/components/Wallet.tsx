import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Plus, CreditCard, Landmark, Check, AlertCircle, Sparkles, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  createdAt: any;
  status: 'completed' | 'failed';
}

interface WalletProps {
  user: any;
  triggerToast: (msg: string) => void;
}

export const WalletSection = ({ user, triggerToast }: WalletProps) => {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Real-time Payment Setup Settings populated from Firestore
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: 'gs-pay-sandbox@ybl',
    minRefill: 200,
    enableUpi: true,
    enableCard: true,
    enableNetBanking: true,
    successRate: '100%',
    instructionCaption: 'Verify transactions securely inside SMM control panel.'
  });

  // Checkout Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('500');
  const [paymentStep, setPaymentStep] = useState<'method' | 'simulating' | 'success' | 'failure'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    if (!user) return;

    // 1. Sub to Wallet document to get active balance
    const walletRef = doc(db, 'wallets', user.uid);
    const unsubWallet = onSnapshot(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setBalance(snapshot.data().balance || 0);
      } else {
        // Initialize doc on first load if it doesn't exist
        setDoc(walletRef, {
          balance: 1000.00, // Seed user with starting ₹1000 sandbox budget
          updatedAt: serverTimestamp()
        }).then(() => {
          setBalance(1000.00);
          triggerToast("Initialized new secure SMM wallet with test budget of ₹1000!");
        }).catch(err => {
          console.error("Error creating wallet doc:", err);
        });
      }
      setIsLoading(false);
    });

    // 2. Sub to Transactions associated with this user
    const q = query(
      collection(db, 'wallet_transactions'),
      where('userId', '==', user.uid)
    );

    const unsubTransactions = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];

      // Sort in-memory to bypass composite index creation requirement
      txs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      setTransactions(txs);
    });

    // 3. Sub to Payment Setup Options set by admin in global settings
    const paymentConfigRef = doc(db, 'settings', 'payment_config');
    const unsubPaymentConfig = onSnapshot(paymentConfigRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPaymentConfig({
          upiId: data.upiId || 'gs-pay-sandbox@ybl',
          minRefill: data.minRefill !== undefined ? data.minRefill : 200,
          enableUpi: data.enableUpi !== undefined ? data.enableUpi : true,
          enableCard: data.enableCard !== undefined ? data.enableCard : true,
          enableNetBanking: data.enableNetBanking !== undefined ? data.enableNetBanking : true,
          successRate: data.successRate || '100%',
          instructionCaption: data.instructionCaption || 'Verify transactions securely inside SMM control panel.'
        });
      }
    });

    return () => {
      unsubWallet();
      unsubTransactions();
      unsubPaymentConfig();
    };
  }, [user]);

  const handleQuickSelect = (amt: string) => {
    setAmountInput(amt);
  };

  const startTopUpFlow = () => {
    const parsed = Number(amountInput);
    if (isNaN(parsed) || parsed <= 0) {
      triggerToast("Please provide a valid top-up amount.");
      return;
    }

    // Check custom administrative minimum deposit constraint
    if (parsed < paymentConfig.minRefill) {
      triggerToast(`Refill rejected. Minimum payment setup limit is ₹${paymentConfig.minRefill}.`);
      return;
    }

    // Auto-select first available active payment channel if current one is inactive
    let nextAvailable: 'upi' | 'card' | 'netbanking' | null = null;
    if (paymentConfig.enableUpi) nextAvailable = 'upi';
    else if (paymentConfig.enableCard) nextAvailable = 'card';
    else if (paymentConfig.enableNetBanking) nextAvailable = 'netbanking';

    if (!nextAvailable) {
      triggerToast("Topup channels currently offline. SMM is in administrative maintenance mode.");
      return;
    }

    if (selectedMethod === 'upi' && !paymentConfig.enableUpi) setSelectedMethod(nextAvailable);
    else if (selectedMethod === 'card' && !paymentConfig.enableCard) setSelectedMethod(nextAvailable);
    else if (selectedMethod === 'netbanking' && !paymentConfig.enableNetBanking) setSelectedMethod(nextAvailable);

    setPaymentStep('method');
    setIsModalOpen(true);
  };

  const handleSimulatedPayment = async () => {
    setPaymentStep('simulating');
    
    // Simulate process delay for cinematic experience
    setTimeout(async () => {
      if (!user) return;
      const topUpAmount = Number(amountInput);

      // Determine simulated success based on successRate setup configured by Admin
      let isSuccessful = true;
      if (paymentConfig.successRate === 'failure') {
        isSuccessful = false;
      } else if (paymentConfig.successRate === '90%' || paymentConfig.successRate === '90%') {
        isSuccessful = Math.random() >= 0.1;
      }

      if (isSuccessful) {
        try {
          // Update Firestore wallet balance
          const walletRef = doc(db, 'wallets', user.uid);
          const nextBalance = balance + topUpAmount;
          
          await setDoc(walletRef, {
            balance: nextBalance,
            updatedAt: serverTimestamp()
          }, { merge: true });

          // Record the transactions feed entry
          await addDoc(collection(db, 'wallet_transactions'), {
            userId: user.uid,
            amount: topUpAmount,
            type: 'credit',
            description: `Topped up via simulated ${selectedMethod.toUpperCase()}`,
            status: 'completed',
            createdAt: serverTimestamp()
          });

          setPaymentStep('success');
          triggerToast(`Successfully credited ₹${topUpAmount.toFixed(2)} to secure account balance!`);
        } catch (err) {
          console.error("Topup execution error:", err);
          triggerToast("Simulation failure during Firestore state sync.");
          setPaymentStep('method');
        }
      } else {
        // Record failed transaction in database for transaction security audit
        try {
          await addDoc(collection(db, 'wallet_transactions'), {
            userId: user.uid,
            amount: topUpAmount,
            type: 'credit',
            description: `Refill failed via simulated ${selectedMethod.toUpperCase()}`,
            status: 'failed',
            createdAt: serverTimestamp()
          });

          setErrorMessage("Declined by gateway terminal rule. Please use UPI/Card config or contact administrator.");
          setPaymentStep('failure');
          triggerToast(`Transaction of ₹${topUpAmount.toFixed(2)} transaction failure simulated.`);
        } catch (er) {
          console.error(er);
          setPaymentStep('method');
        }
      }
    }, 1800);
  };

  return (
    <div className="bg-[#111114] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
      {/* Visual lighting backglow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" /> Secure Wallet
          </h2>
          <p className="text-xs text-slate-500">Fund campaigns, lock transactions, auto-deduct</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-wider font-mono">
          PCI Shield Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Balance Showcase */}
        <div className="md:col-span-12 flex flex-col sm:flex-row gap-4 items-stretch">
          <div className="flex-1 bg-gradient-to-tr from-emerald-950/20 via-emerald-900/10 to-[#111114] border border-emerald-500/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-20 text-emerald-400 text-[10px] font-mono">
              <Sparkles className="w-3.5 h-3.5" /> sandbox
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Available SMM Credits</p>
              <h3 className="text-3xl font-extrabold text-white mt-1 select-all">
                {isLoading ? (
                  <span className="flex items-center gap-2 text-slate-500 text-lg font-normal">
                    <Loader2 className="w-4 h-4 animate-spin" /> Synchronizing...
                  </span>
                ) : (
                  `₹${balance.toFixed(2)}`
                )}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-3">Link associated: {user?.email}</p>
          </div>

          {/* Quick Fund Container */}
          <div className="bg-[#09090b] border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-3 sm:w-80">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 font-mono">Top-up Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(Math.max(1, Number(e.target.value)).toString())}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white font-mono"
                  placeholder="500"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {['200', '500', '1000', '2500'].map(amt => (
                <button
                  key={amt}
                  onClick={() => handleQuickSelect(amt)}
                  type="button"
                  className={`py-1 rounded text-[10px] font-bold transition-all border ${
                    amountInput === amt
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>

            <button
              onClick={startTopUpFlow}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Instant Credits Refill
            </button>
          </div>
        </div>

        {/* Transaction History Feed */}
        <div className="md:col-span-12 border-t border-white/5 pt-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 ml-1 font-mono tracking-wider">Simulated Inflow & Outflow Receipts</h4>
          {transactions.length === 0 ? (
            <div className="text-center py-6 bg-[#09090b]/20 rounded-xl border border-dashed border-white/5">
              <p className="text-slate-500 text-xs">No transactions recorded yet in this account session.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {transactions.map(tx => {
                const txDate = tx.createdAt?.toDate 
                  ? tx.createdAt.toDate().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                  : 'Pending db sync...';
                return (
                  <div key={tx.id} className="bg-black/35 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {tx.type === 'credit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{tx.description}</p>
                        <p className="text-[10px] text-slate-500 font-mono leading-relaxed">{txDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                      </p>
                      <span className="text-[9px] text-slate-500 font-mono tracking-tighter">verified response</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Simulated Interactive Payment Gateway Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111114] border border-white/10 rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl relative"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-950 to-[#111114] border-b border-white/5 p-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Sandbox payment</h3>
                    <p className="text-[10px] text-emerald-400 font-mono">Simulating ₹{Number(amountInput).toFixed(2)} checkout</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {paymentStep === 'method' && (
                  <>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This is a real-time SMM database micro-ledger simulation. Choose a simulated carrier below to finalize.
                    </p>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => paymentConfig.enableUpi && setSelectedMethod('upi')}
                        disabled={!paymentConfig.enableUpi}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                          !paymentConfig.enableUpi
                            ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5 text-slate-500'
                            : selectedMethod === 'upi'
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                              : 'bg-[#09090b] border-white/5 text-slate-400 hover:bg-[#09090b]/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold font-mono tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-300">UPI</div>
                          <span className="text-xs font-bold text-white">Instant UPI Link</span>
                        </div>
                        {paymentConfig.enableUpi ? (
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'upi' ? 'border-emerald-500' : 'border-white/20'}`}>
                            {selectedMethod === 'upi' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </div>
                        ) : (
                          <span className="text-[8px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">offline</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => paymentConfig.enableCard && setSelectedMethod('card')}
                        disabled={!paymentConfig.enableCard}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                          !paymentConfig.enableCard
                            ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5 text-slate-500'
                            : selectedMethod === 'card'
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                              : 'bg-[#09090b] border-white/5 text-slate-400 hover:bg-[#09090b]/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-white">Mock Visa / Mastercard</span>
                        </div>
                        {paymentConfig.enableCard ? (
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'card' ? 'border-emerald-500' : 'border-white/20'}`}>
                            {selectedMethod === 'card' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </div>
                        ) : (
                          <span className="text-[8px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">offline</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => paymentConfig.enableNetBanking && setSelectedMethod('netbanking')}
                        disabled={!paymentConfig.enableNetBanking}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                          !paymentConfig.enableNetBanking
                            ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5 text-slate-500'
                            : selectedMethod === 'netbanking'
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                              : 'bg-[#09090b] border-white/5 text-slate-400 hover:bg-[#09090b]/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-white">Mock Indian NetBanking</span>
                        </div>
                        {paymentConfig.enableNetBanking ? (
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'netbanking' ? 'border-emerald-500' : 'border-white/20'}`}>
                            {selectedMethod === 'netbanking' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </div>
                        ) : (
                          <span className="text-[8px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">offline</span>
                        )}
                      </button>
                    </div>

                    {selectedMethod === 'card' && paymentConfig.enableCard && (
                      <div className="bg-[#09090b] border border-white/10 rounded-xl p-3 space-y-3">
                        <div className="space-y-0.5">
                          <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 font-mono">16-Digit Card Number</label>
                          <input
                            type="text"
                            placeholder="4111 2222 3333 4444"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 font-mono">Expiry Date</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 text-center"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 font-mono">CVV Secure Key</label>
                            <input
                              type="password"
                              placeholder="•••"
                              maxLength={3}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedMethod === 'upi' && paymentConfig.enableUpi && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 text-center space-y-2.5">
                        <div className="mx-auto w-24 h-24 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center text-[10px] text-slate-400 relative">
                          <div className="absolute inset-2 border-2 border-emerald-500/40 border-dashed rounded flex flex-col justify-center items-center font-mono">
                            <span className="text-[8px] uppercase tracking-tighter text-emerald-400 font-bold mb-0.5">UPI GATEWAY</span>
                            <span className="font-extrabold text-white text-[9px] truncate max-w-[65px]">{paymentConfig.upiId}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-emerald-300 font-bold font-mono uppercase tracking-wider">{paymentConfig.upiId}</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-sans italic max-w-[240px] mx-auto">
                            {paymentConfig.instructionCaption}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedMethod === 'netbanking' && paymentConfig.enableNetBanking && (
                      <div className="bg-[#09090b] border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          Settle securely using Sandbox credentials at checkout redirection.
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">Verified: Indian NetBanking Interface</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Cancel Transaction
                      </button>
                      <button
                        onClick={handleSimulatedPayment}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Authorize & Pay
                      </button>
                    </div>
                  </>
                )}

                {paymentStep === 'simulating' && (
                  <div className="py-8 text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">Contacting sandbox provider node...</p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">Simulating multi-node ledger check</p>
                    </div>
                  </div>
                )}

                {paymentStep === 'success' && (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                      <Check className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Receipt Confirmed!</h4>
                      <p className="text-xs text-slate-400 mt-1">₹{Number(amountInput).toFixed(2)} credits transferred safely to user wallet.</p>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      Acknowledge Receipt
                    </button>
                  </div>
                )}

                {paymentStep === 'failure' && (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Transaction Declined!</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">{errorMessage}</p>
                    </div>
                    <button
                      onClick={() => setPaymentStep('method')}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-red-500/20"
                    >
                      Choose Another Channel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
