import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { finnProsjekt } from "@/lib/kunder";
import styles from "../kunde.module.css";

export async function generateMetadata({
  params,
}: PageProps<"/[kunde]/[prosjekt]">): Promise<Metadata> {
  const { kunde, prosjekt } = await params;
  const treff = finnProsjekt(kunde, prosjekt);
  return { title: treff?.prosjekt.navn ?? "Monn" };
}

/**
 * Standard prosjektside. Et prosjekt som trenger egen kode
 * (hyttebooking, produktmatrise) får egen mappe app/[kunde]/<slug>/,
 * og den vinner over denne.
 */
export default async function ProsjektSide({
  params,
}: PageProps<"/[kunde]/[prosjekt]">) {
  const { kunde: kundeSlug, prosjekt: prosjektSlug } = await params;
  const treff = finnProsjekt(kundeSlug, prosjektSlug);
  if (!treff) notFound();
  const { kunde, prosjekt } = treff;

  return (
    <main className={styles.side}>
      <div className={styles.hode}>
        <span className={styles.brodsmule}>
          <Link href={`/${kunde.slug}`}>{kunde.navn}</Link>
          {" / "}
          {prosjekt.navn}
        </span>
        <h1 className={styles.tittel}>{prosjekt.navn}</h1>
      </div>
      <p className={styles.innhold}>
        {prosjekt.beskrivelse ?? "Innholdet for dette prosjektet er på vei."}
      </p>
    </main>
  );
}
