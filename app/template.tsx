import type { ReactNode } from "react";
import SpecimenLayer from "./specimen-layer";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <SpecimenLayer />
      {children}
    </>
  );
}
