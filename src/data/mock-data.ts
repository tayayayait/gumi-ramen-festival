// 목업 데이터

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  stock: number;
  isAvailable: boolean;
  spiceLevel: number;
  tags: string[];
  isSoldOut?: boolean;
}
export interface Shop {
  id: string;
  name: string;
  description: string;
  location: string;
  current_wait_count: number;
}

export const mockShops: Shop[] = [
  { id: "shop_1", name: "구미 매운 라면 본점", description: "눈물나게 매운 원조 가게", location: "A구역 1번", current_wait_count: 5 },
  { id: "shop_2", name: "해물 베이스 포차", description: "시원한 해물이 가득", location: "A구역 2번", current_wait_count: 36 },
  { id: "shop_3", name: "치즈폭탄 팩토리", description: "부드러운 치즈가 듬뿍", location: "B구역 1번", current_wait_count: 68 },
  { id: "shop_4", name: "이색 볶음면 랩", description: "특제 소스로 볶은 별미", location: "B구역 5번", current_wait_count: 0 },
];

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: { menuId: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: "pending" | "ready_for_pickup" | "completed" | "cancelled";
  createdAt: string;
  tableNumber?: number;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  avgOrderValue: number;
  popularMenu: string;
}

export const menuCategories = [
  { id: "ramyeon", name: "라면", icon: "🍜" },
];

export const mockMenuItems: MenuItem[] = [
  {
    id: "1", name: "신라면 오리지널", category: "ramyeon", price: 4500,
    description: "매콤한 국물의 대한민국 대표 라면", image: "/placeholder.svg",
    stock: 50, isAvailable: true, spiceLevel: 3, tags: ["인기", "매운맛"],
  },
  {
    id: "2", name: "짜파게티 클래식", category: "ramyeon", price: 4500,
    description: "짜장 소스의 깊은 맛", image: "/placeholder.svg",
    stock: 35, isAvailable: true, spiceLevel: 0, tags: ["인기"],
  },
  {
    id: "3", name: "안성탕면", category: "ramyeon", price: 4000,
    description: "된장 베이스의 구수한 맛", image: "/placeholder.svg",
    stock: 40, isAvailable: true, spiceLevel: 1, tags: ["순한맛"],
  },
  {
    id: "4", name: "불닭볶음면", category: "ramyeon", price: 5000,
    description: "극한의 매운맛 도전", image: "/placeholder.svg",
    stock: 25, isAvailable: true, spiceLevel: 5, tags: ["도전", "매운맛"],
  },
  {
    id: "5", name: "춘천 닭갈비 라면", category: "ramyeon", price: 6500,
    description: "춘천 명물 닭갈비를 라면으로", image: "/placeholder.svg",
    stock: 15, isAvailable: true, spiceLevel: 2, tags: ["한정", "지역특산"],
  },
  {
    id: "6", name: "전주 콩나물 라면", category: "ramyeon", price: 6000,
    description: "전주식 콩나물 해장라면", image: "/placeholder.svg",
    stock: 20, isAvailable: true, spiceLevel: 2, tags: ["지역특산"],
  },
];

export const mockOrders: Order[] = [
  {
    id: "1", orderNumber: "ORD-001", customerName: "김민수", tableNumber: 3,
    items: [
      { menuId: "1", name: "신라면 오리지널", quantity: 2, price: 4500 },
    ],
    totalAmount: 9000, status: "ready_for_pickup", createdAt: "2026-02-19T10:30:00",
  },
  {
    id: "2", orderNumber: "ORD-002", customerName: "이지현", tableNumber: 7,
    items: [
      { menuId: "5", name: "춘천 닭갈비 라면", quantity: 1, price: 6500 },
    ],
    totalAmount: 6500, status: "pending", createdAt: "2026-02-19T10:35:00",
  },
  {
    id: "3", orderNumber: "ORD-003", customerName: "박준영", tableNumber: 1,
    items: [
      { menuId: "4", name: "불닭볶음면", quantity: 1, price: 5000 },
    ],
    totalAmount: 5000, status: "completed", createdAt: "2026-02-19T09:50:00",
  },
  {
    id: "4", orderNumber: "ORD-004", customerName: "최서연",
    items: [
      { menuId: "2", name: "짜파게티 클래식", quantity: 3, price: 4500 },
    ],
    totalAmount: 13500, status: "pending", createdAt: "2026-02-19T10:40:00",
  },
  {
    id: "5", orderNumber: "ORD-005", customerName: "정하늘", tableNumber: 5,
    items: [
      { menuId: "3", name: "안성탕면", quantity: 1, price: 4000 },
    ],
    totalAmount: 4000, status: "ready_for_pickup", createdAt: "2026-02-19T10:25:00",
  },
  {
    id: "6", orderNumber: "ORD-006", customerName: "한도윤", tableNumber: 2,
    items: [
      { menuId: "6", name: "전주 콩나물 라면", quantity: 2, price: 6000 },
    ],
    totalAmount: 12000, status: "completed", createdAt: "2026-02-19T09:15:00",
  },
];

export const dashboardStats: DashboardStats = {
  todaySales: 487500,
  todayOrders: 42,
  avgOrderValue: 11607,
  popularMenu: "신라면 오리지널",
};

export const hourlyRevenueData = [
  { hour: "9시", revenue: 45000, orders: 4 },
  { hour: "10시", revenue: 78000, orders: 7 },
  { hour: "11시", revenue: 125000, orders: 11 },
  { hour: "12시", revenue: 156000, orders: 13 },
  { hour: "13시", revenue: 83500, orders: 7 },
];

export const categoryRevenueData = [
  { name: "라면", value: 245000, fill: "hsl(191 100% 50%)" },
  { name: "짜파게티", value: 85000, fill: "hsl(18 100% 59%)" },
  { name: "지역특산", value: 78000, fill: "hsl(142 71% 45%)" },
  { name: "토핑", value: 45000, fill: "hsl(38 92% 50%)" },
  { name: "사이드", value: 21000, fill: "hsl(270 70% 60%)" },
  { name: "음료", value: 13500, fill: "hsl(199 89% 48%)" },
];
