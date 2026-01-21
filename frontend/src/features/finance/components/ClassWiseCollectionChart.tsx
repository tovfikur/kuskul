import { Box } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "../financeUtils";

export function ClassWiseCollectionChart(props: {
  data: Array<{ name: string; collected: number }>;
}) {
  const { data } = props;
  return (
    <Box sx={{ mt: 2, height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: unknown) => formatMoney(Number(v ?? 0))} />
          <Bar dataKey="collected" fill="#1976d2" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

