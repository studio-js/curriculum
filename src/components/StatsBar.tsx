interface StatItem {
  label: string;
  value: string | number;
  sub?: string;
}

interface Props {
  stats: StatItem[];
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
          <p className="text-xl font-semibold text-gray-900 tabular-nums">{stat.value}</p>
          {stat.sub && <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>}
        </div>
      ))}
    </div>
  );
}
