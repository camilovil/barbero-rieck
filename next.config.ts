import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* El logo de los mails se lee del disco con fs para adjuntarlo
     incrustado (ver lib/email.ts). El trazado automático de Next sigue
     los import y los require, pero no adivina una ruta armada con
     path.join, así que hay que declarar el archivo o en producción la
     lectura falla y los mails salen sin logo. */
  outputFileTracingIncludes: {
    '/api/**': ['./public/logo-white.png'],
  },
};

export default nextConfig;
