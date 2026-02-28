import React from 'react';

export const GraphicDesignKanjiNav: React.FC = () => {
  const goHome = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('app:navigate'));
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[100] hidden sm:block">
      <button
        onClick={goHome}
        className="relative group block w-12 h-12 rounded-full border-2 bg-purple-500/20 border-purple-400 shadow-md shadow-purple-500/20 hover:bg-purple-500/30 transition-colors duration-150"
        aria-label="Back to home page"
        type="button"
      >
        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-purple-300 group-hover:text-white transition-colors duration-150">
          家
        </div>

        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          <div className="bg-black/90 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
            Home
          </div>
          <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-black/90 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
        </div>
      </button>
    </div>
  );
};
