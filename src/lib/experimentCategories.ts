export const EXPERIMENT_CATEGORIES = [
  "Polarización",
  "Interferencia",
  "Óptica no lineal",
  "Óptica cuántica",
  "Birrefringencia",
  "Óptica geométrica",
  "Difracción",
  "Formación de imágenes",
] as const;

export type ExperimentCategory = (typeof EXPERIMENT_CATEGORIES)[number];
