# Archiva

Frontend de una plataforma de herramientas para PDF, imágenes y archivos. **Fase 1: interfaz exclusivamente.** Las 16 herramientas están identificadas como «Próximamente»; sus páginas no aceptan archivos, no los procesan y no simulan descargas.

Se utiliza **Archiva** como identidad del proyecto; las referencias a FileNova en el encargo se han unificado bajo este nombre.

## Ejecutar

Requisitos: Node.js 22.9 o superior (desarrollo y validación con Node.js 24) y npm.

```bash
npm ci
npm run dev
```

Abrir [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Compilación y exportación estática

```bash
npm run build
npm start
```

`build` genera el sitio completo en `out/`, incluyendo las 16 rutas `/tools/<slug>/`, la portada y la página 404. `start` sirve esa carpeta para revisión local en el puerto 3000. No utiliza un servidor de aplicaciones de Next.js ni endpoints de API.

Para publicar, copiar **el contenido completo de `out/`** a un hosting estático que resuelva directorios mediante `index.html` y configure `404.html` como página de error. No redirigir todas las rutas al HTML de inicio: cada herramienta tiene su propio documento. Los enlaces usan barra final mediante `trailingSlash`.

La configuración sigue la [exportación estática de Next.js](https://nextjs.org/docs/app/guides/static-exports), con `generateStaticParams` y `dynamicParams = false` para las herramientas.

## Implementado

- Portada con identidad propia, ilustración CSS original, buscador funcional y catálogo de 16 herramientas.
- Búsqueda por palabras sin distinguir mayúsculas ni tildes, contador de resultados y recuperación del estado vacío.
- Filtros PDF, Imágenes y Archivos. La categoría se conserva en la URL y funciona al abrir un enlace directamente o recargar.
- Cabecera con desplegable accesible, menú móvil, navegación interna y enlace para saltar al contenido.
- Temas claro y oscuro: preferencia inicial del sistema y elección manual persistida en `localStorage` con la clave `archiva-theme`.
- Plantilla común de herramienta con área de carga deshabilitada, futuros ajustes, resultados vacíos, herramientas relacionadas y explicación de privacidad.
- Transiciones CSS breves, reposicionamiento de tarjetas con Motion y respeto a `prefers-reduced-motion`.
- Metadatos por herramienta, favicon propio, tipografías servidas desde el mismo sitio y página 404.

## Estructura

```text
src/
├── app/
│   ├── globals.css               # Tokens, temas y estilos compartidos
│   ├── icon.svg
│   ├── layout.tsx               # Idioma, fuentes, proveedores y layout
│   ├── not-found.tsx
│   ├── page.tsx
│   └── tools/[slug]/page.tsx    # Generación estática y metadatos
├── components/
│   ├── home/                   # Hero, buscador, filtros e información
│   ├── layout/                 # Header y footer
│   ├── shared/                 # Logo, tema y proveedores
│   ├── tools/                  # Tarjeta y plantilla reutilizable
│   └── ui/                     # Componentes shadcn/ui
├── config/
│   ├── site.ts                 # Identidad y navegación
│   └── tools.ts                # Herramientas, categorías y disponibilidad
├── lib/utils.ts
└── types/tool.ts
tests/frontend.spec.ts          # Flujos del navegador y accesibilidad
playwright.config.ts
components.json                 # Configuración de shadcn/ui
next.config.ts
```

No se crean carpetas vacías de hooks, servicios o procesamiento. Se incorporarán cuando exista código que las necesite.

## Dependencias

| Función               | Dependencias                                                                |
| --------------------- | --------------------------------------------------------------------------- |
| Aplicación            | Next.js 16, React 19, React DOM                                             |
| Tipado                | TypeScript 6 en modo estricto                                               |
| Estilos               | Tailwind CSS 4, `@tailwindcss/postcss`                                      |
| UI                    | shadcn/ui (Button, Input, Badge y DropdownMenu), Radix Slot y Dropdown Menu |
| Utilidades de UI      | `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`      |
| Iconos                | Lucide React                                                                |
| Movimiento            | Motion                                                                      |
| Tema                  | `next-themes`                                                               |
| Tipografía local      | DM Sans Variable y Manrope Variable mediante Fontsource                     |
| Calidad               | ESLint, `eslint-config-next`, Playwright y axe-core                         |
| Vista previa estática | `serve`, solo desarrollo                                                    |

Las versiones exactas están registradas en `package-lock.json`. No hay bibliotecas de conversión, WebAssembly, Web Workers, PDF.js, pdf-lib, autenticación, bases de datos ni backend.

## Validaciones

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas utilizan **la exportación real de `out/`** en un servidor estático local temporal en el puerto 3100. Compilar antes de ejecutarlas. Cubren:

- Búsqueda, categorías, enlaces directos, recarga y estado vacío.
- Navegación de escritorio, teclado y menú móvil.
- Las 16 páginas, ausencia de errores de JavaScript, cargas y descargas deshabilitadas.
- Ausencia de solicitudes de escritura o solicitudes a otros dominios durante el recorrido de las herramientas.
- Persistencia de tema y preferencia del sistema.
- Ausencia de desbordamiento horizontal a 320, 390, 768, 1024, 1440 y 1920 px.
- Análisis automatizado de accesibilidad WCAG AA en portada y herramienta, en ambos temas.
- Movimiento reducido y documento 404.

Las capturas de revisión se generan en `test-results/` (ignorado por Git). Las comprobaciones de accesibilidad automatizadas no sustituyen una auditoría manual completa ni pruebas con todos los navegadores.

### Auditoría de dependencias

Al 10 de octubre de 2026, `npm audit` identifica cinco avisos de severidad alta en la cadena **de desarrollo** `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. El registro aún ofrece `braces` 3.0.3 como última versión, sin parche para el aviso de anidamiento de patrones. No se aplicó la sugerencia automática de bajar Next ESLint a una versión mayor anterior. Estas dependencias no forman parte del sitio exportado. Se debe revisar el aviso al actualizar el entorno de desarrollo.

Se fija una versión corregida de `compression` (>= 1.8.2) mediante `overrides` para la vista previa estática. Las dependencias de producción pasan `npm audit --omit=dev`.

## Fase 2: pendiente

1. Implementar cada herramienta por separado, empezando por el alcance que se acuerde.
2. Añadir selección y arrastre reales, validación de formato, tamaño y cantidad, y gestión de archivos solo en memoria local.
3. Incorporar el motor local apropiado únicamente al comenzar la herramienta correspondiente, con carga bajo demanda.
4. Añadir ajustes, progreso, cancelación, recuperación de errores, liberación de memoria y descargas reales.
5. Verificar fidelidad y límites de cada conversión, especialmente Word/PowerPoint, antes de prometer compatibilidad.
6. Cambiar el estado de una herramienta a `available` únicamente cuando tenga implementación, interfaz conectada y pruebas de privacidad y funcionalidad.

El catálogo no importa motores de procesamiento. La plantilla actual es exclusiva de la fase 1: antes de habilitar una herramienta se conectará su propio espacio de trabajo, manteniendo las demás en estado pendiente.
