import Link from "next/link";

const worlds = [
  { name: "Garten", href: "/shop/garten", available: true },
  { name: "Weitere Welt", href: "#", available: false },
  { name: "Weitere Welt", href: "#", available: false },
];

export default function ShopPage() {
  return (
    <section>
      <h1>Insel-Auswahl</h1>
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
