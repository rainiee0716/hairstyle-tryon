// 积分套餐定义：改价格/档位只动这个文件。
// 价格单位为美分（USD），Stripe/PayPal 下单时由这里取值，无需在支付平台建商品。
export type Pack = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  tagline: string;
  popular?: boolean;
};

export const PACKS: Pack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 20,
    priceCents: 299,
    tagline: "Try a few new looks",
  },
  {
    id: "popular",
    name: "Popular",
    credits: 60,
    priceCents: 699,
    tagline: "Best for picking your next haircut",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 150,
    priceCents: 1299,
    tagline: "For the chronically indecisive",
  },
];

export function getPack(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function priceLabel(pack: Pack): string {
  return `$${(pack.priceCents / 100).toFixed(2)}`;
}
