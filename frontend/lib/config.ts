/**
 * Sample-data mode is ON unless NEXT_PUBLIC_USE_SAMPLE_DATA=false.
 * In this mode nothing is sent to FastAPI; results are generated in the browser for layout work only.
 */
export const USE_SAMPLE_DATA = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA !== "false";
