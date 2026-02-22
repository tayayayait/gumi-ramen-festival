import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import { categoryRevenueData } from "@/data/mock-data";

export default function CategoryChart() {
  return (
    <>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryRevenueData}
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {categoryRevenueData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(218 50% 13%)",
                border: "1px solid hsl(218 30% 22%)",
                borderRadius: "8px",
                color: "hsl(210 40% 93%)",
              }}
              formatter={(value: number) => [`₩${value.toLocaleString()}`, "매출"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {categoryRevenueData.map((c) => (
          <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.fill }} />
            {c.name}
          </div>
        ))}
      </div>
    </>
  );
}
