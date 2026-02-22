import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { hourlyRevenueData } from "@/data/mock-data";

export default function RevenueChart() {
  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={hourlyRevenueData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(218 30% 22%)" />
          <XAxis dataKey="hour" stroke="hsl(215 20% 55%)" fontSize={12} />
          <YAxis stroke="hsl(215 20% 55%)" fontSize={12} tickFormatter={(v) => `${(v / 1000)}k`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(218 50% 13%)",
              border: "1px solid hsl(218 30% 22%)",
              borderRadius: "8px",
              color: "hsl(210 40% 93%)",
            }}
            formatter={(value: number) => [`₩${value.toLocaleString()}`, "매출"]}
          />
          <Bar dataKey="revenue" fill="hsl(191 100% 50%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
