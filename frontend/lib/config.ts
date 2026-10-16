/**
 * Sample-data mode is ON unless NEXT_PUBLIC_USE_SAMPLE_DATA=false.
 * In this mode nothing is sent to FastAPI; results are generated in the browser for layout work only.
 */
export const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA !== "false";

/**
 * The FastAPI backend currently runs every strategy with fixed defaults and ignores `params`.
 * Flip to true once it accepts them; until then the sliders are locked in live mode.
 */
export const BACKEND_ACCEPTS_PARAMS = false;
export const PARAMS_LOCKED = !USE_SAMPLE_DATA && !BACKEND_ACCEPTS_PARAMS;
