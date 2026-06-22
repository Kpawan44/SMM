interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection = ({ onGetStarted }: HeroSectionProps) => (
  <section className="py-24 bg-gray-950 text-white flex flex-col items-center">
    <h1 className="text-6xl font-bold mb-6 text-center">Scale Your Social Presence Instantly</h1>
    <p className="text-xl text-gray-400 mb-10 text-center max-w-2xl">GrowSocials provides premium quality social media marketing services to boost your engagement efficiently.</p>
    <button 
      onClick={onGetStarted}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-10 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/30 font-sans cursor-pointer"
    >
      Get Started
    </button>
  </section>
);

