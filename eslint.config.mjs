import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

/* El linter del proyecto. Va con `core-web-vitals`, que sube a error las
   reglas que afectan la performance percibida en vez de dejarlas en aviso,
   más las reglas de TypeScript.

   Se agregó tarde, cuando el proyecto ya tenía 9.500 líneas: no está para
   pelearle al código que ya funciona sino para que lo que venga no repita
   errores que la máquina puede encontrar sola. */
export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      /* Baja de error a aviso, a propósito y con fecha de vencimiento.
         Son siete efectos que buscan datos al montar y hacen setState en el
         camino — el patrón de toda la app, escrito antes de que existiera
         esta regla. Arreglarlos es reestructurar la carga de datos de siete
         componentes, y hacerlo sin una sola prueba encima es exactamente
         cómo se rompe algo que hoy anda.

         Queda en aviso para que se sigan viendo y para que `npm run lint`
         siga sirviendo de portero de lo que entre nuevo. Se suben a error
         cuando haya tests que cubran esas pantallas. */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    /* Los worktrees de los agentes traen su propia copia del proyecto y su
       propio .next. No son código de este repo. */
    '.claude/**',
  ]),
])
