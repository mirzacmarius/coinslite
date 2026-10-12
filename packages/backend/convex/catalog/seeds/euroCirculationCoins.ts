import { euroCirculationCoins } from "../datasets/euroCirculationCoins";
import { datasetLoader } from "../seed";

/** Loads this one bundled dataset, alone in its module so a run holds only its file (catalog/seed.ts). */
export const load = datasetLoader("euroCirculationCoins", euroCirculationCoins);
