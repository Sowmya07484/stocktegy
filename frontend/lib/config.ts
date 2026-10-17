
export const USE_SAMPLE_DATA =
  process.env.NEXT_PUBLIC_USE_SAMPLE_DATA !== "false";

export const BACKEND_ACCEPTS_PARAMS = true;

export const PARAMS_LOCKED =
  !USE_SAMPLE_DATA && !BACKEND_ACCEPTS_PARAMS;
