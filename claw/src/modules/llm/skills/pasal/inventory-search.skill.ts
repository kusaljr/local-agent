interface PasalStock {
  stockId: number;
  quantity: number;
  sellingPrice: number;
}

interface PasalProduct {
  id: number;
  name: string;
  stocks: PasalStock[];
  brand?: string;
  baseUnit?: string;
  type?: string;
  availableShops?: number[];
  shopAvailable?: boolean;
}

// const STORE_IDS = [1, 5]; // 1 = Talchowk, 5 = Dhungepatan

export async function pasalInventorySearchSkill(args: {
  query: string;
  storeId?: number;
}) {
  if (!args.storeId) {
    args.storeId = 1;
  }
  const results: any[] = [];

  const res = await fetch(
    `https://api.pasal.com/api/v2/app/pb/search/${encodeURIComponent(
      args.query
    )}`,
    {
      headers: {
        "pasal-store-id": String(args.storeId),
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Pasal search error:", text);
    return { results: [] };
  }

  const data = (await res.json()) as PasalProduct[];

  if (!data?.length) return { results: [] };

  for (const product of data) {
    const cleanedStocks =
      product.stocks?.map((s: any) => ({
        stockId: s.stockId ?? s.id ?? s.stock?.id,
        quantity: s.quantity,
        sellingPrice: s.sellingPrice,
        shopId: s.shopId,
      })) ?? [];

    results.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      baseUnit: product.baseUnit,
      type: product.type,
      stocks: cleanedStocks,
    });
  }

  // Normalize output like internetSearchSkill
  return {
    results,
  };
}
