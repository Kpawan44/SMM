export const FAQSection = () => (
  <section className="py-20 bg-gray-950 text-white">
    <div className="container mx-auto px-6">
      <h2 className="text-3xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-gray-900 p-6 rounded-xl">
          <h3 className="font-bold text-lg mb-2">How fast do orders start?</h3>
          <p className="text-gray-400">Most services start within minutes of order placement.</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-xl">
          <h3 className="font-bold text-lg mb-2">Are these services safe?</h3>
          <p className="text-gray-400">Yes, we focus on high-quality delivery that maintains security.</p>
        </div>
      </div>
    </div>
  </section>
);
