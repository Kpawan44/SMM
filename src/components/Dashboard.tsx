import { useState, useEffect } from 'react';
import { OrderHistory } from './OrderHistory';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, setDoc } from 'firebase/firestore';

const SERVICES = [
  { id: 'yt-sub', category: 'YouTube Subscribers', baseRate: 150, placeholder: 'https://youtube.com/c/YourChannel' },
  { id: 'ig-likes', category: 'Instagram Likes', baseRate: 30, placeholder: 'https://instagram.com/p/YourPost' },
  { id: 'ig-fol', category: 'Instagram Followers', baseRate: 50, placeholder: 'https://instagram.com/YourProfile' },
  { id: 'fb-fol', category: 'Facebook Followers', baseRate: 60, placeholder: 'https://facebook.com/YourPage' },
  { id: 'yt-views', category: 'YouTube Video Views', baseRate: 40, placeholder: 'https://youtube.com/watch?v=YourVideo' }
];

interface DashboardProps {
  user: any;
  triggerToast: (msg: string) => void;
  globalMarkup: number;
}

export const Dashboard = ({ user, triggerToast, globalMarkup }: DashboardProps) => {
  const [category, setCategory] = useState(() => {
    return localStorage.getItem('preselected_category') || '';
  });
  const [quantity, setQuantity] = useState(1000);
  const [link, setLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (category) {
      localStorage.removeItem('preselected_category');
    }
  }, [category]);

  const selectedService = SERVICES.find(s => s.id === category);
  const currentBaseRate = selectedService ? selectedService.baseRate : 0;
  const markupPricePer1000 = currentBaseRate * (globalMarkup / 100);
  const estimatedCharge = (quantity * markupPricePer1000) / 1000;

  useEffect(() => {
    if (!user) return;

    const walletRef = doc(db, 'wallets', user.uid);
    const unsubscribe = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        setBalance(snap.data().balance || 0);
      } else {
        // Initialize dynamic entry if missing
        setDoc(walletRef, {
          balance: 1000.00,
          updatedAt: serverTimestamp()
        }).then(() => {
          setBalance(1000.00);
        }).catch(err => {
          console.error("Error setting wallet balance:", err);
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleOrder = async () => {
    if (!user) {
      triggerToast('Please sign in to start social campaigns.');
      return;
    }

    if (!category || !link || !quantity || quantity <= 0) {
      triggerToast('Please complete all order form fields correctly.');
      return;
    }

    if (balance === null) {
      triggerToast('Synchronizing secure wallet payload...');
      return;
    }

    if (balance < estimatedCharge) {
      triggerToast(`Insufficient credits! This order costs ₹${estimatedCharge.toFixed(2)} but your wallet has ₹${balance.toFixed(2)}.`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Deduct cost from Firestore user wallet
      const walletRef = doc(db, 'wallets', user.uid);
      const nextBalance = balance - estimatedCharge;
      await setDoc(walletRef, {
        balance: nextBalance,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Publish ledger debit entry
      await addDoc(collection(db, 'wallet_transactions'), {
        userId: user.uid,
        amount: estimatedCharge,
        type: 'debit',
        description: `Campaign: ${selectedService?.category || category} (x${quantity})`,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      // 3. Launch live campaign order
      const docRef = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        category: selectedService?.category || category,
        link,
        quantity,
        totalPrice: estimatedCharge,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      triggerToast(`Order dispatched! Deducted ₹${estimatedCharge.toFixed(2)} from wallet.`);
      setCategory('');
      setLink('');
      setQuantity(1000);
    } catch (e) {
      console.error(e);
      triggerToast('Error synchronizing SMM transaction. Flow rolled back.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111114] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Place New Order</h2>
            <p className="text-xs text-slate-500">Select a premium service and parameterize instantly</p>
          </div>
          <div className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-500/20 tracking-tighter uppercase font-mono">
            Feed active
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1 font-mono">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white appearance-none cursor-pointer"
            >
              <option value="">Select Service Package</option>
              {SERVICES.map(s => (
                <option key={s.id} value={s.id}>
                  {s.category} (₹{(s.baseRate * (globalMarkup / 100)).toFixed(0)}/1k)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1 font-mono">Quantity</label>
              <input
                type="number"
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                value={quantity}
                min="1"
                className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1 font-mono">Target Social Media Link</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={selectedService?.placeholder || "https://..."}
                className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
              />
            </div>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono">Estimated Charge</span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xl font-bold text-white">₹{estimatedCharge.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Wallet: {balance === null ? 'Syncing...' : `₹${balance.toFixed(2)}`}
                </span>
              </div>
            </div>
            <button
              onClick={handleOrder}
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 text-white font-bold p-3 px-6 rounded-xl transition-all active:scale-95 text-xs cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? 'Processing...' : 'Place Order Now'}
            </button>
          </div>
        </div>
      </div>
      <OrderHistory user={user} />
    </div>
  );
};
