# Archiva

Archiva reúne herramientas para gestionar, organizar y transformar archivos directamente desde el navegador. **Unir, Dividir, Organizar e Imágenes a PDF están disponibles:** combinan documentos, extraen páginas, reorganizan PDF o convierten imágenes en un documento configurable. Las otras 12 herramientas permanecen identificadas como «Próximamente».

Los documentos se procesan en memoria en el dispositivo del usuario. No hay backend, subidas de documentos, cuentas ni servicios externos de conversión.

## Ejecutar

Requisitos: Node.js 22.13 o superior (desarrollo y validación con Node.js 24) y npm.

```bash
npm ci
npm run dev
```

Abrir [http://127.0.0.1:3000](http://127.0.0.1:3000).

Para probar Unir PDF, abrir [http://127.0.0.1:3000/tools/merge-pdf/](http://127.0.0.1:3000/tools/merge-pdf/), seleccionar dos PDF, ajustar su orden y pulsar **Unir PDF**. Después se puede cambiar el nombre y descargar el resultado.

Para probar Dividir PDF, abrir [http://127.0.0.1:3000/tools/split-pdf/](http://127.0.0.1:3000/tools/split-pdf/), seleccionar un PDF, examinar las miniaturas numeradas y elegir páginas, rangos o bloques de N páginas. Los resultados se descargan individualmente; si hay varios, se puede preparar un ZIP local.

Para probar Organizar PDF, abrir [http://127.0.0.1:3000/tools/organize-pdf/](http://127.0.0.1:3000/tools/organize-pdf/), seleccionar un PDF y arrastrar directamente sus miniaturas. También se pueden seleccionar varias páginas, girarlas, eliminarlas, deshacer cambios y exportar el nuevo documento.

Para probar Imágenes a PDF, abrir [http://127.0.0.1:3000/tools/images-to-pdf/](http://127.0.0.1:3000/tools/images-to-pdf/), seleccionar archivos JPG, PNG o WebP, ordenarlos, ajustar la página y pulsar **Crear PDF**.

Para detener el servidor, pulsar `Ctrl + C` en su terminal. Si el proyecto ya está ejecutándose, utilizar la dirección del servidor existente en lugar de iniciar una segunda instancia.

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
- Unir PDF integrado en esa plantilla: selección múltiple, arrastre de archivos, validación real, lista con tamaños y páginas, adición, eliminación y cambio de orden.
- Miniatura local de la primera página de cada PDF, ampliable para identificar el documento antes de ordenarlo. Si una página no se puede dibujar, el archivo válido sigue disponible para unir.
- Reordenación mediante arrastre en escritorio, flechas disponibles en todos los dispositivos y control del asa con las flechas del teclado.
- Estados de selección, validación, combinación, error y resultado, con progreso por documentos realmente revisados/copiados y etapa de generación sin porcentaje inventado.
- Descarga local con nombre editable, tamaño y número de páginas; nueva combinación, cancelación y limpieza de recursos.
- Dividir PDF con miniaturas visibles de todas las páginas, renderizadas progresivamente, y selección mediante clic, toque o teclado.
- Extracción de páginas no consecutivas, división por rangos en el orden escrito y bloques de N páginas; vista previa de los grupos antes de procesar.
- Descarga individual de resultados, nombre editable para un único PDF y ZIP local bajo demanda para varios archivos.
- Organizar PDF con miniaturas reales, arrastre directo en cuadrícula, desplazamiento visual de las demás páginas y soporte para ratón, toque y teclado.
- Rotación individual o múltiple, eliminación protegida, selección masiva y controles alternativos accesibles para mover páginas.
- Historial ligero de 50 operaciones para deshacer, rehacer y restablecer el documento original, sin duplicar el archivo PDF en memoria.
- Exportación local que conserva el orden, contenido, dimensiones y rotaciones elegidas sin rasterizar las páginas.
- Imágenes a PDF con selección múltiple, adición posterior, validación por contenido, miniaturas optimizadas y detección de duplicados accidentales.
- Reordenamiento directo de imágenes con ratón, toque o teclado, además de rotación y eliminación individual.
- Configuración A4, Carta, A3 o tamaño proporcional a la imagen; orientación automática, vertical u horizontal; cuatro márgenes y ajustes Contener o Rellenar.
- Vista previa ligera de la distribución y exportación de JPG/PNG directa cuando no requieren transformación; WebP, rotaciones y recortes se normalizan localmente mediante Canvas.
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
│   │   ├── merge-pdf/          # Carga, lista, carátulas y resultado
│   │   ├── split-pdf/          # Carga, modos, cuadrícula y resultados
│   │   ├── organize-pdf/       # Arrastre, edición y resultado organizado
│   │   └── images-to-pdf/      # Imágenes, ajustes, vista previa y resultado
│   └── ui/                     # Componentes shadcn/ui
├── config/
│   ├── site.ts                 # Identidad y navegación
│   └── tools.ts                # Herramientas, categorías y disponibilidad
├── hooks/use-merge-pdf.ts       # Estado, bloqueo de operaciones y limpieza
├── hooks/use-split-pdf.ts       # Estado de división y limpieza
├── hooks/use-organize-pdf.ts    # Carga, edición, exportación y limpieza
├── hooks/use-organize-history.ts # Historial ligero de organización
├── hooks/use-images-to-pdf.ts    # Selección, orden, ajustes y generación
├── lib/
│   ├── utils.ts
│   ├── images/                  # Validación real y miniaturas reducidas
│   └── pdf/
│       ├── validate-file.ts    # Comprobación inicial de metadatos
│       ├── validate-pdf.ts     # Lectura real y rechazo de incompatibles
│       ├── render-cover.ts     # Carátula de la primera página con PDF.js
│       ├── merge-pdf.ts        # Copia de páginas y generación del PDF
│       ├── split-pdf.ts        # Extracción de grupos de páginas
│       ├── parse-page-ranges.ts # Rangos y bloques de N páginas
│       ├── page-preview-session.ts # Renderizado progresivo con PDF.js
│       ├── split.worker.ts     # División en worker local
│       ├── split-worker-client.ts # Comunicación con el worker
│       ├── organize-pdf.ts      # Orden, exclusión y rotaciones finales
│       ├── organize.worker.ts   # Exportación organizada en segundo plano
│       ├── organize-worker-client.ts # Comunicación con el worker
│       ├── images-to-pdf.ts     # Cálculo de página y creación del PDF
│       ├── images-to-pdf.worker.ts # Conversión local en segundo plano
│       ├── images-to-pdf-worker-client.ts # Comunicación con el worker
│       ├── pdf.worker.ts       # Documentos retenidos solo en memoria
│       ├── worker-client.ts    # Mensajes, progreso y terminación
│       ├── errors.ts           # Mensajes seguros y comprensibles
│       └── download.ts         # Nombre descargable y tamaños
└── types/
    ├── tool.ts
    ├── pdf.ts
    └── split-pdf.ts
tests/
├── frontend.spec.ts            # Catálogo, navegación y accesibilidad
├── pdf-logic.spec.ts           # Pruebas de validación y combinación
├── merge-pdf.spec.ts           # Flujos reales en el navegador
├── split-logic.spec.ts         # Rangos y resultados PDF
├── split-pdf.spec.ts           # Flujos de división y ZIP en navegador
├── organize-logic.spec.ts      # Orden, rotaciones y páginas excluidas
├── organize-pdf.spec.ts        # Arrastre, edición y exportación en navegador
├── images-layout.spec.ts       # Tamaños, orientación, márgenes y ajuste
├── images-to-pdf.spec.ts       # Formatos, arrastre y conversión en navegador
├── helpers/pdf-fixtures.ts     # Documentos de prueba generados en memoria
└── fixtures/                  # Ejemplos cifrados con atribución MIT
playwright.config.ts
components.json                 # Configuración de shadcn/ui
next.config.ts
```

Se conserva una sola ruta dinámica `/tools/[slug]/`; cada herramienta tiene su propio espacio de trabajo sin acoplar las demás a su lógica.

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
| Unión local de PDF    | `pdf-lib` 1.17.1, cargado en un Web Worker nativo                           |
| Carátulas de PDF      | `pdfjs-dist` 6.4.299, cargado al seleccionar archivos                       |
| Descarga ZIP          | `jszip` 3.10.2, cargado solo al preparar varios resultados                  |
| Arrastre de páginas   | `@dnd-kit/core` 6.3.1, `sortable` 10.0.0 y `utilities` 3.2.2                |

Las versiones exactas están registradas en `package-lock.json`. Imágenes a PDF reutiliza `pdf-lib`, `dnd-kit` y las APIs nativas File, Blob, Canvas, ImageBitmap y Web Worker. La fase 5 no añade dependencias. No hay autenticación, bases de datos ni backend.

## Funcionamiento y privacidad de Unir PDF

1. Se comprueba extensión o MIME como filtro inicial; no se confía en ellos para aceptar un documento.
2. Cada archivo se lee una sola vez mediante `File.arrayBuffer()`. Su buffer se transfiere a un worker del mismo sitio; se usa una copia temporal para renderizar la primera página con PDF.js. Esto es comunicación interna del navegador, no una subida de red.
3. `pdf-lib` analiza el contenido. Se rechazan archivos vacíos, encabezados incorrectos, objetos recuperados como inválidos, páginas incompatibles y documentos cifrados. Nunca se activa `ignoreEncryption` ni se intenta quitar una contraseña.
4. Los documentos válidos permanecen en la memoria del worker. La interfaz conserva sus identificadores, nombres, tamaños, cantidades de páginas y URLs temporales de miniaturas. Reordenar no vuelve a leer los archivos. Las miniaturas se revocan al quitar archivos, unir, reiniciar o salir.
5. Al unir, el worker copia las páginas en el orden mostrado, informa cuántos documentos ha copiado y genera los bytes del resultado. Los controles incompatibles permanecen deshabilitados; **Cancelar y vaciar** termina el worker y descarta la selección.
6. El navegador crea un `Blob` PDF y una URL temporal para descargarlo. El worker y sus documentos de origen se liberan al completar la operación. La URL del resultado se conserva para permitir descargas repetidas y se revoca al reiniciar o abandonar la herramienta.

No se guardan archivos en `localStorage`, `sessionStorage`, IndexedDB, cookies ni servidores. El único uso de `localStorage` de la aplicación sigue siendo la preferencia de tema. Los motores de unión y carátulas se descargan como código estático del propio sitio al seleccionar el primer PDF. Una vez cargados, la operación funciona sin conexión, mientras la página permanezca abierta.

## Funcionamiento y privacidad de Dividir PDF

Un único archivo se lee y valida localmente. `pdf-lib` conserva el documento original en un worker; PDF.js recibe una copia temporal para mostrar las páginas. La cuadrícula contiene todas las páginas numeradas, pero solo renderiza miniaturas al acercarse a la zona visible. La selección puede hacerse con ratón, toque o teclado.

El modo **Elegir páginas** extrae las páginas marcadas en orden original. **Por rangos** genera un PDF por grupo en el orden escrito; acepta, por ejemplo, `5-7, 1-2`. **Cada N páginas** crea bloques consecutivos, incluido uno final más corto. La configuración se valida antes de habilitar la división. Cada PDF se genera en el worker con progreso por documento terminado, sin convertir las páginas en imágenes.

Los resultados se entregan como `Blob` y URLs temporales. Con varios archivos, `jszip` se carga solo si se pulsa **Preparar descarga ZIP** y construye el ZIP en memoria, sin solicitudes externas. Las URLs y los workers se liberan al reiniciar, reemplazar el documento o abandonar la herramienta. Los archivos originales y generados no se guardan de forma persistente.

## Funcionamiento y privacidad de Organizar PDF

El PDF se valida una sola vez y permanece en un Web Worker local. PDF.js utiliza una copia temporal para dibujar progresivamente las miniaturas. Cada página se representa mediante un identificador estable, su índice original y la rotación acumulada; arrastrar, rotar o eliminar solo cambia estos datos ligeros.

`dnd-kit` activa el arrastre con una distancia mínima para distinguirlo de un clic. En pantallas táctiles utiliza una pulsación breve con tolerancia al movimiento para conservar el desplazamiento vertical. El sensor de teclado y los controles de posición ofrecen una alternativa accesible. Escape cancela el movimiento sin añadirlo al historial.

Al exportar, `pdf-lib` copia las páginas originales en el orden visible, omite las eliminadas y suma las rotaciones a su orientación original. No rasteriza el contenido. El resultado se crea como un `Blob` descargable y todos los workers, miniaturas y URLs temporales se liberan al reiniciar o salir.

## Funcionamiento y privacidad de Imágenes a PDF

Cada archivo se lee una vez y se identifica mediante su firma binaria como JPEG, PNG o WebP. El navegador lo decodifica para comprobar que sea una imagen real y genera una miniatura reducida; el buffer original se conserva sin copias destructivas hasta la exportación.

El orden y la rotación permanecen como metadatos ligeros. Al generar, los buffers se transfieren a un Web Worker. JPEG y PNG se incrustan directamente cuando no requieren transformación. WebP se convierte a PNG; las rotaciones y el modo Rellenar utilizan `OffscreenCanvas` para producir únicamente la versión necesaria. Rellenar recorta al aspecto exacto del área imprimible y Contener conserva la imagen completa.

Los tamaños estándar usan puntos PDF. El modo de tamaño de imagen convierte píxeles CSS mediante la relación coherente de 96 píxeles por pulgada y 72 puntos por pulgada. Cada imagen ocupa una página. Los buffers, bitmaps, canvases, workers y URLs temporales se liberan al terminar, reiniciar o abandonar la herramienta.

## Limitaciones conocidas

- Los PDF cifrados o protegidos se rechazan; no se solicitan contraseñas ni se elude su protección.
- Se preservan las páginas, dimensiones, recortes y orientación en la medida admitida por `pdf-lib`. Las firmas digitales no se mantienen válidas en el nuevo documento; formularios interactivos, marcadores, adjuntos y otros datos a nivel de documento pueden no conservarse.
- La validación comprueba estructura y compatibilidad con el motor; no es un renderizador ni una certificación completa del formato PDF. Una página con contenido internamente corrupto podría requerir revisión visual del resultado.
- No hay un límite artificial de archivos o megabytes. El máximo práctico depende de la memoria disponible y de la complejidad de los documentos. Crear una carátula necesita una copia temporal del archivo; se procesa una a la vez. Se muestran errores de asignación de memoria detectables; si el sistema cierra la pestaña por falta de memoria, JavaScript no puede recuperar esa sesión.
- Dividir PDF también utiliza una copia temporal para PDF.js. Las miniaturas tienen resolución acotada; la vista sirve para identificar páginas, no para examinar detalles de impresión. El ZIP necesita memoria adicional proporcional a los resultados generados.
- Organizar PDF conserva un máximo de 50 pasos de historial. Las miniaturas giradas son una representación visual reducida; el PDF final aplica la rotación directamente a cada página.
- Imágenes muy grandes pueden superar la memoria disponible durante la decodificación o el recorte. JPEG se conserva directamente cuando es posible; girarlo o usar Rellenar requiere recodificación con calidad alta. La orientación EXIF poco habitual puede depender de cómo la interprete el navegador.
- Al salir, recargar o reiniciar se pierde la selección y el resultado que no se haya descargado. No existe persistencia de documentos.

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
- Las 16 páginas y disponibilidad de Unir, Dividir, Organizar e Imágenes a PDF; las otras 12 mantienen la carga deshabilitada.
- Ausencia de solicitudes de escritura o solicitudes a otros dominios durante el recorrido de las herramientas.
- Persistencia de tema y preferencia del sistema.
- Ausencia de desbordamiento horizontal a 320, 390, 768, 1024, 1440 y 1920 px.
- Análisis automatizado de accesibilidad WCAG AA en portada y herramienta, en ambos temas.
- Movimiento reducido y documento 404.
- Unión real de dos y tres documentos, comparación de los operadores de contenido, orden, dimensiones, recortes y rotación del archivo descargado.
- Adición posterior, eliminación, reordenación con flechas y arrastre de archivos y elementos.
- Archivos no PDF, archivos falsamente renombrados, vacíos, dañados y dos PDF realmente cifrados de los ejemplos de pdf-lib.
- Descarga con nombre editable, nueva combinación, terminación de workers y revocación de URLs al reiniciar o navegar fuera.
- Procesamiento y descarga con el navegador sin conexión después de cargar el motor; comprobación de ausencia de peticiones con cuerpo o a dominios externos.
- Vista móvil y accesibilidad de la selección y del resultado en modo oscuro; cancelación de una lectura pendiente sin resucitar archivos.
- Renderizado real de carátulas distintas, ampliación, asociación correcta tras reordenar y limpieza de sus URLs.
- Recuperación tras un fallo de asignación de memoria al crear la descarga, con una nueva selección y combinación correctas.
- Dividir PDF: miniaturas visibles, selección individual/todas/ninguna, reemplazo, páginas no consecutivas, rangos en orden, bloques con resto, validaciones, descarga individual, ZIP, móvil y privacidad sin red.
- Organizar PDF: arrastre real de la página 10 a la posición 2, desplazamiento visual durante el gesto, arrastres consecutivos, Escape, toque entre filas y teclado.
- Selección, rotaciones individuales y múltiples, eliminación, protección de la última página, deshacer, rehacer, restablecer y verificación del contenido descargado.
- Imágenes a PDF: JPG, PNG transparente, WebP, formatos mixtos, adición, eliminación, duplicados, archivos falsos y carga mediante arrastre.
- Arrastre real de la sexta imagen a la segunda posición, desplazamiento visual, toque entre filas, Escape, teclado, rotación y orden verificado dentro del PDF.
- A4, Carta, A3, tamaño por imagen, orientación automática y forzada, márgenes, Contener, Rellenar con recorte, descarga renombrada, móvil y conversión sin conexión.

Validación de la fase 5: TypeScript, lint, compilación y exportación estática correctas. Las 59 pruebas se ejecutan sobre el sitio exportado e incluyen los cuatro flujos, cancelación y limpieza de recursos.

Las capturas de revisión se generan en `test-results/` (ignorado por Git). Las comprobaciones de accesibilidad automatizadas no sustituyen una auditoría manual completa ni pruebas con todos los navegadores.

### Auditoría de dependencias

Al 10 de octubre de 2026, `npm audit` identifica cinco avisos de severidad alta en la cadena **de desarrollo** `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. El registro aún ofrece `braces` 3.0.3 como última versión, sin parche para el aviso de anidamiento de patrones. No se aplicó la sugerencia automática de bajar Next ESLint a una versión mayor anterior. Estas dependencias no forman parte del sitio exportado. Se debe revisar el aviso al actualizar el entorno de desarrollo.

Se fija una versión corregida de `compression` (>= 1.8.2) mediante `overrides` para la vista previa estática. Las dependencias de producción pasan `npm audit --omit=dev`.

## Próximas herramientas

Unir, Dividir, Organizar e Imágenes a PDF están habilitadas. Las otras 12 herramientas se implementarán individualmente cuando se acuerde su alcance, incorporando sus motores bajo demanda y verificando su procesamiento local. Las conversiones Word/PowerPoint requieren evaluar fidelidad y compatibilidad antes de anunciar su disponibilidad.
