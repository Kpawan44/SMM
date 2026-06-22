import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Order } from '../types';

export const OrderHistory = ({ user }: { user: any }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Filter by userId only - avoids index requirement!
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      // Sort by createdAt descending in-memory to safely present latest orders first
      ordersData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusStyle = (status: 'pending' | 'processing' | 'completed') => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          label: 'Completed'
        };
      case 'processing':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 animate-pulse',
          dot: 'bg-indigo-400',
          label: 'Processing'
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse',
          dot: 'bg-amber-400',
          label: 'Pending'
        };
    }
  };

  return (
    <div className="bg-[#111114] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Your Orders</h2>
          <p className="text-xs text-slate-500">Live order status track feed</p>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-[#09090b] border border-white/10 text-slate-400">
          {orders.length} Total
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 bg-[#09090b]/40 rounded-xl border border-dashed border-white/5">
          <p className="text-slate-500 text-sm">No historical orders active.</p>
          <p className="text-slate-600 text-[11px] mt-1">Place your first campaign above to see live tracing.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {orders.map(order => {
            const statusConfig = getStatusStyle(order.status || 'pending');
            const readableDate = order.createdAt?.toDate 
              ? order.createdAt.toDate().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
              : 'Syncing...';

            return (
              <div key={order.id} className="bg-[#09090b] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{order.category}</span>
                    <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-slate-400">
                      Qty: {order.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono text-[10px] text-slate-600 truncate max-w-[100px]" title={order.id}>
                      #{order.id.slice(0, 8)}...
                    </span>
                    <span>•</span>
                    <button 
                      onClick={() => handleCopyLink(order.link, order.id)}
                      className="hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="truncate max-w-[130px]">{order.link}</span>
                      <span className="text-[9px] text-blue-500/80">
                        {copiedId === order.id ? '[Copied]' : '[Copy]'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                  <span className="text-sm font-bold text-white font-mono">
                    ₹{(order.totalPrice || 0).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600 font-mono hidden sm:inline">{readableDate}</span>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${statusConfig.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

