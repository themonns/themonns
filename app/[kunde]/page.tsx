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

  return (
    <main className={styles.side}>
      <div className={styles.hode}>
        <span className="etikett">Prosjekter</span>
        <h1 className={styles.tittel}>{kunde.navn}</h1>
      </div>

      <div className="kortliste">
        {kunde.prosjekter.map((p) => (
          <Link
            key={p.slug}
            href={`/${kunde.slug}/${p.slug}`}
            className="kort"
          >
            <h3>{p.navn}</h3>
            {p.beskrivelse ? <p>{p.beskrivelse}</p> : null}
            <span className="pil">Åpne →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
