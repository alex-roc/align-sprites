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
            { title: "Celdas", text: "Cada frame va en una celda del mismo tamaño, centrado y con los pies sobre la línea." },
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
          afterAlt: "El mismo mago después de align-sprites: píxeles nítidos, fondo transparente, celda de 64 por 64 píxeles.",
          caption: "El mago como lo dibujó la IA (1254 px, unos 93 píxeles de arte de alto) y como lo deja align-sprites (celda de 64 px, transparente y nítido).",
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
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }, { to: 'ai', label: "Crear con IA" }, { to: 'tiles', label: "Tiles" }] },
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
            "**Adjunta una referencia de tu personaje** si ya tienes uno bueno. Generar a partir de una imagen de referencia mantiene al personaje coherente.",
            "**Elige el color clave según el personaje.** Usa magenta, o verde si tu personaje es rosado, morado o magenta. El prompt le pide a la IA que no use el color clave en el personaje.",
            "**Pide un personaje pequeño**, de 16 a 48 píxeles de arte de alto. A la IA le cuesta menos mantener coherentes los personajes pequeños.",
          ],
        },
        { type: 'figures', items: [{ src: 'guide/guide-3x2-magenta.png', alt: "Una cuadrícula magenta de tres columnas por dos filas, con una línea cerca del borde inferior de cada celda y un número en cada celda.", caption: "La imagen guía de una hoja de 3 por 2. La IA la usa de plantilla y no copia sus líneas.", pixelated: false, zoom: 0.5 }] },
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
        { type: 'h3', id: 'what-goes-wrong', text: "Lo que la IA hace mal" },
        { type: 'p', text: "Estas hojas se hicieron en ChatGPT con los prompts y las imágenes guía de esta herramienta. Los números son medidos, no estimados." },
        {
          type: 'example',
          item: { src: 'guide/knight-before.jpg', alt: "Seis frames de un caballero de pixel art caminando, sobre fondo magenta.", caption: "Caballero caminando, pixel art, 6 frames sobre magenta.", pixelated: false },
          title: "Caballero",
          facts: [
            "Pediste un personaje de 32 píxeles de arte de alto. Salió de unos 58 píxeles.",
            "El fondo nunca fue el color clave exacto: ningún píxel era #FF00FF y había unos 8.500 tonos de magenta.",
            "El centro horizontal se desplaza entre frames (de 228 a 249 px en celdas de 256 px).",
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
            ["El personaje está descentrado o con los pies a distinta altura", "La herramienta. Alinea los pies y el centro en cada celda."],
            ["Poses repetidas", "Tú. Genera de nuevo."],
            ["El personaje cambia entre frames", "Tú. Genera de nuevo con una imagen de referencia."],
          ],
        },
      ],
    },
    {
      id: 'normalize',
      title: "Normalizar",
      blocks: [
        { type: 'p', text: "Abre la pestaña Sprites y suelta una o varias imágenes. La herramienta elige valores razonables. Cambia un ajuste solo cuando la vista previa o una advertencia te lo pida." },
        { type: 'p', text: "Los ajustes siguen el orden en que piensas: estilo, frames, tamaño, animaciones, colores y fondo." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
        { type: 'h3', id: 'style', text: "Estilo de arte" },
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
        { type: 'callout', title: "Ojo", text: "Si sale «No se encontró una cuadrícula de píxeles», la imagen no es pixel art o ya está en su tamaño nativo. Cambia a Cartoon." },
        { type: 'h3', id: 'frames', text: "Frames" },
        { type: 'ul', items: [
          "**Auto** encuentra cada personaje por su cuenta y numera los frames en orden de lectura.",
          "**Cuadrícula** corta la imagen en filas por columnas. Úsala cuando conozcas la disposición. Es la opción más fiable si la IA puso los frames en una cuadrícula pareja.",
          "**Un solo personaje** trata toda la imagen como un único frame.",
        ] },
        { type: 'h3', id: 'size', text: "Tamaño y la regla de la misma altura" },
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
        { type: 'p', text: "Activa la **Altura del personaje** compartida y elige un valor, por ejemplo 48. Todos los personajes del lote se redimensionan a ella. Un jefe o un enemigo pequeño recibe un tamaño relativo, como 1.5 o 0.5, sobre esa altura." },
        { type: 'callout', title: "Ojo", text: "Elige una altura menor que la que dibujó la IA. Reducir pixel art funciona bien. Ampliarlo vuelve los píxeles irregulares, y la herramienta te avisa." },
        { type: 'h3', id: 'cell', text: "Tamaño de celda" },
        { type: 'p', text: "Cada frame va en una celda del mismo tamaño, centrado y con los pies sobre la misma línea. Eso evita que la animación se tambalee en tu juego." },
        { type: 'ul', items: [
          "**Auto** elige el menor múltiplo de 32 donde quepan todos los frames.",
          "También puedes escribir un ancho y un alto: 32, 64, 96, 128. Los personajes suelen ser más altos que anchos, por ejemplo 64 por 96. Los animales y los slimes necesitan celdas más anchas.",
          "El margen inferior deja filas vacías bajo los pies. Solo se aplica con una celda fija.",
        ] },
        { type: 'p', text: "Los múltiplos de 32 son una convención común. Encajan con la mayoría de los tamaños de tile y simplifican las cuentas." },
        { type: 'p', text: "Si una advertencia dice que se recortó contenido, usa una celda más grande, Auto, o una altura de personaje menor." },
        { type: 'h3', id: 'animations', text: "Animaciones" },
        { type: 'p', text: "Cada animación tiene un nombre, un rango de frames como `0-5`, una velocidad en frames por segundo (fps) y un interruptor de bucle. Deja el rango en blanco para usar todos los frames." },
        { type: 'p', text: "Una hoja puede tener varias animaciones. Por ejemplo, `idle` con los frames `0-3` y `walk` con los frames `4-9`. Las caminatas y los reposos hacen bucle. Un ataque normalmente no." },
        { type: 'h3', id: 'colours', text: "Colores" },
        { type: 'p', text: "En pixel art, fija un máximo de colores, por ejemplo 16 o 32. La paleta es compartida por todo el lote. Las imágenes de IA traen miles de tonos casi idénticos. Una paleta pequeña y compartida hace que tus personajes parezcan vivir en el mismo mundo. Usa 0 para conservar todos los colores." },
        { type: 'h3', id: 'background', text: "Fondo" },
        { type: 'p', text: "Auto usa el color más común del borde de la imagen. Tú puedes elegir cómo se quita." },
        { type: 'ul', items: [
          "**En todas partes** quita todos los píxeles cercanos al color, también los huecos entre un brazo y el cuerpo. Úsalo con claves magenta y verde.",
          "**Solo desde los bordes** quita solo el fondo que toca el borde. Úsalo con fondos blancos, para que la ropa blanca o crema se salve.",
        ] },
        { type: 'p', text: "Si desaparece una parte del personaje, baja la tolerancia. La próxima vez, usa la clave verde." },
        { type: 'h3', id: 'check', text: "Revisa el resultado" },
        { type: 'p', text: "La vista previa muestra los frames detectados en magenta y la línea de los pies en amarillo. Cada advertencia trae un botón que aplica el arreglo: una celda más grande, el modo cuadrícula, una tolerancia menor." },
      ],
    },
    {
      id: 'godot',
      title: "Godot 4",
      blocks: [
        { type: 'p', text: "El ZIP trae una carpeta `godot/<nombre>/` con cuatro archivos: la hoja `<nombre>.png`, un recurso `SpriteFrames` `<nombre>.tres`, una escena lista `<nombre>.tscn` con un `AnimatedSprite2D`, y un `README.txt`." },
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
        { type: 'p', text: "La escena coloca el sprite con su origen en los pies del personaje. Cuando pones el nodo en una posición, los pies quedan en ese punto. Pon tu `CollisionShape2D` por encima de la posición del nodo, porque el nodo no está en el centro del cuerpo." },
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
        { type: 'p', text: "GDevelop te da dos formas de añadir una animación. Elige una. El ZIP trae lo que ambas necesitan, dentro de `gdevelop/<nombre>/`." },
        {
          type: 'table',
          head: ["Método", "Archivos que usas", "Sirve para"],
          rows: [
            ["Frames", "`<animación>/<animación>_00.png`, `_01.png`…", "Pocas animaciones. No hay nada más que aprender."],
            ["Spritesheet con Piskel", "`spritesheets/<animación>.png`, una fila por animación", "Muchos frames. Una importación por animación."],
          ],
        },
        { type: 'h3', id: 'gdevelop-frames', text: "Método A: frames" },
        {
          type: 'steps',
          items: [
            "Crea un objeto **Sprite**. Ponle el nombre de tu personaje.",
            "Por cada animación, añade una animación, pulsa **Añadir imágenes** y selecciona de una vez todos los PNG de la carpeta de esa animación. GDevelop los añade por orden de nombre, y por eso los archivos van numerados.",
            "Pon el tiempo entre frames en `1 / fps`. A 10 fps son `0.1` segundos. Activa o desactiva el **Bucle** como lo elegiste en la herramienta.",
          ],
        },
        { type: 'h3', id: 'gdevelop-piskel', text: "Método B: spritesheet con Piskel" },
        {
          type: 'steps',
          items: [
            "En el objeto **Sprite**, añade una animación y ábrela con **Editar con Piskel**.",
            "En Piskel, elige **Importar**, escoge `spritesheets/<animación>.png` y elige **Importar como spritesheet**.",
            "Escribe el tamaño de frame. Es el tamaño de tu celda, por ejemplo 32 por 32.",
            "Guarda y cierra Piskel. Los frames aparecen en la animación.",
            "Pon el tiempo entre frames en `1 / fps` y el bucle, como en el método A.",
          ],
        },
        { type: 'callout', title: "Ojo", text: "Los nombres de menú de arriba siguen GDevelop 5 tal como era cuando escribimos esta guía. Si los tuyos difieren, el `README.txt` de la carpeta trae los mismos pasos con los valores exactos de tu hoja." },
        { type: 'h3', id: 'gdevelop-origin', text: "Pon el punto de origen en los pies" },
        { type: 'p', text: "Por defecto el origen es la esquina superior izquierda. Entonces un objeto colocado en (x, y) cuelga de esa esquina, y el personaje se desplaza cuando lo volteas o lo escalas. Pon el punto **Origin** en los pies." },
        {
          type: 'steps',
          items: [
            "Abre el editor de **Puntos** del Sprite.",
            "Pon el punto **Origin** (Origen) en el valor del `README.txt`. Es la mitad del ancho de la celda hacia la derecha y la fila de los pies hacia abajo. Para una celda de 32 por 32 sin margen inferior, es (16, 31).",
            "Marca **Aplicar los mismos puntos a todos los fotogramas**, para que todas las animaciones queden alineadas.",
          ],
        },
        { type: 'h3', id: 'gdevelop-nearest', text: "Mantén nítido el pixel art" },
        { type: 'p', text: "En las propiedades del juego, pon **Modo de escalado (también llamado muestreo)** en **Nearest (sin antialiasing)**. Activa el **Redondeo de píxeles** si la cámara se mueve. Para arte suave tipo cartoon, deja el valor por defecto, Linear." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
      ],
    },
    {
      id: 'kaplay',
      title: "Kaplay",
      blocks: [
        { type: 'p', text: "El ZIP trae `kaplay/<nombre>.png` y `kaplay/<nombre>.js`. El `.js` tiene la llamada a `loadSprite` lista para pegar." },
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
        { type: 'callout', title: "Ojo", text: "Si la celda tiene un margen inferior, el fragmento lo suma a `y`, así los pies, y no el borde de la celda, quedan sobre `pos`." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
      ],
    },
    {
      id: 'other',
      title: "Otros motores",
      blocks: [
        { type: 'p', text: "El ZIP trae una carpeta `generic/` para cualquier motor que lea hojas de Aseprite o que corte una hoja por tamaño de celda." },
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
            ["Unity", "Importa el PNG, pon **Sprite Mode** en **Multiple**, abre el **Sprite Editor** y corta con **Grid By Cell Size**, con el tamaño de celda de la herramienta."],
            ["Defold", "Añade los PNG por frame a un atlas y agrúpalos en animaciones, o crea una fuente de tiles desde la hoja con el tamaño de celda."],
            ["Construct", "Importa los PNG por frame en la animación de un objeto. También importa una tira de sprites."],
            ["Cualquier otro", "Corta la hoja por tamaño de celda. Mira abajo."],
          ],
        },
        { type: 'callout', title: "Ojo", text: "Conocemos estos motores menos que Godot, GDevelop y Kaplay, y sus menús cambian entre versiones. Toma los nombres de arriba como una pista y revisa la documentación del propio motor." },
        { type: 'h3', id: 'other-slice', text: "Corta la hoja tú mismo" },
        { type: 'p', text: "Sirve cualquier motor que corte una hoja en celdas iguales. Usa el tamaño de celda y el número de columnas de la herramienta. La animación número `k` es la fila `k`, y el frame `i` es la columna `i`. Pon el origen en los pies: la mitad del ancho de la celda hacia la derecha y `alto de celda − 1 − margen inferior` hacia abajo." },
        { type: 'actions', items: [{ to: 'sprites', label: "Probarlo en Sprites" }] },
      ],
    },
    {
      id: 'tiles',
      title: "Tiles",
      blocks: [
        { type: 'p', text: "La pestaña Tiles tiene dos herramientas: una limpia una hoja de tiles hecha por la IA y la otra construye los tiles de transición entre dos terrenos." },
        { type: 'h3', id: 'tile-sheet', text: "Limpia una hoja de tiles" },
        {
          type: 'steps',
          items: [
            "Agrega una imagen con varios tiles en filas y columnas. Prueba el ejemplo de las montañas andinas.",
            "Elige el tamaño del tile: 16, 32, 48, 64 o el que quieras.",
            "Revisa la cuadrícula. La herramienta detecta columnas y filas por los huecos vacíos entre tiles. Si las líneas de corte se ven mal, desmarca **Detectar automáticamente** y escribe las columnas y filas.",
            "Descarga el ZIP.",
          ],
        },
        {
          type: 'figures',
          items: [
            { src: 'guide/tileset-before.jpg', alt: "Una hoja de tiles dibujados por la IA: plataformas con pasto, agua, puentes, chozas y plantas sobre blanco.", caption: "La hoja de la IA", pixelated: false },
            { src: 'guide/tileset-atlas.png', alt: "Los mismos tiles en una cuadrícula exacta de celdas de 32 por 32 píxeles con fondo transparente.", caption: "El atlas: cada tile de exactamente 32 por 32", pixelated: true, zoom: 2, backdrop: 'checker' },
          ],
        },
        { type: 'p', text: "Cada tile se remuestrea a exactamente el tamaño que elegiste y se quita el fondo. Las celdas vacías se tachan y quedan fuera del tileset." },
        { type: 'p', text: "En Godot, copia `godot/<nombre>/` a tu proyecto, asigna el `.tres` a un `TileMapLayer` y pinta. En GDevelop, usa el objeto **Tilemap** con el archivo `.tsx` (formato Tiled) y el PNG del atlas. Tiled y LDtk abren el `.tsx` como un tileset." },
        { type: 'h3', id: 'terrains', text: "Transiciones de terreno" },
        { type: 'p', text: "El pasto junto a la tierra necesita tiles de borde y de esquina. Esta herramienta los dibuja por ti a partir de dos texturas." },
        {
          type: 'steps',
          items: [
            "Agrega la textura **A**, el terreno base, y la textura **B**, que se pinta sobre A. Las dos deben ser cuadradas y sin costuras. Marca **Sin textura B** para crear una capa superpuesta que puedes apilar sobre cualquier terreno.",
            "Elige la disposición (mira abajo) y ajusta el estilo del borde: margen, suavidad, irregularidad, semilla, contorno.",
            "Pulsa **Barajar mapa** en el mapa de prueba. Debe verse conectado por todas partes. **Costuras en A/B** te dice si cada textura se repite limpia: cerca de 1 es bueno.",
            "Descarga el ZIP: el PNG del atlas, un `TileSet` de Godot con los datos de terreno ya llenos y un README con la tabla de tiles.",
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
            ["Blob 47", "47 tiles, uno por cada patrón de los 8 vecinos", "Terrains de Godot. Godot elige el tile correcto para cada celda."],
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
        { type: 'p', text: "En Dual 16 cada tile queda a medio tile de distancia de las celdas de tu mapa. Así bastan 16 tiles." },
        { type: 'h3', id: 'paint-godot', text: "Pinta con Terrains en Godot" },
        {
          type: 'steps',
          items: [
            "Copia `godot/<nombre>/` a tu proyecto, por ejemplo a `res://tiles/<nombre>/`.",
            "Añade un `TileMapLayer` y pon su **Tile Set** en `<nombre>.tres`.",
            "Abre el panel **TileMap** y ve a la pestaña **Terrains**.",
            "Elige el terreno y pinta. Godot escoge el tile de borde correcto en cada celda. En pixel art, pon **Texture Filter** en **Nearest**.",
          ],
        },
        { type: 'p', text: "Dual 16 necesita la lógica dual-grid del addon TileMapDual (MIT, disposición Standard), o colocas los tiles a mano." },
        { type: 'h3', id: 'paint-gdevelop', text: "Pinta en GDevelop" },
        { type: 'p', text: "El atlas Dual 16 no trae datos de terreno. Importa el PNG como atlas de tilemap con tu tamaño de tile y las columnas que indica el README, y coloca los tiles a mano. El README trae una tabla que dice qué tile va en cada patrón de esquinas." },
        { type: 'actions', items: [{ to: 'tiles', label: "Abrir Tiles" }] },
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
            ["El número de frames es incorrecto", "Usa **Cuadrícula** con las filas y columnas de la imagen. Si motas de fondo se convirtieron en frames, sube la tolerancia."],
            ["Desaparece una parte del personaje", "La eliminación del fondo se la llevó. Baja la tolerancia, o usa **Solo desde los bordes**. La próxima vez, genera con la clave verde."],
            ["«Se recortó contenido»", "Usa una celda más grande o Auto. Los personajes anchos necesitan celdas más anchas. También sirve una altura de personaje menor."],
            ["Mi jugador y mi enemigo tienen tamaños distintos", "Activa la altura compartida del personaje. Mira [Tamaño](#/guide/size)."],
            ["«Reducción grande»", "La IA dibujó el personaje mucho más grande que tu objetivo. Pide un personaje más pequeño, de unos 32 píxeles de arte, para un resultado más nítido."],
            ["«No se encontró una cuadrícula de píxeles»", "La imagen no es pixel art, así que usa Cartoon. O ya está en su tamaño nativo."],
            ["Los frames se repiten o el personaje cambia", "Eso viene de la IA. Genera de nuevo con una imagen de referencia del personaje."],
            ["El pixel art se ve borroso en el motor", "Pon el filtro Nearest: **Default Texture Filter** en Godot, **Modo de escalado** en GDevelop, `texFilter: \"nearest\"` en Kaplay."],
            ["El personaje flota, se hunde o salta al cambiar de animación", "El origen no está en los pies. Pon el punto **Origin** en GDevelop, o usa `anchor(\"bot\")` en Kaplay."],
            ["Godot muestra un error en el `.tres`", "Espera a la importación y recarga el proyecto. Comprueba que el PNG se importe como Texture2D."],
            ["La cuadrícula de tiles es incorrecta", "Desmarca **Detectar automáticamente** y escribe las columnas y filas."],
            ["Los tiles muestran costuras al repetirse", "La textura no es continua. Mira **Costuras en A/B** y genérala de nuevo pidiendo una textura repetible."],
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
            { term: "Spritesheet", text: "Una imagen que contiene todos los frames de un sprite, en filas y columnas." },
            { term: "Frame", text: "Un cuadro de una animación. Un ciclo de caminata tiene seis u ocho." },
            { term: "Celda", text: "La caja que contiene un frame en la hoja. Todas las celdas miden lo mismo, así el motor puede cortar la hoja de forma pareja." },
            { term: "Origen (pivote)", text: "El punto de la imagen que queda en la posición del objeto. Aquí está en los pies, así un personaje colocado en (x, y) pisa ese punto." },
            { term: "Pixel art y cuadrícula de píxeles", text: "El pixel art se dibuja un píxel cuadrado a la vez. Un píxel de arte es uno de esos cuadrados. Las imágenes de IA los dibujan como bloques borrosos, así que la herramienta encuentra la cuadrícula y los redibuja." },
            { term: "Paleta", text: "El conjunto de colores de una imagen. El pixel art usa una pequeña, de 16 o 32 colores." },
            { term: "Croma (chroma key)", text: "Un color plano, magenta o verde, que usas de fondo para quitarlo con facilidad." },
            { term: "Filtro Nearest", text: "Una forma de escalar una imagen que copia el píxel más cercano y no difumina. Mantiene nítido el pixel art." },
            { term: "Tile y atlas", text: "Un tile es un cuadrito del mapa. Un atlas es una imagen que contiene muchos tiles." },
            { term: "Autotile (terreno)", text: "Un conjunto de tiles con bordes y esquinas que el motor elige por ti, para que el pasto se una con la tierra sin cortes." },
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
};
