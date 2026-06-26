// src/components/MobileGrid.jsx - Mobile-first grid wrapper
export const MobileGrid = ({ children, className = '' }) => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 ${className}`}>
        {children}
    </div>
);

export const MobileCard = ({ children, className = '' }) => (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6 hover:border-primary-500/30 transition ${className}`}>
        {children}
    </div>
);
