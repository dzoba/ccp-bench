import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ErrorBar,
  CartesianGrid,
} from 'recharts';
export default function Chart({
  rows,
  title,
}: {
  rows: { name: string; value: number; se: number | null }[];
  title: string;
}) {
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div aria-hidden="true" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 28, top: 15, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              label={{ value: title, position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Bar dataKey="value" fill="var(--accent)" radius={[0, 3, 3, 0]}>
              <ErrorBar dataKey="se" direction="x" width={6} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {rows.map((r) => (
          <li key={r.name}>
            {r.name}: {r.value.toFixed(2)}, standard error{' '}
            {r.se === null ? 'unavailable' : r.se.toFixed(2)}
          </li>
        ))}
      </ul>
      <p className="caption">
        Bars show means. Whiskers show one standard error where available.
      </p>
    </figure>
  );
}
