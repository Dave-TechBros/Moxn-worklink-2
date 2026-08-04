import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 220, color = '#6366f1' }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-bold text-slate-600">{d.value}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{
              height: `${Math.max(2, Math.round((d.value / max) * (height - 40)))}px`,
              backgroundColor: color
            }}
          />
          <span className="text-[10px] font-semibold text-slate-400 truncate w-full text-center">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
};

interface LineChartProps {
  series: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export const LineChart: React.FC<LineChartProps> = ({ series, height = 220, color = '#10b981' }) => {
  const width = 100;
  const max = Math.max(1, ...series.map((s) => s.value));
  const pts = series.map((s, i) => {
    const x = (i / Math.max(1, series.length - 1)) * width;
    const y = height - 28 - (s.value / max) * (height - 56);
    return { x, y, ...s };
  });
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} role="img">
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1="0"
            x2={width}
            y1={height - 28 - t * (height - 56)}
            y2={height - 28 - t * (height - 56)}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {pts.length > 1 && (
          <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {pts.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between px-0.5 mt-1">
        {pts.map((p) => (
          <span key={p.label} className="text-[10px] font-semibold text-slate-400">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
};

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="w-36 h-36 shrink-0">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        {data.map((d) => {
          const frac = d.value / total;
          const dash = frac * circ;
          const seg = (
            <circle
              key={d.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += dash;
          return seg;
        })}
        <text x="60" y="57" textAnchor="middle" className="fill-slate-900 font-bold text-xl">
          {total}
        </text>
        <text x="60" y="72" textAnchor="middle" className="fill-slate-400 font-medium text-[9px]">
          total
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="font-semibold text-slate-700">{d.label}</span>
            <span className="text-slate-400 font-medium ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; message?: string }> = ({ title, message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <p className="text-sm font-bold text-slate-500">{title}</p>
    {message && <p className="text-xs text-slate-400 mt-1">{message}</p>}
  </div>
);