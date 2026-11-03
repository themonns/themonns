import Link from "next/link";
import { notFound } from "next/navigation";
import { finnKunde } from "@/lib/kunder";

export default async function KundeLayout({
  children,
  params,
}: LayoutProps<"/[kunde]">) {
  const { kunde: slug } = await params;
  const kunde = finnKunde(slug);
  if (!kunde) notFound();

  return (
    <div className="ramme">
      <header className="topp">
        <Link href={`/${kunde.slug}`} className="ordmerke">
          Monn
        </Link>
        <nav>
          <span className="kunde">{kunde.navn}</span>
          <a href={`/logg-ut?kunde=${kunde.slug}`}>Logg ut</a>
        </nav>
      </header>
      {children}
      <footer className="bunn">
        <span>Monn Interiørarkitekter</span>
        <span>Oslo</span>
      </footer>
    </div>
  );
}
