import React from 'react';

const StatCard = ({ icon: Icon, label, value, color }) => {
  return (
    <div className="bg-white border border-line rounded-rt p-4 flex items-center gap-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0`} style={{ background: color }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xl font-extrabold font-serif">{value}</div>
        <div className="text-xs text-ink-soft font-semibold">{label}</div>
      </div>
    </div>
  );
};

export default StatCard;