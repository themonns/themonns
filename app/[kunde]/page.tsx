import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { finnKunde } from "@/lib/kunder";
import styles from "./kunde.module.css";

export async function generateMetadata({
  params,
}: PageProps<"/[kunde]">): Promise<Metadata> {
  const { kunde: slug } = await params;
  return { title: finnKunde(slug)?.navn ?? "Monn" };
}

export default async function KundeForside({ params }: PageProps<"/[kunde]">) {
  const { kunde: slug } = await params;
  const kunde = finnKunde(slug);
  if (!kunde) notFound();
  const antall = kunde.prosjekter.length;

  return (
    <main className={styles.side}>
      <div className={styles.hode}>
        <h1 className={styles.tittel}>{kunde.navn}</h1>
        <p className={styles.ingress}>
          {antall === 1 ? "Ett prosjekt" : `${antall} prosjekter`} hos Monn.
        </p>
      </div>

      <div className="liste">
        {kunde.prosjekter.map((p) => (
          <Link
            key={p.slug}
            href={`/${kunde.slug}/${p.slug}`}
            className="rad"
          >
            <div>
              <h3>{p.navn}</h3>
              {p.beskrivelse ? <p>{p.beskrivelse}</p> : null}
            </div>
            <span className="se">Se prosjektet</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
