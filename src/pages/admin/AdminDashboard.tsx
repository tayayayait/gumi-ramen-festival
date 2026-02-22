import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { usePickupOrders } from "@/hooks/usePickupOrders";
import { TrendingUp, Coins, ShoppingBag, Crown } from "lucide-react";
import { useMemo } from "react";

export default function AdminDashboard() {
  const { orders } = usePickupOrders({ isAdmin: true });

  // 오늘 날짜 기준 주문 필터링
  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter(o => new Date(o.createdAt).toDateString() === today);
  }, [orders]);

  // 동적 통계 계산
  const stats = useMemo(() => {
    const totalSales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = todayOrders.length;
    const avgValue = orderCount > 0 ? Math.floor(totalSales / orderCount) : 0;

    // 인기 메뉴 계산 (가장 많이 주문된 메뉴)
    const menuCounts: Record<string, number> = {};
    todayOrders.forEach(o => {
      o.items.forEach(item => {
        menuCounts[item.name] = (menuCounts[item.name] || 0) + item.quantity;
      });
    });
    const popularMenu = Object.entries(menuCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "주문 없음";

    return { totalSales, orderCount, avgValue, popularMenu };
  }, [todayOrders]);

  // 시간대별 매출 (동적) - 9시부터 현재 시간까지 연속성 보장
  const hourlyData = useMemo(() => {
    const hourMap: Record<number, { revenue: number; orders: number }> = {};
    todayOrders.forEach(o => {
      const hour = new Date(o.createdAt).getHours();
      if (!hourMap[hour]) hourMap[hour] = { revenue: 0, orders: 0 };
      hourMap[hour].revenue += o.totalAmount;
      hourMap[hour].orders += 1;
    });
    
    const currentHour = new Date().getHours();
    const startHour = 9;
    const endHour = Math.max(currentHour, 15); // 최소 15시까지는 Y축 가시성을 위해 표시

    const filledData = [];
    for (let i = startHour; i <= endHour; i++) {
      filledData.push({
        hour: `${i}시`,
        revenue: hourMap[i]?.revenue || 0,
        orders: hourMap[i]?.orders || 0,
      });
    }

    return filledData;
  }, [todayOrders]);

  // 메뉴 제품 판매 Best 5 (판매 수량 기준, 모든 카테고리 포함)
  const topMenuData = useMemo(() => {
    const menuCountMap: Record<string, number> = {};
    todayOrders.forEach(o => {
      o.items.forEach(item => {
        // 모든 메뉴 아이템 카운트 누적
        menuCountMap[item.name] = (menuCountMap[item.name] || 0) + item.quantity;
      });
    });

    // 판매 수량 기준 내림차순 정렬 후 상위 5개 추출
    const sortedMenus = Object.entries(menuCountMap)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5);

    const colors = ["hsl(191 100% 50%)", "hsl(18 100% 59%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(270 70% 60%)"];
    
    return sortedMenus.map(([name, count], idx) => ({
      name,
      value: count,
      fill: colors[idx % colors.length],
    }));
  }, [todayOrders]);
  return (
    <div className="space-y-6 animate-in fade-in pb-20 sm:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">오늘의 실시간 판매 현황을 확인하세요.</p>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">오늘 매출</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
               <div className="text-2xl md:text-3xl font-black text-foreground">{stats.totalSales.toLocaleString()}원</div>
              <p className="text-xs text-success flex items-center font-bold mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />+20.1% 어제 대비
              </p>
           </CardContent>
        </Card>
        
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">주문 건수</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
               <div className="text-2xl md:text-3xl font-black text-foreground">{stats.orderCount}</div>
              <p className="text-xs text-success flex items-center font-bold mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />+12% 어제 대비
              </p>
           </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">평균 주문단가</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
               <div className="text-2xl md:text-3xl font-black text-foreground">{stats.avgValue.toLocaleString()}원</div>
              <p className="text-xs text-muted-foreground mt-1">
                고객 당 평균 소비
              </p>
           </CardContent>
        </Card>

        <Card className="border-transparent shadow-sm bg-accent-blue/5 hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-accent-blue">인기 메뉴</CardTitle>
              <Crown className="h-4 w-4 text-accent-blue" />
           </CardHeader>
           <CardContent>
               <div className="text-xl md:text-2xl font-black text-foreground break-keep leading-tight">{stats.popularMenu}</div>
               <Badge className="mt-2 text-[10px] bg-accent-blue hover:bg-accent-neon rounded-full">오늘의 BEST</Badge>
           </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시간대별 매출 추이 */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">시간대별 매출 추이</CardTitle>
            <CardDescription>오늘 오전 9시 이후 실시간 매출액</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(value) => `${value / 1000}k`} dx={-10} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toLocaleString()}원`, '매출액']}
                  />
                  {/* Sky Blue Theme Color */}
                  <Line type="monotone" dataKey="revenue" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, stroke: '#0EA5E9' }} activeDot={{ r: 6, stroke: '#0EA5E9', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 인기 메뉴 제품 판매 Best 5 */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">인기 메뉴 제품 판매 Best 5</CardTitle>
            <CardDescription>오늘 가장 많이 판매된 전체 메뉴 순위</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMenuData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(value) => `${value}개`} dx={-10} width={40} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value: number) => [`${value.toLocaleString()}개`, '주문 수량']}
                  />
                  {/* Dynamic Theme Color */}
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {topMenuData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
