"use client";

import { useActionState } from "react";
import { loggInn, type LoggInnStatus } from "./handlinger";

export function LoggInnSkjema({ til }: { til: string }) {
  const [status, handling, venter] = useActionState<LoggInnStatus, FormData>(
    loggInn,
    undefined,
  );

  return (
    <form action={handling}>
      <input type="hidden" name="til" value={til} />
      <div className="felt">
        <input
          type="password"
          name="passord"
          placeholder="Passord"
          autoComplete="current-password"
          autoFocus
          aria-label="Passord"
        />
        <button type="submit" disabled={venter}>
          {venter ? "Åpner" : "Åpne"}
        </button>
      </div>
      {status?.feil ? <p className="feil">{status.feil}</p> : null}
    </form>
  );
}
