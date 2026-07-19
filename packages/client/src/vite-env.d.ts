/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID?: string;
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// The SVG-only lottie build ships untyped; it has the same API as the default.
declare module 'lottie-web/build/player/lottie_light' {
  import lottie from 'lottie-web';
  export default lottie;
}
