import React from 'react';
import SpotlightCard from '../reactbits/SpotlightCard';
import CountUp from '../reactbits/CountUp';

export default function MetricCard({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  icon: Icon,
  subtitle,
  trend,
  trendPositive = true,
  glowColor = 'rgba(99, 102, 241, 0.15)',
  borderColor = 'rgba(255, 255, 255, 0.08)',
  accentColor = 'text-indigo-400',
  onClick,
}) {
  return (
    <SpotlightCard
      spotlightColor={glowColor}
      borderColor={borderColor}
      onClick={onClick}
      className={`glass-card p-5 cursor-pointer hover:border-slate-700/80 transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide uppercase text-slate-400 group-hover:text-slate-300 transition-colors">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              <CountUp to={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            </h3>
            {trend && (
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  trendPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {trend}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-slate-900/60 border border-slate-800 ${accentColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
