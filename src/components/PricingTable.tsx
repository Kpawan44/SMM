interface PricingTableProps {
  onBuy?: (serviceId: string) => void;
}

export const PricingTable = ({ onBuy }: PricingTableProps) => (
  <section className="py-20 bg-gray-950 text-white border-t border-gray-800">
    <h2 className="text-3xl font-bold mb-10 text-center">Service Packages</h2>
    <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
        <h3 className="font-bold text-xl mb-4">YouTube Subscribers</h3>
        <p className="text-gray-400 mb-6 font-mono">Starts at ₹150/1k</p>
        <button 
          onClick={() => onBuy?.('yt-sub')}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 px-6 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-blue-600/30"
        >
          Buy Now
        </button>
      </div>
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
        <h3 className="font-bold text-xl mb-4">Instagram Followers</h3>
        <p className="text-gray-400 mb-6 font-mono">Starts at ₹50/1k</p>
        <button 
          onClick={() => onBuy?.('ig-fol')}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 px-6 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-blue-600/30"
        >
          Buy Now
        </button>
      </div>
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
        <h3 className="font-bold text-xl mb-4">Facebook Followers</h3>
        <p className="text-gray-400 mb-6 font-mono">Starts at ₹60/1k</p>
        <button 
          onClick={() => onBuy?.('fb-fol')}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 px-6 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-blue-600/30"
        >
          Buy Now
        </button>
      </div>
    </div>
  </section>
);

