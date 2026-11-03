import styles from "./page.module.css";
import { LoggInnSkjema } from "./LoggInnSkjema";

export default async function Forside({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const raa = typeof params.til === "string" ? params.til : "";
  const til = raa.startsWith("/") && !raa.startsWith("//") ? raa : "";

  return (
    <main className={styles.side}>
      <header className={styles.topp}>
        <span className="ordmerke">Monn</span>
        <span className="etikett">Arbeidsrom</span>
      </header>

      <section className={styles.midt}>
        <h1 className={styles.tittel}>Velkommen.</h1>
        <p className={styles.ingress}>
          Skriv inn passordet du har fått, så kommer du rett til dine prosjekter.
        </p>
        <div className={styles.skjema}>
          <LoggInnSkjema til={til} />
        </div>
      </section>

      <footer className={styles.bunn}>
        <span>Monn Interiørarkitekter</span>
        <span>Oslo</span>
      </footer>
    </main>
  );
}
