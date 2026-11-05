export type Prosjekt = {
  slug: string;
  navn: string;
  beskrivelse?: string;
};

export type Kunde = {
  slug: string;
  navn: string;
  /** Navnet på miljøvariabelen som holder passordet, for eksempel PASSORD_THON */
  passordNokkel: string;
  /** Sett når kunden har sin egen ferdige forside i public/<slug>/index.html */
  egenForside?: boolean;
  prosjekter: Prosjekt[];
};

/**
 * Alt som ligger under themonns.no.
 * Ny kunde: legg til en linje her og sett passordet som miljøvariabel i Vercel.
 * Nytt prosjekt: legg til i listen under riktig kunde og lag mappen app/[kunde]/<slug>
 * hvis prosjektet trenger egen kode. Uten egen mappe vises en enkel prosjektside.
 */
export const kunder: Kunde[] = [
  {
    slug: "intern",
    navn: "Monn intern",
    passordNokkel: "PASSORD_INTERN",
    prosjekter: [
      {
        slug: "hyttebooking",
        navn: "Hyttebooking",
        beskrivelse: "Booking av hytta på Skeikampen",
      },
    ],
  },
  {
    slug: "thon",
    navn: "Thon",
    passordNokkel: "PASSORD_THON",
    prosjekter: [
      {
        slug: "osloairport",
        navn: "Thon Hotel Oslo Airport",
        beskrivelse: "Produktmatrise og underlag",
      },
      {
        slug: "resepsjon",
        navn: "Resepsjon og lobby",
        beskrivelse: "Plan, materialer, inventar og belysning",
      },
    ],
  },
  {
    slug: "eiendomsspar",
    navn: "Eiendomsspar",
    passordNokkel: "PASSORD_EIENDOMSSPAR",
    prosjekter: [
      {
        slug: "tryvannstarnet",
        navn: "Tryvannstårnet",
        beskrivelse: "3D snitt, film og plantegninger",
      },
    ],
  },
  {
    slug: "vikaeiendomsforvaltning",
    navn: "Vika Eiendomsforvaltning",
    passordNokkel: "PASSORD_VIKA",
    egenForside: true,
    prosjekter: [
      {
        slug: "kirkegata",
        navn: "Kirkegata 15",
        beskrivelse: "Kontor, leietakere og tilpasning",
      },
    ],
  },
];

export function finnKunde(slug: string): Kunde | undefined {
  return kunder.find((k) => k.slug === slug);
}

export function finnProsjekt(kundeSlug: string, prosjektSlug: string) {
  const kunde = finnKunde(kundeSlug);
  if (!kunde) return undefined;
  const prosjekt = kunde.prosjekter.find((p) => p.slug === prosjektSlug);
  return prosjekt ? { kunde, prosjekt } : undefined;
}
