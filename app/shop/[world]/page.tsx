import { notFound } from "next/navigation";

type ShopWorldPageProps = {
  params: Promise<{ world: string }>;
};

export default async function ShopWorldPage({ params }: ShopWorldPageProps) {
  const { world } = await params;

  if (world !== "garten") {
    notFound();
  }

  const worldName = world === "garten" ? "Garden" : world;

  return <h1>Shop – {worldName} (Placeholder)</h1>;
}
