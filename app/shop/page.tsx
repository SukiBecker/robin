import Link from "next/link";

const worlds = [
  { name: "Garden", href: "/shop/garten", available: true },
  { name: "More Worlds", href: "#", available: false },
  { name: "More Worlds", href: "#", available: false },
];

export default function ShopPage() {
  return (
    <section>
      <h1>Island Selection</h1>
      <div>
        {worlds.map((world, index) =>
          world.available ? (
            <Link href={world.href} key={world.href}>
              {world.name}
            </Link>
          ) : (
            <div key={`${world.name}-${index}`} aria-disabled="true">
              {world.name} – Coming soon
            </div>
          )
        )}
      </div>
    </section>
  );
}
