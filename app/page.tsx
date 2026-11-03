import styles from "./page.module.css";
import { LoggInnSkjema } from "./LoggInnSkjema";
import { HalftoneOrd } from "./HalftoneOrd";

export default async function Forside({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const raa = typeof params.til === "string" ? params.til : "";
  const til = raa.startsWith("/") && !raa.startsWith("//") ? raa : "";

  return (
    <main className={styles.side}>
      <header className={styles.topp}>
        <span>Monn Interiørarkitekter</span>
        <span>Arbeidsrom for ansatte og kunder</span>
      </header>

      <section className={styles.midt}>
        <HalftoneOrd ord="Monn" className={styles.ord} />
        <div className={styles.rad}>
          <LoggInnSkjema til={til} />
          <p className={styles.hjelp}>
            Passordet du har fått tar deg rett til dine prosjekter.
          </p>
        </div>
      </section>

      <footer className={styles.bunn}>
        <span>Oslo</span>
        <span>themonns.no</span>
      </footer>
    </main>
  );
}
