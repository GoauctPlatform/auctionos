import React from 'react';
import { Gavel, ShieldAlert, FileText } from 'lucide-react';

interface Props {
    type: 'metrics_deed' | 'metrics_foreclosure' | 'metrics_lien';
    count: number;
}

export const StatCounterWidget: React.FC<Props> = ({ type, count }) => {
    let icon, title, subtitle, colorClass, bgClass;

    switch (type) {
        case 'metrics_deed':
            icon = <Gavel size={10} />;
            title = 'Tax Deeds';
            subtitle = 'Active Deeds Mapped';
            colorClass = 'text-purple-500';
            bgClass = 'bg-purple-500/5';
            break;
        case 'metrics_foreclosure':
            icon = <ShieldAlert size={10} />;
            title = 'Foreclosures';
            subtitle = 'Distressed Property';
            colorClass = 'text-red-500';
            bgClass = 'bg-red-500/5';
            break;
        case 'metrics_lien':
            icon = <FileText size={10} />;
            title = 'Tax Liens';
            subtitle = 'Lien Certificates';
            colorClass = 'text-amber-500';
            bgClass = 'bg-amber-500/5';
            break;
    }

    return (
        <div className="neu-card p-3 flex flex-col justify-between relative overflow-hidden h-full">
            <div className={`absolute right-2 top-2 size-12 rounded-full ${bgClass}`} />
            <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${colorClass}`}>
                {icon} {title}
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {count.toLocaleString()}
            </p>
            <div className="flex items-center justify-between mt-1 shrink-0">
                <span className="text-[7px] text-slate-400 uppercase font-semibold">{subtitle}</span>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
        </div>
    );
};
