// Contenido de la pestaña Guía (español). Misma estructura que en.ts, que es la fuente.
import type { GuideContent } from './types.ts';

export const guideEs: GuideContent = {
  lede: "Aprende por qué importa cada paso y lleva tu personaje a Godot, GDevelop o Kaplay. Tus imágenes no salen de tu computadora.",
  ui: {
    indexLabel: "Secciones de la guía",
    jumpTo: "Ir a una sección",
    copy: "Copiar",
    copied: "Copiado",
  },
  sections: [
    {
      id: 'how-it-works',
      title: "Cómo funciona",
      blocks: [
        { type: 'p', text: "Los modelos de IA como Gemini y ChatGPT dibujan buenos personajes, pero sus hojas de sprites fallan en un motor de juego. align-sprites arregla la hoja en tu navegador." },
        {
          type: 'ul',
          items: [
            "Los frames salen de tamaños distintos y el personaje salta de un frame a otro.",
            "Cada imagen trae su propia escala, así que tu jugador y tu enemigo no combinan.",
            "El pixel art es falso: bloques borrosos sobre una cuadrícula irregular.",
            "El fondo es un color plano, no transparencia.",
          ],
        },
        {
          type: 'diagram',
          steps: [
            { title: "Imagen de IA", text: "La IA dibuja la hoja sobre un color clave plano. Los píxeles salen borrosos y los tamaños dispares." },
            { title: "Fondo", text: "La herramienta encuentra el color clave y lo quita. Los huecos entre el brazo y el cuerpo también; la ropa blanca se queda." },
            { title: "Frames", text: "Encuentra cada frame (las cajas) y los numera en orden de lectura." },
            { title: "Cuadrícula de píxeles", text: "Encuentra la cuadrícula real de píxeles y redibuja cada frame sobre ella con bordes duros. Solo en pixel art." },
            { title: "Misma altura", text: "Todos los personajes quedan con la misma altura, así el jugador y el enemigo combinan. La línea es donde van los pies." },
            { title: "Tamaño del frame", text: "Cada frame va en una caja del mismo tamaño, centrado y con los pies sobre la línea." },
            { title: "Tu motor", text: "Obtienes un ZIP para Godot, GDevelop y Kaplay, con el origen en los pies." },
          ],
          legend: [
            { tone: 'key', text: "El magenta es lo que la herramienta detecta o quita." },
            { tone: 'ground', text: "El amarillo es la línea de los pies." },
          ],
        },
        {
          type: 'compare',
          asset: 'wizard',
          label: "Compara la imagen de la IA con el resultado. Usa las flechas del teclado para mover el divisor.",
          before: "Imagen de IA",
          after: "Resultado",
          beforeAlt: "Un mago de pixel art con una larga barba blanca sobre fondo magenta, dibujado con bloques borrosos.",
          afterAlt: "El mismo mago después de align-sprites: píxeles nítidos, fondo transparente, frame de 64 por 64 píxeles.",
          caption: "El mago como lo dibujó la IA (1254 px, unos 93 píxeles de arte de alto) y como lo deja align-sprites (frame de 64 px, transparente y nítido).",
        },
        { type: 'p', text: "La herramienta nunca repinta tu personaje. Solo encuentra, limpia, redimensiona y coloca lo que dibujó la IA." },
        { type: 'h3', id: 'workflow', text: "El flujo completo" },
        {
          type: 'steps',
          items: [
            "**Genera.** En la pestaña Crear con IA, arma un prompt y una imagen guía, y pídele la hoja a tu IA. Mira [Crear con IA](#/guide/generate).",
            "**Normaliza.** En la pestaña Sprites, suelta la imagen y revisa la vista previa. Mira [Normalizar](#/guide/normalize).",
            "**Exporta.** Descarga el ZIP y sigue los pasos de tu motor: [Godot](#/guide/godot), [GDevelop](#/guide/gdevelop) o [Kaplay](#/guide/kaplay).",
          ],
        },
        { type: 'p', text: "¿Haces varios sprites, tiles y objetos para un mismo juego? La pestaña [Kit](#/guide/kit) los junta y comprueba que compartan una escala." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }, { to: 'ai', label: "Crear con IA" }, { to: 'world', label: "Escenario" }, { to: 'items', label: "Objetos" }, { to: 'kit', label: "Kit" }] },
      ],
    },
    {
      id: 'generate',
      title: "Crear con IA",
      blocks: [
        { type: 'p', text: "La IA sigue tu prompt a medias. Tu trabajo es pedir de modo que sus errores sean fáciles de arreglar." },
        { type: 'h3', id: 'rules', text: "Cinco reglas para buenas hojas" },
        {
          type: 'ul',
          items: [
            "**Pide toda la animación en una sola imagen.** Los frames generados uno por uno nunca coinciden: el personaje cambia de una imagen a otra.",
            "**Adjunta la imagen guía.** Es una cuadrícula magenta con una línea de pies. Le dice a la IA cuántos frames dibujar y dónde van los pies.",
            "**Adjunta una referencia de tu personaje** si ya tienes uno bueno. Generar a partir de una imagen de referencia mantiene al personaje coherente. La IA suele copiar el nivel de detalle de la referencia más que el alto pedido; no importa, el tamaño final lo eliges aquí.",
            "**Elige el color clave según el personaje.** Usa magenta, o verde si tu personaje es rosado, morado o magenta. El prompt le pide a la IA que no use el color clave en el personaje.",
            "**Pide un personaje pequeño**, de 16 a 48 píxeles de arte de alto. A la IA le cuesta menos mantener coherentes los personajes pequeños.",
          ],
        },
        { type: 'figures', items: [{ src: 'guide/guide-3x2-magenta.png', alt: "Una cuadrícula magenta de tres columnas por dos filas, con una línea cerca del borde inferior de cada caja y un número en cada caja.", caption: "La imagen guía de una hoja de 3 por 2. La IA la usa de plantilla y no copia sus líneas.", pixelated: false, zoom: 0.5 }] },
        { type: 'h3', id: 'get-the-prompt', text: "Consigue el prompt y la guía" },
        {
          type: 'steps',
          items: [
            "Abre la pestaña Crear con IA.",
            "Describe el personaje y la acción (caminar, correr, reposo, ataque, salto), el número de frames y las columnas.",
            "Copia el prompt y descarga la imagen guía.",
            "En Gemini o ChatGPT, pega el prompt y adjunta la guía. Adjunta también tu personaje, como referencia, si lo tienes.",
            "Descarga el resultado y ábrelo en la pestaña Sprites.",
          ],
        },
        { type: 'actions', items: [{ to: 'ai', label: "Crear con IA" }] },
        { type: 'h3', id: 'more-prompts', text: "Más cosas que puedes pedir" },
        { type: 'p', text: "La pestaña tiene un prompt, y una imagen guía cuando ayuda, para cada una de estas. Elige el grupo (Sprites, Escenario u Objetos) y el tipo arriba." },
        {
          type: 'ul',
          items: [
            "**Cenital, 4 direcciones.** Una caminata con una fila por dirección: abajo, izquierda, derecha, arriba. La opción **3 filas** pide abajo, lateral y arriba, y tu juego voltea la fila lateral.",
            "**Clip de video.** Un texto para un modelo de video (Veo, Kling, Sora, Hailuo, Runway): un ciclo de 2 a 4 segundos del personaje moviéndose en el sitio, sobre fondo verde plano y con cámara fija. Parte de la imagen de tu personaje si el modelo la acepta. La pestaña Sprites convierte el video en frames.",
            "**Atlas de tiles.** Un tileset completo en una imagen, con espacios del color clave entre los tiles. El prompt pide superficies de suelo sólidas, para que los personajes no floten. Ábrelo en Escenario, **Hoja de tiles**.",
            "**Capas de parallax.** Ábrelas en Escenario, **Fondo con parallax**. Un prompt por capa (lejana, intermedia, cercana). La lejana es opaca, las otras van sobre el color clave y todas se repiten en horizontal. Adjunta la capa lejana como referencia al hacer la siguiente, para que el estilo coincida.",
            "**Efectos.** Explosiones, chispas de golpe, magia, humo y proyectiles, centrados en cada frame. El prompt pide bordes duros, porque los resplandores suaves se quitan junto con el fondo.",
            "**Objetos e íconos.** Ábrelos en la pestaña Objetos. Muchos objetos separados en una imagen, cada uno centrado en su espacio, con la misma escala y sin sombras sobre el fondo.",
          ],
        },
        { type: 'h3', id: 'what-goes-wrong', text: "Lo que la IA hace mal" },
        { type: 'p', text: "Estas hojas se hicieron en ChatGPT con los prompts y las imágenes guía de esta herramienta. Los números son medidos, no estimados." },
        {
          type: 'example',
          item: { src: 'guide/knight-before.jpg', alt: "Seis frames de un caballero de pixel art caminando, sobre fondo magenta.", caption: "Caballero caminando, pixel art, 6 frames sobre magenta.", pixelated: false },
          title: "Caballero",
          facts: [
            "Pediste un personaje de 32 píxeles de arte de alto. Salió de unos 58 píxeles.",
            "El fondo nunca fue el color clave exacto: ningún píxel era #FF00FF y había unos 8.500 tonos de magenta.",
            "El centro horizontal se desplaza entre frames (de 228 a 249 px en cajas de 256 px).",
            "Los frames 4 a 6 repiten casi los frames 1 a 3, así que la caminata apenas se lee.",
          ],
        },
        {
          type: 'example',
          item: { src: 'guide/fox-before.jpg', alt: "Seis frames de un zorro de caricatura corriendo, sobre fondo verde.", caption: "Zorro corriendo, cartoon, 6 frames sobre verde.", pixelated: false },
          title: "Zorro",
          facts: [
            "La fila de abajo es casi una copia de la de arriba: solo 3 poses distintas de 6.",
            "Los pies se desplazan hasta 10 px entre frames.",
            "El color clave salió como (2, 249, 2), con unos 7.500 tonos alrededor, nunca el #00FF00 exacto.",
            "La marcha es de cuadrúpedo. El prompt pedía poses clave de bípedo y la IA las ignoró.",
          ],
        },
        { type: 'p', text: "Algunos de estos defectos son fáciles para la herramienta. Otros solo los arreglas tú." },
        {
          type: 'table',
          head: ["Defecto", "Quién lo arregla"],
          rows: [
            ["El fondo no es el color clave exacto", "La herramienta. Usa el color más común del borde, no una igualdad exacta."],
            ["El personaje sale muy grande o muy pequeño", "La herramienta. Tú eliges la altura."],
            ["El personaje está descentrado o con los pies a distinta altura", "La herramienta. Alinea los pies y el centro en cada frame."],
            ["Poses repetidas", "Tú. Genera de nuevo."],
            ["El personaje cambia entre frames", "Tú. Genera de nuevo con una imagen de referencia."],
          ],
        },
        { type: 'h3', id: 'from-video', text: "O haz un video" },
        { type: 'p', text: "Los modelos de video (Veo, Kling, Sora, Hailuo y otros) mantienen al personaje mucho más consistente que un modelo de imágenes dibujando una cuadrícula. Pide un clip corto del personaje corriendo en el lugar, visto de lado, con cámara fija y fondo verde plano, y suelta el video en la pestaña Sprites. Los frames de un video no son pixel art: cambia el estilo de arte a **Cartoon** salvo que tu personaje esté dibujado con píxeles." },
        {
          type: 'steps',
          items: [
            "Suelta un archivo MP4 o WebM en la pestaña Sprites (un MOV solo funciona si tu navegador puede reproducirlo).",
            "En **Video a frames**, pulsa **Encontrar el ciclo**, o define tú el inicio y el fin. El fin no se incluye, así que el ciclo no repite su primer frame.",
            "Elige cuántos frames quieres (8 es un buen punto de partida) y revisa las miniaturas.",
            "Pulsa **Agregar frames**. Se ordenan como una hoja y siguen los mismos pasos que cualquier otra imagen: fondo, tamaño, frames y exportación.",
          ],
        },
      ],
    },
    {
      id: 'normalize',
      title: "Normalizar",
      blocks: [
        { type: 'p', text: "Abre la pestaña Sprites y suelta una o varias imágenes. De cada una, la herramienta detecta si es una **hoja de sprites** (varios frames) o un **sprite único** (un solo dibujo), y elige valores razonables. Cambia un ajuste solo cuando la vista previa o una advertencia te lo pida." },
        { type: 'p', text: "También puedes soltar un video corto: la herramienta convierte un rango que se repite en frames. Mira [O haz un video](#/guide/generate)." },
        { type: 'p', text: "Los ajustes siguen el orden en que piensas: estilo de arte, tamaño del sprite, tamaño del frame, frames y animaciones. Colores, fondo y avanzado quedan plegados hasta que los necesites. Con varias imágenes, la columna se divide en ajustes para todas las imágenes y ajustes solo para la elegida." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
        { type: 'h3', id: 'style', text: "Estilo de arte" },
        { type: 'p', text: "El interruptor de arriba de los ajustes tiene dos opciones." },
        { type: 'ul', items: [
          "**Pixel art** encuentra la cuadrícula real de píxeles, quita el desenfoque de la IA, mantiene los bordes duros y puede limitar la paleta.",
          "**Cartoon** redimensiona arte suave y mantiene bordes limpios con antialiasing.",
        ] },
        { type: 'p', text: "Por qué importa: la IA dibuja cada píxel de arte como un bloque borroso, y los bloques no miden todos lo mismo. Si lo redimensionas a mano, queda una mancha. La herramienta encuentra la cuadrícula una vez y redibuja cada frame sobre ella." },
        {
          type: 'figures',
          items: [
            { src: 'guide/knight-before.jpg', alt: "Hoja del caballero como la dibujó la IA: bloques borrosos sobre magenta.", caption: "Como lo dibujó la IA", pixelated: false },
            { src: 'guide/knight-after.png', alt: "El mismo caballero sobre la cuadrícula real: seis frames nítidos, fondo transparente.", caption: "Sobre la cuadrícula real: 32 px de alto, 16 colores", pixelated: true, backdrop: 'checker' },
          ],
        },
        { type: 'callout', title: "Ojo", text: "Si sale «No se encontró una cuadrícula de píxeles clara», la imagen no es pixel art o ya está en su tamaño original. Cambia a Cartoon." },
        { type: 'h3', id: 'size', text: "Tamaño del sprite y la regla de la misma altura" },
        { type: 'p', text: "El sprite es el dibujo de tu personaje. El **Tamaño del sprite** es su altura en píxeles. Elige uno de los valores listos (Original, 8, 16, 32, 64, 96, 128) o elige Otro y escribe el tuyo. La herramienta también muestra qué significa en tiles del juego, por ejemplo «= 2 tiles de 32 px», con el tamaño de tile que fijas en [Kit](#/guide/kit)." },
        { type: 'p', text: "Cada imagen de IA sale a su propia escala. Digamos que tu jugador y tu enemigo deberían medir lo mismo que una persona. La IA dibujó al caballero de 58 píxeles de arte de alto y al mago de 93. Ponlos lado a lado en tu juego y el mago parece un gigante." },
        {
          type: 'sameHeight',
          label: "Demo de la misma altura",
          raw: "Como los dio la IA",
          same: "Misma altura",
          knight: "Caballero",
          wizard: "Mago",
          ground: "Línea del suelo",
          caption: "Los mismos píxeles de arte, dibujados con el mismo zoom. Solo cambia la altura del personaje.",
        },
        { type: 'p', text: "Con **Original**, cada imagen conserva la altura que le dio la IA. Si tienes varias imágenes de alturas distintas, la herramienta te avisa y te ofrece un tamaño común con un botón. Entonces todos los personajes del lote se redimensionan a él. Un jefe o un enemigo pequeño recibe un tamaño relativo a esa altura, como 1.5 o 0.5." },
        { type: 'p', text: "La altura de una hoja se mide con la mayoría de sus frames. En un salto o un ataque agachado casi todos los frames son más bajos que el personaje de pie, y el personaje saldría más grande que en tus otras animaciones. La herramienta lo avisa: pulsa **Medir los frames más altos**, o elige **Altura del personaje según: los frames más altos**, y compara en **Todas juntas**. Si una animación generada aparte sigue un poco más grande, ajusta su **Tamaño relativo** (por ejemplo, 0.9)." },
        { type: 'callout', title: "Ojo", text: "Elige una altura menor que la que dibujó la IA. Reducir pixel art funciona bien. Ampliarlo vuelve los píxeles irregulares, y la herramienta te avisa." },
        { type: 'h3', id: 'frame-size', text: "Tamaño del frame" },
        { type: 'p', text: "El frame es el lienzo que ocupa cada cuadro de la animación. El sprite es el dibujo; el frame es la caja donde se apoya. Todos los frames miden lo mismo, el sprite queda centrado a los lados y sus pies caen sobre la misma línea. Eso evita que la animación se tambalee en tu juego, y es lo que permite que un motor corte tu hoja en piezas iguales." },
        {
          type: 'table',
          head: ["Ajuste", "Qué es", "Ejemplo"],
          rows: [
            ["Tamaño del sprite", "La altura del dibujo.", "32 px de alto"],
            ["Tamaño del frame", "La caja donde se apoya cada frame, con los pies en una línea.", "64 por 64 px"],
          ],
        },
        { type: 'ul', items: [
          "**Automático** elige el menor múltiplo de 32 donde quepan todos los frames.",
          "**A medida** te deja escribir un ancho y un alto, de 8 en 8 px y nunca menos de lo que cabe. Los personajes suelen ser más altos que anchos, por ejemplo 64 por 96. Los animales y los slimes necesitan frames más anchos. Los múltiplos de 32 funcionan bien en casi todos los motores.",
          "**Espacio bajo los pies** deja filas vacías debajo de los pies. Solo se aplica con un tamaño de frame a medida.",
        ] },
        { type: 'p', text: "Si una advertencia dice que un frame se corta en el borde, usa un tamaño de frame más grande, Automático, o un tamaño de sprite menor." },
        { type: 'h3', id: 'image-type', text: "Hoja de sprites o sprite único" },
        { type: 'p', text: "La herramienta detecta el tipo cuando sueltas la imagen y te dice lo que encontró. Si se equivocó, cámbialo en **Tipo de imagen**." },
        { type: 'ul', items: [
          "Una **hoja de sprites** tiene varios frames. Trae los ajustes de frames y animaciones, y las vistas Animación, Hoja final y Original.",
          "Un **sprite único** es un solo dibujo, por ejemplo un árbol o un personaje que no se mueve. No tiene animaciones, y tiene las vistas Sprite y Original.",
        ] },
        { type: 'p', text: "Un sprite único se exporta como sprite estático: un `Sprite2D` en Godot, un solo PNG en GDevelop y un `loadSprite` sin animaciones en Kaplay. El origen sigue en los pies." },
        { type: 'h3', id: 'frames', text: "Frames" },
        { type: 'ul', items: [
          "**Automático** encuentra cada frame por su cuenta y los numera desde 0 en orden de lectura.",
          "**Cuadrícula** corta la imagen en filas por columnas. Úsala cuando conozcas la disposición. Es la opción más fiable si la IA puso los frames en una cuadrícula pareja.",
        ] },
        { type: 'p', text: "Cuando la detección falla, dibuja los recuadros tú. En la vista **Original**, pulsa **Editar recuadros**. Arrastra un recuadro para moverlo y tira de una esquina para cambiar su tamaño. Las flechas mueven el recuadro elegido, Supr lo quita y **Añadir recuadro** dibuja uno nuevo. **Volver a automático** deshace tus recuadros." },
        { type: 'h3', id: 'animations', text: "Animaciones" },
        { type: 'p', text: "Cada animación tiene un nombre, un rango de frames como `0-5` o `0,2,4-6`, una velocidad en frames por segundo (FPS) y un interruptor de bucle. Deja el rango en blanco para usar todos los frames." },
        { type: 'p', text: "Una hoja puede tener varias animaciones. Por ejemplo, `idle` con los frames `0-3` y `walk` con los frames `4-9`. Las caminatas y los reposos hacen bucle. Un ataque normalmente no." },
        { type: 'p', text: "**Espejo** voltea una animación hacia el otro lado. **Crear versión espejo** agrega una animación nueva que es la imagen en espejo de esta. La IA dibuja a todos mirando a la derecha, así obtienes un `walk` hacia la izquierda sin dibujarlo de nuevo." },
        { type: 'p', text: "Los juegos vistos desde arriba dibujan un ciclo de caminata por dirección, uno por fila. Cuando los frames detectados están en 2 o más filas, **Una animación por fila** las crea por ti. Con 4 filas salen `walk_down`, `walk_left`, `walk_right` y `walk_up`. Con 3 filas (abajo, lado, arriba) el lado mira a la derecha y `walk_left` es su espejo. Con cualquier otro número de filas salen `anim_0`, `anim_1`… Reemplaza la lista de animaciones, así que púlsalo primero." },
        { type: 'h3', id: 'origin-role', text: "Origen: pies o centro" },
        { type: 'p', text: "Elige el **Origen** de cada imagen. **Pies** es para personajes: los pies de cada frame quedan en una misma línea. **Centro** es para efectos, proyectiles y cosas que flotan: cada frame queda centrado en el frame, así una explosión crece desde su centro, y el origen del sprite es el medio del frame. El espacio bajo los pies no se aplica a los sprites centrados." },
        { type: 'p', text: "Una imagen centrada se dimensiona por su frame más grande, no por el frame mediano: el tamaño de sprite que pongas es el lado más largo de su frame mayor." },
        { type: 'h3', id: 'collision', text: "Caja de colisión" },
        { type: 'p', text: "Cada sprite recibe un rectángulo de colisión automático. En un personaje, la base queda en la línea de los pies, la altura es la del personaje y el ancho es el cuerpo, así que una espada, una capa o un brazo extendido no lo ensanchan. En un efecto es un rectángulo centrado, un poco menor que el frame. Marca **Caja de colisión** bajo la animación para verla. Las exportaciones la usan: mira Godot, GDevelop y Kaplay." },
        { type: 'h3', id: 'frame-editor', text: "Arregla frames sueltos" },
        { type: 'p', text: "El editor de frames está bajo la tira de frames y actúa sobre el frame elegido. Puedes reordenar, duplicar o quitar frames, y empujar un frame un píxel cuando los pies saltan." },
        { type: 'table',
          head: ["Acción", "Atajo"],
          rows: [
            ["Mover el frame a la izquierda o a la derecha", "`[` y `]`"],
            ["Duplicar el frame", "`D`"],
            ["Quitarlo de la animación", "`Supr`"],
            ["Empujar el frame 1 px", "`Mayús` y las flechas"],
            ["Restablecer el empuje", "`0`"],
          ],
        },
        { type: 'p', text: "La IA repite poses a menudo. La herramienta lo detecta y dice, por ejemplo, «El frame 4 repite el 1», con un botón **Quitar duplicados**. Los frames repetidos hacen que la animación se trabe: quítalos o genera la pose de nuevo." },
        { type: 'h3', id: 'colours', text: "Colores y paletas" },
        { type: 'p', text: "Las imágenes de IA traen miles de tonos casi idénticos. Una paleta pequeña, compartida por todas las imágenes, hace que tus personajes parezcan vivir en el mismo mundo. Abre **Colores** y elige una." },
        { type: 'ul', items: [
          "**Colores originales** conserva lo que usó la IA.",
          "Una paleta lista: **PICO-8**, **Sweetie 16**, **Endesga 32** o **Game Boy**. Cada píxel pasa al color más cercano de la paleta.",
          "**Desde una imagen** saca la paleta de cualquier imagen que elijas, por ejemplo el arte conceptual de tu juego.",
          "**Reducir a N colores** crea una paleta de ese tamaño, compartida por todas las imágenes. Prueba con 16 o 32.",
          "**Mi propia paleta** es una paleta que armas tú: haz clic en un color para cambiarlo, agrega o quita colores, empieza desde una paleta lista o desde los colores de tus imágenes, pega una lista de códigos, o importa y exporta archivos `.hex`, `.gpl` y `.txt` (Lospec, GIMP, Paint.NET).",
        ] },
        { type: 'p', text: "Las paletas fijas solo funcionan con pixel art. Cartoon conserva los colores originales. La paleta que elijas también se aplica a tus tiles, y puedes cambiarla en [Kit](#/guide/kit)." },
        { type: 'h3', id: 'variants', text: "Variantes de color" },
        { type: 'p', text: "¿Necesitas un enemigo rojo y otro azul del mismo dibujo? En **Variantes de color**, haz clic en un color para cambiarlo. Luego pulsa **Duplicar como variante de color**. Conservas las dos versiones, listas para enemigos o equipos. Si un sprite tiene demasiados colores para cambiarlos uno a uno, redúcelos antes con una paleta." },
        { type: 'p', text: "Con varias imágenes, **Todas las imágenes** aplica el cambio de colores a todo el lote, o duplica cada imagen como variante de color con el nombre `nombre_rojo` (tú eliges el final). Solo cambian los colores que cada imagen tiene. Con una paleta fija también puedes cambiar toda la paleta por otra con la misma cantidad de colores, por ejemplo de PICO-8 a Sweetie 16, y obtener un juego completo de variantes de una vez." },
        { type: 'h3', id: 'background', text: "Fondo" },
        { type: 'p', text: "Auto usa el color más común del borde de la imagen. Tú puedes elegir cómo se quita." },
        { type: 'ul', items: [
          "**En todas partes (croma)** quita todos los píxeles cercanos al color, también los huecos entre un brazo y el cuerpo. Úsalo con claves magenta y verde.",
          "**Solo desde los bordes** quita solo el fondo que toca el borde. Úsalo con fondos blancos, para que la ropa blanca o crema se salve. En fondos claros también quita los bolsillos cerrados del mismo blanco plano, como el hueco entre los pies; los blancos pintados (ojos, dientes, brillos) tienen sombra y se quedan.",
        ] },
        { type: 'p', text: "Si desaparece una parte del personaje, baja la tolerancia. La próxima vez, usa la clave verde." },
        { type: 'h3', id: 'advanced', text: "Avanzado" },
        { type: 'p', text: "El **Ancla horizontal** decide dónde se centra cada sprite a los lados de su frame. El valor por defecto, la columna del cuerpo, ignora espadas y capas. Cámbialo solo si el personaje se tambalea de lado a lado." },
        { type: 'h3', id: 'check', text: "Revisa el resultado" },
        { type: 'p', text: "El escenario de la derecha tiene vistas. Una hoja de sprites tiene **Animación**, **Hoja final** y **Original**. Un sprite único tiene **Sprite** y **Original**. Con varias imágenes, **Todas juntas** va primero." },
        { type: 'ul', items: [
          "**Animación** reproduce tus frames sobre la línea de suelo amarilla, con zoom y papel cebolla. La línea de suelo y el origen muestran dónde van los pies (una cruz en el centro para los sprites centrados). **Caja de colisión** dibuja la caja de colisión automática sobre el frame.",
          "**Hoja final** es el PNG que exportas.",
          "**Original** muestra tu imagen con los frames detectados en magenta, numerados desde 0.",
        ] },
        { type: 'p', text: "Bajo el escenario, la línea de estado muestra los frames, el píxel que usó la IA, la altura y los colores. Cada advertencia trae un botón que aplica el arreglo: un tamaño de frame más grande, el modo cuadrícula, una tolerancia menor." },
        { type: 'h3', id: 'all-together', text: "Todas juntas: la prueba de la misma escala" },
        { type: 'p', text: "Con dos o más imágenes, **Todas juntas** pone cada imagen lado a lado sobre una sola línea de suelo, con el mismo zoom, con su nombre y su altura debajo. Si un personaje se ve muy grande o muy pequeño aquí, se verá así en tu juego. Elige un tamaño de sprite común y mira de nuevo." },
        { type: 'h3', id: 'export', text: "Exportar" },
        { type: 'p', text: "Bajo el escenario, elige el motor y pulsa **Descargar para Godot 4** (o GDevelop 5, Kaplay, Otro). **Todos los motores** pone una carpeta por motor en el ZIP. Con un lote, el botón descarga todas las imágenes, y puedes elegir descargar solo la elegida. **Solo el PNG** te da únicamente la hoja." },
      ],
    },
    {
      id: 'godot',
      title: "Godot 4",
      blocks: [
        { type: 'p', text: "El ZIP trae una carpeta `<nombre>/`. Una hoja de sprites trae cuatro archivos: la hoja `<nombre>.png`, un recurso `SpriteFrames` `<nombre>.tres`, una escena lista `<nombre>.tscn` con un `AnimatedSprite2D`, y un `README.txt`. Un sprite único trae en cambio una escena `Sprite2D`, sin `.tres`." },
        { type: 'h3', id: 'godot-add', text: "Añade el personaje a tu proyecto" },
        {
          type: 'steps',
          items: [
            "Copia la carpeta `godot/<nombre>/` completa a tu proyecto, por ejemplo a `res://personajes/<nombre>/`. Mantén los archivos juntos: el `.tres` carga el PNG con una ruta relativa.",
            "Espera a que Godot termine de importar los archivos.",
            "Arrastra `<nombre>.tscn` a tu escena. Todas las animaciones están listas, con su fps y su bucle, y la primera se reproduce al iniciar el juego.",
            "En pixel art, abre **Project Settings**, ve a **Rendering > Textures** y pon **Default Texture Filter** en **Nearest**. La escena ya usa Nearest, pero el resto de tu proyecto también lo necesita.",
          ],
        },
        { type: 'callout', title: "Ojo", text: "Si Godot muestra un error la primera vez, espera a que termine la importación. Si sigue, elige **Project > Reload Current Project** y comprueba que el PNG se importe como Texture2D." },
        { type: 'h3', id: 'godot-feet', text: "El origen está en los pies" },
        { type: 'p', text: "La escena coloca el sprite con su origen en los pies del personaje. Cuando pones el nodo en una posición, los pies quedan en ese punto. Las imágenes con origen **Centro** (efectos, proyectiles) quedan centradas en el nodo." },
        { type: 'h3', id: 'godot-body', text: "Una escena con caja de colisión" },
        { type: 'p', text: "Junto a `<name>.tscn` hay un `<name>_body.tscn`: un `CharacterBody2D` con el mismo sprite y un `CollisionShape2D` con un rectángulo ya colocado sobre el cuerpo. Úsalo para el jugador o un enemigo. La forma es un `RectangleShape2D` normal: cambia su tamaño si quieres una caja más ajustada." },
        { type: 'h3', id: 'godot-code', text: "Reproduce las animaciones desde código" },
        { type: 'p', text: "Añade la escena como hija de un `CharacterBody2D`. Los nombres de las animaciones son los que pusiste en la herramienta." },
        {
          type: 'code',
          lang: 'gdscript',
          title: "player.gd",
          code: `extends CharacterBody2D

const SPEED := 120.0

@onready var sprite: AnimatedSprite2D = $Hero  # el nodo de <nombre>.tscn

func _physics_process(_delta: float) -> void:
	var dir := Input.get_axis("ui_left", "ui_right")
	velocity.x = dir * SPEED
	if dir != 0.0:
		sprite.flip_h = dir < 0.0  # la IA dibuja mirando a la derecha
		sprite.play("walk")
	else:
		sprite.play("idle")
	move_and_slide()
`,
        },
        { type: 'p', text: "También puedes usar solo el `.tres` en tu propio `AnimatedSprite2D`. El `.tres` no lleva el desplazamiento de los pies: el `.tscn` sí. Prefiere el `.tscn`." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
      ],
    },
    {
      id: 'gdevelop',
      title: "GDevelop 5",
      blocks: [
        { type: 'p', text: "El ZIP trae una carpeta por imagen con sus frames ya cortados: `<nombre>/<nombre>_<animación>_00.png`, `_01.png`… (si tu hoja tiene una sola animación sin nombre, `<nombre>_00.png`…), y un `README.txt` con el origen y los fps. Así eliges todos los frames de una animación de una vez." },
        {
          type: 'table',
          head: ["Método", "Archivos que usas", "Sirve para"],
          rows: [
            ["Frames", "`<nombre>_<animación>_00.png`, `_01.png`…", "Lo normal. No hay nada más que aprender."],
            ["Spritesheet con Piskel", "`<nombre>/spritesheets/<nombre>_<animación>.png`, una fila por animación. Solo si marcas **Incluir también spritesheets para Piskel** al exportar.", "Si quieres retocar los frames en Piskel."],
          ],
        },
        { type: 'h3', id: 'gdevelop-frames', text: "Método A: frames" },
        {
          type: 'steps',
          items: [
            "Crea un objeto **Sprite**. Ponle el nombre de tu personaje.",
            "Por cada animación, añade una animación, pulsa **Añadir imágenes** y selecciona de una vez todos los PNG de esa animación (los que empiezan por `<nombre>_<animación>_`). GDevelop los añade por orden de nombre, y por eso los archivos van numerados.",
            "Pon el tiempo entre frames en `1 / fps`. A 10 fps son `0.1` segundos. Activa o desactiva el **Bucle** como lo elegiste en la herramienta.",
          ],
        },
        { type: 'h3', id: 'gdevelop-piskel', text: "Método B: spritesheet con Piskel" },
        {
          type: 'steps',
          items: [
            "En el objeto **Sprite**, añade una animación y ábrela con **Editar con Piskel**.",
            "En Piskel, elige **Importar**, escoge `<nombre>/spritesheets/<nombre>_<animación>.png` y elige **Importar como spritesheet**. (Para tenerlo, marca **Incluir también spritesheets para Piskel** antes de descargar.)",
            "Escribe el tamaño de frame. Es el tamaño de frame que elegiste en la herramienta, por ejemplo 32 por 32.",
            "Guarda y cierra Piskel. Los frames aparecen en la animación.",
            "Pon el tiempo entre frames en `1 / fps` y el bucle, como en el método A.",
          ],
        },
        { type: 'callout', title: "Consejo al volver a importar", text: "GDevelop copia las imágenes que eliges a la carpeta de tu proyecto. Si después borras el sprite o sus imágenes **dentro de GDevelop**, los PNG siguen en esa carpeta. Al importar de nuevo, GDevelop encuentra esos nombres ocupados, renombra las copias (`_002`, `_013`…) y puede repetir frames o dejar un dibujo cortado. Antes de reimportar, borra también los PNG viejos de la carpeta del proyecto. Otra opción: descomprime el ZIP dentro de la carpeta del proyecto (por ejemplo en `sprites/`), elige las imágenes desde ahí y, para actualizar, vuelve a descomprimir encima." },
        { type: 'callout', title: "Ojo", text: "Los nombres de menú de arriba siguen GDevelop 5 tal como era cuando escribimos esta guía. Si los tuyos difieren, el `README.txt` de cada carpeta trae los mismos pasos con los valores exactos de tu hoja." },
        { type: 'p', text: "Un sprite único es más simple: el ZIP trae un solo PNG, `<nombre>/<nombre>.png`. Agrégalo a la única animación del objeto Sprite." },
        { type: 'h3', id: 'gdevelop-origin', text: "Pon el punto de origen en los pies" },
        { type: 'p', text: "Por defecto el origen es la esquina superior izquierda. Entonces un objeto colocado en (x, y) cuelga de esa esquina, y el personaje se desplaza cuando lo volteas o lo escalas. Pon el punto **Origin** en los pies." },
        {
          type: 'steps',
          items: [
            "Abre el editor de **Puntos** del Sprite.",
            "Pon el punto **Origin** (Origen) en el valor del `README.txt`. Es la mitad del ancho del frame hacia la derecha y la fila de los pies hacia abajo. Para un frame de 32 por 32 sin espacio bajo los pies, es (16, 31).",
            "Marca **Aplicar los mismos puntos a todos los fotogramas**, para que todas las animaciones queden alineadas.",
          ],
        },
        { type: 'h3', id: 'gdevelop-collision', text: "Define la máscara de colisión" },
        { type: 'p', text: "El `README.txt` lista los 4 puntos de la caja de colisión automática, en píxeles de la imagen con (0, 0) en la esquina superior izquierda. Abre el editor de **máscara de colisión** de la animación, elige una máscara personalizada, arrastra las esquinas del rectángulo hasta esos puntos y marca **Usar las mismas máscaras de colisión para todas las animaciones / fotogramas**. Sin eso, GDevelop usa la imagen completa, márgenes vacíos incluidos. En las imágenes con origen **Centro**, el punto de origen es el medio del frame." },
        { type: 'h3', id: 'gdevelop-nearest', text: "Mantén nítido el pixel art" },
        { type: 'p', text: "En las propiedades del juego, pon **Modo de escalado (también llamado muestreo)** en **Nearest (sin antialiasing)**. Activa el **Redondeo de píxeles** si la cámara se mueve. Para arte suave tipo cartoon, deja el valor por defecto, Linear." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
      ],
    },
    {
      id: 'kaplay',
      title: "Kaplay",
      blocks: [
        { type: 'p', text: "El ZIP trae `<nombre>.png` y `<nombre>.js`. El `.js` tiene la llamada a `loadSprite` lista para pegar." },
        { type: 'p', text: "La hoja tiene una fila por animación. Cada animación empieza en `from = fila × columnas`. Por eso el fragmento corta la hoja con `sliceX` y `sliceY`." },
        {
          type: 'code',
          lang: 'js',
          title: "main.js",
          code: `// Pixel art: render nítido, sin suavizado.
kaplay({ crisp: true, texFilter: "nearest" });

loadSprite("hero", "hero.png", {
  sliceX: 6,
  sliceY: 2,
  anims: {
    idle: { from: 0, to: 3, loop: true, speed: 6 },
    walk: { from: 6, to: 11, loop: true, speed: 10 },
  },
});

// anchor("bot") pone el origen en los pies.
const hero = add([
  sprite("hero", { anim: "idle" }),
  pos(160, 120),
  anchor("bot"),
]);

onKeyDown("right", () => { hero.move(120, 0); hero.flipX = false; });
onKeyDown("left", () => { hero.move(-120, 0); hero.flipX = true; });
onKeyPress(["left", "right"], () => hero.play("walk"));
onKeyRelease(["left", "right"], () => hero.play("idle"));
`,
        },
        { type: 'p', text: "Un sprite único recibe un simple `loadSprite(\"nombre\", \"nombre.png\")`, sin `sliceX` ni `anims`, y el mismo `anchor(\"bot\")`." },
        { type: 'callout', title: "Ojo", text: "Si el frame tiene espacio bajo los pies, el fragmento lo suma a `y`, así los pies, y no el borde del frame, quedan sobre `pos`." },
        { type: 'p', text: "El fragmento también trae una línea `area({ shape: new Rect(vec2(x, y), w, h) })` con la caja de colisión automática, así puedes usar colisiones de inmediato. Las imágenes con origen **Centro** usan `anchor(\"center\")` en vez de `anchor(\"bot\")`." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
      ],
    },
    {
      id: 'other',
      title: "Otros motores",
      blocks: [
        { type: 'p', text: "El ZIP de **Otro** sirve para cualquier motor que lea hojas de Aseprite o que corte una hoja por tamaño de frame." },
        { type: 'ul', items: [
          "`<nombre>.png` es la hoja, con una fila por animación.",
          "`<nombre>.json` está en el formato de Aseprite: el rectángulo de cada frame, su duración en milisegundos y una etiqueta por animación.",
          "`frames/<nombre>/<animación>_00.png` y siguientes: un PNG por frame, para los motores que piden imágenes sueltas.",
        ] },
        { type: 'h3', id: 'other-how', text: "Por dónde empezar en cada motor" },
        {
          type: 'table',
          head: ["Motor", "Qué usar"],
          rows: [
            ["Phaser", "Carga el PNG y el JSON como un atlas de Aseprite (`load.aseprite`) y crea las animaciones a partir de sus etiquetas. Revisa la documentación de Phaser para tu versión."],
            ["Unity", "Importa el PNG, pon **Sprite Mode** en **Multiple**, abre el **Sprite Editor** y corta con **Grid By Cell Size**, con el tamaño de frame de la herramienta."],
            ["Defold", "Añade los PNG por frame a un atlas y agrúpalos en animaciones, o crea una fuente de tiles desde la hoja con el tamaño de frame."],
            ["Construct", "Importa los PNG por frame en la animación de un objeto. También importa una tira de sprites."],
            ["Cualquier otro", "Corta la hoja por tamaño de frame. Mira abajo."],
          ],
        },
        { type: 'callout', title: "Ojo", text: "Conocemos estos motores menos que Godot, GDevelop y Kaplay, y sus menús cambian entre versiones. Toma los nombres de arriba como una pista y revisa la documentación del propio motor." },
        { type: 'h3', id: 'other-slice', text: "Corta la hoja tú mismo" },
        { type: 'p', text: "Sirve cualquier motor que corte una hoja en frames iguales. Usa el tamaño de frame y el número de columnas de la herramienta. La animación número `k` es la fila `k`, y el frame `i` es la columna `i`. Pon el origen en los pies: la mitad del ancho del frame hacia la derecha y `alto del frame − 1 − espacio bajo los pies` hacia abajo." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
      ],
    },
    {
      id: 'world',
      title: "Escenario",
      blocks: [
        { type: 'p', text: "La pestaña Escenario construye el suelo y el paisaje de tu juego. Tiene tres herramientas, en el mismo orden que en la pestaña: **Hoja de tiles** limpia una hoja de tiles hecha por la IA, **Transiciones de terreno** dibuja los tiles de borde y esquina entre dos terrenos, y **Fondo con parallax** convierte imágenes en capas que se mueven detrás de tu personaje. Elige la herramienta arriba en la pestaña. Las monedas, llaves e íconos tienen su propia pestaña: [Objetos](#/guide/items)." },
        { type: 'h3', id: 'tile-sheet', text: "Limpia una hoja de tiles" },
        {
          type: 'steps',
          items: [
            "Agrega una imagen con varios tiles en filas y columnas. Prueba el ejemplo de las montañas andinas.",
            "Elige el tamaño del tile: de 8 a 128 px, o el que quieras.",
            "Revisa la cuadrícula. La herramienta detecta columnas y filas por los huecos vacíos entre tiles. Si las líneas de corte se ven mal, desmarca **Detectar columnas y filas automáticamente** y escribe las columnas y filas.",
            "Elige un formato (Godot 4, Tiled / GDevelop o PNG) o todos los formatos, y descarga.",
          ],
        },
        {
          type: 'figures',
          items: [
            { src: 'guide/tileset-before.jpg', alt: "Una hoja de tiles dibujados por la IA: plataformas con pasto, agua, puentes, chozas y plantas sobre blanco.", caption: "La hoja de la IA", pixelated: false },
            { src: 'guide/tileset-atlas.png', alt: "Los mismos tiles en una cuadrícula exacta de tiles de 32 por 32 píxeles con fondo transparente.", caption: "El atlas: cada tile de exactamente 32 por 32", pixelated: true, zoom: 2, backdrop: 'checker' },
          ],
        },
        { type: 'p', text: "Cada tile se remuestrea a exactamente el tamaño que elegiste y se quita el fondo. Los tiles vacíos se tachan y quedan fuera del tileset." },
        { type: 'p', text: "En Godot, copia `godot/<nombre>/` a tu proyecto, asigna el `.tres` a un `TileMapLayer` y pinta. En GDevelop, usa el objeto **Tilemap** con el archivo `.tsx` (formato Tiled) y el PNG del atlas. Tiled y LDtk abren el `.tsx` como un tileset." },
        { type: 'h3', id: 'terrains', text: "Transiciones de terreno" },
        { type: 'p', text: "El pasto junto a la tierra necesita tiles de borde y de esquina. Esta herramienta los dibuja por ti a partir de dos texturas." },
        {
          type: 'steps',
          items: [
            "Agrega la textura **A**, el terreno base, y la textura **B**, que se pinta sobre A. Las dos deben ser cuadradas y sin costuras. Marca **Sin textura B: pintar A sobre transparente** para crear una capa superpuesta que puedes apilar sobre cualquier terreno.",
            "Elige la disposición, **Blob 47 (Godot)** o **Dual 16 (GDevelop)** (mira abajo) y ajusta el estilo del borde: margen, suavidad, irregularidad, semilla, contorno.",
            "Pulsa **Mezclar mapa** en el mapa de prueba. Debe verse conectado por todas partes. **Costuras en A** y **Costuras en B** te dicen si cada textura se repite limpia.",
            "Pulsa **Descargar ZIP**: el PNG del atlas, un `TileSet` de Godot con los datos de terreno ya llenos y un README con la tabla de tiles.",
          ],
        },
        { type: 'p', text: "Pídele a la IA texturas que se repitan en los dos ejes: el borde izquierdo continúa en el derecho, y el de arriba en el de abajo." },
        {
          type: 'figures',
          items: [
            { src: 'guide/terrain-map.png', alt: "Un mapa de prueba de pasto con una franja diagonal de tierra, con bordes y esquinas suaves entre ambos.", caption: "El mapa de prueba: tierra sobre pasto", pixelated: true, zoom: 2 },
          ],
        },
        { type: 'h3', id: 'layouts', text: "Blob 47 o Dual 16" },
        {
          type: 'table',
          head: ["Disposición", "Tiles", "Úsala con"],
          rows: [
            ["Blob 47", "47 tiles, uno por cada patrón de los 8 vecinos", "Terrains de Godot. Godot elige el tile correcto para cada casilla."],
            ["Dual 16", "16 tiles, uno por cada patrón de las 4 esquinas", "GDevelop, o Godot con el addon TileMapDual. Mucho más fácil de pintar a mano."],
          ],
        },
        {
          type: 'figures',
          items: [
            { src: 'guide/terrain-blob47.png', alt: "El atlas Blob 47: 8 por 6 tiles con todas las combinaciones de borde y esquina de tierra sobre pasto.", caption: "Blob 47", pixelated: true, zoom: 2 },
            { src: 'guide/terrain-dual16.png', alt: "El atlas Dual 16: 4 por 4 tiles, uno por cada combinación de cuatro esquinas.", caption: "Dual 16", pixelated: true, zoom: 2 },
          ],
        },
        { type: 'p', text: "En Dual 16 cada tile queda a medio tile de distancia de las casillas de tu mapa. Así bastan 16 tiles." },
        { type: 'h3', id: 'paint-godot', text: "Pinta con Terrains en Godot" },
        {
          type: 'steps',
          items: [
            "Copia `godot/<nombre>/` a tu proyecto, por ejemplo a `res://tiles/<nombre>/`.",
            "Añade un `TileMapLayer` y pon su **Tile Set** en `<nombre>.tres`.",
            "Abre el panel **TileMap** y ve a la pestaña **Terrains**.",
            "Elige el terreno y pinta. Godot escoge el tile de borde correcto en cada casilla. En pixel art, pon **Texture Filter** en **Nearest**.",
          ],
        },
        { type: 'p', text: "Dual 16 necesita la lógica dual-grid del addon TileMapDual (MIT, disposición Standard), o colocas los tiles a mano." },
        { type: 'h3', id: 'paint-gdevelop', text: "Pinta en GDevelop" },
        { type: 'p', text: "El atlas Dual 16 no trae datos de terreno. Importa el PNG como atlas de tilemap con tu tamaño de tile y las columnas que indica el README, y coloca los tiles a mano. El README trae una tabla que dice qué tile va en cada patrón de esquinas." },
        { type: 'h3', id: 'parallax', text: "Fondo con parallax" },
        { type: 'p', text: "Un fondo con parallax se hace con capas (cielo, colinas, árboles) que se mueven a distinta velocidad cuando la cámara avanza, y así la escena se ve con profundidad. La herramienta **Fondo con parallax** convierte imágenes de IA en capas que se repiten hacia los lados, del tamaño de tu juego." },
        {
          type: 'steps',
          items: [
            "Añade de 1 a 4 imágenes, de la más lejana a la más cercana. Ordénalas con las flechas. Las capas lejanas tienen una **Velocidad** baja (0,2) y las cercanas una alta (0,8). 0 se queda quieta y 1 se mueve con la cámara.",
            "En las capas cercanas sobre un color liso (magenta) puedes quitar el fondo, así se ven las capas de atrás.",
            "El alto de cada capa es el alto de la pantalla de tu juego (el que eliges en [Kit](#/guide/kit)). El ancho sigue a la imagen. El pixel art conserva su propia cuadrícula: se amplía por un número entero (por ejemplo ×2) y se rellena o se corta la parte de arriba para que la capa tenga el alto de tu juego.",
            "Con **Hacer que se repita hacia los lados** activado, el borde derecho se une al izquierdo por un corte escondido, así nada salta cuando la capa se repite. Compruébalo en **Repetición**: la capa se ve dos veces y una línea marca la unión. Si la imagen ya da la vuelta por su borde (un árbol partido en dos), se deja como está. Si una advertencia dice que todavía no se une bien, usa una unión más ancha.",
            "Mira la vista **Movimiento**, elige tu motor y descarga.",
          ],
        },
        { type: 'p', text: "Godot (4.3 o más nuevo) recibe una escena con un `Parallax2D` por capa. GDevelop recibe los PNG y un README: cada capa es un Tiled Sprite con la extensión “Parallax for Tiled Sprite”. Kaplay recibe un código que dibuja todas las capas. Otro recibe los PNG y un JSON con el tamaño y la velocidad de cada capa." },
        { type: 'actions', items: [{ to: 'world', label: "Abrir Escenario" }] },
      ],
    },
    {
      id: 'items',
      title: "Objetos",
      blocks: [
        { type: 'p', text: "La pestaña Objetos es para los objetos pequeños de tu juego: monedas, pociones, llaves, gemas e íconos de interfaz. La IA dibuja muchos en una imagen; esta pestaña le da a cada uno una casilla del mismo tamaño." },
        { type: 'h3', id: 'items-icons', text: "Objetos e íconos" },
        { type: 'p', text: "La herramienta encuentra cada objeto separado y lo pone en una casilla del tamaño que elijas: la misma casilla para todos, con el arte centrado y sin deformarlo." },
        {
          type: 'steps',
          items: [
            "Agrega la imagen (o prueba el ejemplo). Se quita el fondo y cada forma separada se vuelve un objeto. Los objetos se numeran en orden de lectura.",
            "Elige el **Tamaño de casilla** y cómo se escalan los objetos. **Mantener tamaños relativos** les da una sola escala, así una moneda sigue siendo más pequeña que una espada. **Cada objeto llena su casilla** hace cada objeto lo más grande posible, ideal para íconos.",
            "En **Original**, haz clic en un objeto para tacharlo y dejarlo fuera del atlas (una mancha suelta, o un objeto mucho más grande que el resto). En **Atlas**, ponle nombre a cada objeto.",
            "Pulsa **Descargar**. Godot recibe un `.tres` por objeto (un AtlasTexture del atlas), GDevelop un PNG por objeto, Kaplay un fragmento con `loadSpriteAtlas` y Otro el PNG del atlas, un JSON con los rectángulos y los PNG sueltos.",
          ],
        },
        { type: 'p', text: "El pixel art nunca se agranda: los objetos más pequeños que la casilla se quedan a su tamaño real, centrados. Si un objeto está hecho de piezas muy separadas, desmarca **Encontrar las formas separadas automáticamente** y escribe las columnas y filas de la hoja." },
        { type: 'actions', items: [{ to: 'items', label: "Abrir Objetos" }] },
      ],
    },
    {
      id: 'kit',
      title: "Kit",
      blocks: [
        { type: 'p', text: "La pestaña Kit junta todo lo de tu juego: los sprites de Sprites, el escenario (tiles y fondo) de Escenario y los objetos de Objetos. Importa porque sprites y tiles deben coincidir en escala. Si no, tu personaje se ve demasiado grande para tu suelo." },
        { type: 'h3', id: 'kit-tile', text: "Tamaño del tile del juego" },
        { type: 'p', text: "Elige el tamaño de la cuadrícula sobre la que se construye tu juego: 16, 32, 48 o 64 px. Los sprites muestran entonces su altura en tiles, y tus tiles se comparan con ella. Si un set de tiles usa otro tamaño, el Kit te avisa y ofrece un botón para usar ese tamaño en el juego." },
        { type: 'h3', id: 'kit-palette', text: "Paleta compartida" },
        { type: 'p', text: "Es la misma paleta de **Colores** en Sprites. Una paleta fija también se aplica a tus tiles, así sprites y suelo usan los mismos colores." },
        { type: 'h3', id: 'kit-preview', text: "Vista previa a escala real" },
        { type: 'p', text: "La vista previa pone tus sprites sobre una fila de tus tiles, a una sola escala. Si aquí se ve bien, se verá bien en tu juego. Necesita un atlas de tiles o un terreno de Escenario para dibujar el suelo." },
        { type: 'h3', id: 'kit-resolution', text: "Resolución del juego" },
        { type: 'p', text: "Es el tamaño de la pantalla de tu juego antes de ampliarla al monitor. Elige una que se amplíe a la pantalla por un número entero: 640×360 por 3 es justo 1920×1080. Una fracción, como ×1,5, deja los píxeles borrosos o desiguales. El tamaño del tile y la altura del personaje deben ir con la resolución:" },
        {
          type: 'table',
          head: ["Juego", "Tile", "Personaje", "Full HD", "4K"],
          rows: [
            ["320×180", "16 px", "24 a 32 px", "×6", "×12"],
            ["640×360", "32 px", "48 a 64 px", "×3", "×6"],
            ["960×540", "48 px", "72 a 96 px", "×2", "×4"],
            ["1280×720", "64 px", "112 a 144 px", "no entero", "×3"],
          ],
        },
        { type: 'h3', id: 'kit-level', text: "Nivel de prueba" },
        { type: 'p', text: "Pulsa **Jugar** en la tarjeta Nivel de prueba para caminar, correr y saltar con tu personaje sobre tu suelo, antes de exportar. Corre en la librería real de Kaplay a la resolución de tu juego, con la misma hoja, animaciones, pies y caja de colisión que tiene la exportación de Kaplay. Si el personaje se ve demasiado grande, flota o va muy rápido, arréglalo aquí y no en tu motor." },
        { type: 'ul', items: [
          "Elige qué animación se reproduce al estar quieto, caminar, correr y en el aire. Los nombres se adivinan por ti, y cada una puede venir de una imagen distinta.",
          "Elige el tile del suelo. Los sprites se paran en la primera fila sólida del tile, así que las briznas de pasto arriba no los hacen flotar.",
          "Muévete con las flechas o A y D, corre con Shift, salta con Espacio, W o flecha arriba, y cierra con Esc.",
        ] },
        { type: 'h3', id: 'kit-download', text: "Descarga el kit" },
        {
          type: 'steps',
          items: [
            "Elige el motor y pulsa **Descargar el kit para Godot 4** (o el motor que uses).",
            "Descomprime el archivo en la carpeta de tu proyecto. Las carpetas `sprites/`, `tiles/`, `items/` y `backgrounds/` mantienen cada parte junta (cada carpeta aparece solo si hiciste esa parte).",
            "Lee `README.txt`. Lista la altura de cada sprite, los tamaños de frame, el tamaño de tile y la paleta.",
          ],
        },
        {
          type: 'table',
          head: ["Motor", "Qué trae el kit"],
          rows: [
            ["Godot 4", "Una escena por cada sprite, y el `TileSet` `.tres` para asignar a un `TileMapLayer`."],
            ["GDevelop 5", "Las carpetas de los sprites, y el PNG del atlas de tiles con un `.tsx` de Tiled para el objeto Tilemap."],
            ["Kaplay", "Un fragmento `.js` por cada sprite. Los tiles se cargan como un sprite cortado: frame = fila × columnas + columna."],
            ["Otro", "La hoja con su JSON de Aseprite, y el atlas de tiles con un `.tsx` de Tiled."],
          ],
        },
        { type: 'actions', items: [{ to: 'kit', label: "Abrir Kit" }] },
      ],
    },
    {
      id: 'troubleshooting',
      title: "Solución de problemas",
      blocks: [
        { type: 'p', text: "Busca tu problema en la primera columna. La mayoría de las advertencias de la herramienta ya traen un botón con el arreglo." },
        {
          type: 'table',
          head: ["Problema", "Qué hacer"],
          rows: [
            ["La imagen se detectó con el tipo equivocado", "Cámbialo en **Tipo de imagen**: hoja de sprites o sprite único."],
            ["El número de frames es incorrecto", "Usa **Cuadrícula** con las filas y columnas de la imagen. Si motas de fondo se convirtieron en frames, sube la tolerancia. También puedes dibujar los recuadros tú con **Editar recuadros** en la vista Original."],
            ["Desaparece una parte del personaje", "La eliminación del fondo se la llevó. Baja la tolerancia, o usa **Solo desde los bordes**. La próxima vez, genera con la clave verde."],
            ["Un frame se corta en el borde del frame", "Usa un tamaño de frame más grande o Automático. Los personajes anchos necesitan frames más anchos. También sirve un tamaño de sprite menor."],
            ["Mi jugador y mi enemigo tienen tamaños distintos", "Elige un tamaño de sprite común. Mira [Tamaño del sprite](#/guide/size)."],
            ["La herramienta dice que el sprite se reduce mucho", "La IA dibujó el personaje mucho más grande que tu tamaño de sprite. Pide un personaje más pequeño, de unos 32 píxeles de arte, para un resultado más nítido."],
            ["«No se encontró una cuadrícula de píxeles clara»", "La imagen no es pixel art, así que usa Cartoon. O ya está en su tamaño original."],
            ["Los frames se repiten o el personaje cambia", "La IA repitió una pose. Pulsa **Quitar duplicados**, o genera de nuevo con una imagen de referencia del personaje."],
            ["Los pies saltan entre frames", "Elige el frame y empújalo con el editor de frames: `Mayús` y las flechas."],
            ["El personaje mira hacia el lado equivocado", "Usa **Crear versión espejo** en la animación. Obtienes la otra dirección sin dibujarla."],
            ["El pixel art se ve borroso en el motor", "Pon el filtro Nearest: **Default Texture Filter** en Godot, **Modo de escalado** en GDevelop, `texFilter: \"nearest\"` en Kaplay."],
            ["El personaje flota, se hunde o salta al cambiar de animación", "El origen no está en los pies. Pon el punto **Origin** en GDevelop, o usa `anchor(\"bot\")` en Kaplay."],
            ["Godot muestra un error en el `.tres`", "Espera a la importación y recarga el proyecto. Comprueba que el PNG se importe como Texture2D."],
            ["La cuadrícula de tiles es incorrecta", "Desmarca **Detectar columnas y filas automáticamente** y escribe las columnas y filas."],
            ["Los tiles muestran costuras al repetirse", "La textura no es continua. Mira **Costuras en A** y **Costuras en B**, y genera la textura de nuevo pidiendo una repetible."],
            ["Los sprites y los tiles no encajan", "Fija el tamaño de tile del juego en [Kit](#/guide/kit-tile) y usa el mismo tamaño en tus tiles. El Kit te dice qué set de tiles es distinto."],
          ],
        },
      ],
    },
    {
      id: 'glossary',
      title: "Glosario",
      blocks: [
        {
          type: 'dl',
          items: [
            { term: "Sprite", text: "Una imagen 2D de un personaje o de un objeto de un juego." },
            { term: "Tamaño del sprite", text: "La altura del dibujo, en píxeles. El mismo tamaño de sprite da la misma escala en tu juego." },
            { term: "Hoja de sprites", text: "Una imagen que contiene todos los frames de un sprite, en filas y columnas." },
            { term: "Sprite único", text: "Un solo dibujo sin animación, como un árbol. Se exporta como sprite estático." },
            { term: "Frame", text: "Un cuadro de una animación. Un ciclo de caminata tiene seis u ocho." },
            { term: "Tamaño del frame", text: "La caja donde se apoya cada frame. Todos los frames miden lo mismo, con los pies en una línea, así el motor puede cortar la hoja de forma pareja." },
            { term: "Origen (pivote)", text: "El punto de la imagen que queda en la posición del objeto. Aquí está en los pies, así un personaje colocado en (x, y) pisa ese punto." },
            { term: "Pixel art y cuadrícula de píxeles", text: "El pixel art se dibuja un píxel cuadrado a la vez. Un píxel de arte es uno de esos cuadrados. Las imágenes de IA los dibujan como bloques borrosos, así que la herramienta encuentra la cuadrícula y los redibuja." },
            { term: "Paleta", text: "El conjunto de colores de una imagen. El pixel art usa una pequeña, de 16 o 32 colores. En la herramienta, una paleta se comparte entre todas las imágenes y los tiles." },
            { term: "Variante de color", text: "Una copia de un sprite con algunos colores cambiados, por ejemplo un enemigo azul hecho a partir de uno rojo." },
            { term: "Croma (chroma key)", text: "Un color plano, magenta o verde, que usas de fondo para quitarlo con facilidad." },
            { term: "Filtro Nearest", text: "Una forma de escalar una imagen que copia el píxel más cercano y no difumina. Mantiene nítido el pixel art." },
            { term: "Tile y atlas", text: "Un tile es un cuadrito del mapa. Un atlas es una imagen que contiene muchos tiles." },
            { term: "Autotile (terreno)", text: "Un conjunto de tiles con bordes y esquinas que el motor elige por ti, para que el pasto se una con la tierra sin cortes." },
            { term: "Kit", text: "Tus sprites, escenario, objetos y paleta en una sola exportación, con una sola escala." },
          ],
        },
      ],
    },
  ],
  reference: {
    text: "La guía escrita original sigue en GitHub como referencia.",
    link: "Abrir la guía en GitHub",
    href: 'https://github.com/alex-roc/align-sprites/blob/main/docs/es.md',
  },
  credits: {
    title: "Créditos",
    lines: [
      "Hecho por Alex Ojeda Copa, Lab TecnoSocial.",
      "La detección de la cuadrícula de píxeles usa [unfake.js](https://github.com/jenissimo/unfake.js), de Eugeniy Smirnov, con licencia MIT. [Lee el aviso de su licencia](https://github.com/jenissimo/unfake.js/blob/main/LICENSE).",
      "align-sprites es software libre con licencia GPL-3.0. [Lee la licencia](https://github.com/alex-roc/align-sprites/blob/main/LICENSE).",
    ],
  },
};
