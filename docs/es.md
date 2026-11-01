# Guía de align-sprites

> La guía actualizada e interactiva está en la app: **https://alex-roc.github.io/align-sprites/#/guide**. Este archivo es una copia de referencia.

**[Abrir la herramienta →](https://alex-roc.github.io/align-sprites/)** · [Guide in English](README.md)

Los modelos de imagen (Gemini / Nano Banana, ChatGPT…) dibujan buenos personajes, pero sus hojas de sprites fallan en los motores de juego. Los frames salen de tamaños distintos y el personaje salta de un frame a otro. Cada imagen trae otra escala, el pixel art es «falso» (bloques ×8 borrosos sobre una cuadrícula irregular) y el fondo viene de color en vez de transparente. align-sprites lo corrige en tu navegador. Tus imágenes no se suben a ningún lado.

| Lo que da la IA | Después de align-sprites (32 px de alto, 16 colores, frames de 32×32) |
|---|---|
| ![caballero antes](img/knight-before.png) | ![caballero después](img/knight-after.png) |
| ![zorro antes](img/fox-before.png) | ![zorro después](img/fox-after.png) |

## 1. Crea la imagen con IA

Abre la pestaña **Crear con IA**:

1. Describe el personaje y la acción (caminar, correr, reposo, ataque, salto…), el número de frames y de columnas.
2. Copia el prompt y descarga la **imagen guía**: una cuadrícula magenta con la línea de los pies.
3. En Gemini o ChatGPT pega el prompt y adjunta la guía. Si ya tienes un buen personaje, adjúntalo también como referencia: lo que mantiene la coherencia del personaje es generar la animación a partir de una imagen de referencia. La IA suele copiar el nivel de detalle de la referencia más que el alto pedido; no importa, el tamaño final lo eliges en la herramienta.
4. Descarga el resultado.

Consejos:

- Pide **toda la animación en una sola imagen**. Los frames generados uno por uno nunca coinciden.
- Usa la **clave verde** si tu personaje es rosado, morado o magenta.
- A la IA le cuesta menos mantener coherentes los personajes pequeños, de 16 a 48 píxeles de arte de alto.
- La IA no seguirá la guía al pie de la letra (número de frames, línea de pies, tamaño). No importa: la herramienta lo corrige.
- Algunos defectos solo los arreglas tú: las poses repetidas y un personaje que cambia entre frames. Genera de nuevo, con una imagen de referencia.

### Más cosas que puedes pedir

El selector de tipo (agrupado como Sprites, Escenario y Objetos, igual que las pestañas) también arma prompts (cada uno con su imagen guía, menos el de video) para:

- **Cenital, 4 direcciones**: una fila por dirección (abajo, izquierda, derecha, arriba), o 3 filas con la vista de lado en espejo.
- **Clip de video** para modelos de video (Veo, Kling, Sora, Hailuo…): el personaje se mueve en el lugar, con la cámara fija, sobre verde plano, y el clip termina en la pose del inicio para que se repita.
- **Atlas de tiles** (grupo Escenario): tiles en una cuadrícula con huecos del color clave entre ellos, y suelos con la parte de arriba sólida para que los personajes no floten.
- **Capas de parallax** (grupo Escenario): un prompt por capa. La capa lejana es opaca; las otras van sobre el color clave; todas se repiten hacia los lados.
- **Efectos** (explosión, golpe, magia, humo, proyectil): cada frame centrado en su celda, con bordes duros y sin resplandor.
- **Objetos e íconos** (grupo Objetos): objetos separados, cada uno centrado en su propia celda, a la misma escala.

### Desde un video

Los modelos de video animan con mucha más coherencia que un modelo de imágenes que dibuja una cuadrícula. Suelta un MP4 o WebM en la pestaña **Sprites** y se abre el diálogo **Video a frames**:

1. Elige la parte del clip que se repite. **Encontrar el ciclo** sugiere el final donde el personaje vuelve a la pose del inicio.
2. Elige la cantidad de frames (8 por defecto) y revisa las miniaturas. El final queda fuera, así el primer frame no se repite.
3. Los frames se vuelven una hoja de sprites normal (con la cuadrícula ya puesta y los FPS del clip) y siguen los pasos de siempre. Los frames de un video no son pixel art: usa *Cartoon*.

## 2. Normalizar

Abre la pestaña **Sprites** y suelta una o varias imágenes. De cada una, la herramienta detecta si es una **hoja de sprites** (varios frames) o un **sprite único** (un solo dibujo). Si se equivocó, corrígelo en **Tipo de imagen**.

Los ajustes siguen el orden en que piensas: estilo de arte, tamaño del sprite, tamaño del frame, frames y animaciones. Colores, fondo y avanzado quedan plegados. Con varias imágenes, la columna se divide en ajustes para todas las imágenes y solo para la elegida.

- **Estilo de arte**: *Pixel art* encuentra la cuadrícula real de píxeles, quita el desenfoque de la IA y mantiene los bordes duros. *Cartoon* redimensiona arte suave con bordes limpios y antialiasing.
- **Tamaño del sprite**: la altura del dibujo, en px. Valores: Original, 8, 16, 32, 64, 96, 128, u Otro. También muestra el tamaño en tiles del juego (el tile se fija en la pestaña Kit). Todas las imágenes del lote quedan a la misma altura, así tu jugador y tu enemigo tienen la misma escala. Un tamaño relativo (1.5 para un jefe) va encima. Elige una altura menor que la que dibujó la IA: ampliar pixel art vuelve los píxeles irregulares.
- **Tamaño del frame**: el sprite es el dibujo; el frame es el lienzo que ocupa cada cuadro, con los pies en una línea. *Automático* elige el menor múltiplo de 32 donde quepa todo. *A medida* te deja escribir ancho y alto (de 8 en 8 px, nunca menos de lo que cabe) y el espacio bajo los pies. Los múltiplos de 32 funcionan bien en casi todos los motores.
- **Frames** (hojas de sprites): *Automático* encuentra cada frame, o *Cuadrícula* corta filas × columnas. En la vista **Original**, **Editar recuadros** te deja dibujar, mover y cambiar de tamaño los recuadros a mano.
- **Animaciones**: nombre, frames como `0-5` o `0,2,4-6`, FPS y bucle. **Espejo** voltea una animación, y **Crear versión espejo** agrega la versión espejo como animación nueva. **Una animación por fila** convierte una hoja cenital en `walk_down`, `walk_left`, `walk_right` y `walk_up` (con 3 filas, `walk_left` es el lado en espejo), o en `anim_0`, `anim_1`… con otra cantidad de filas.
- **Origen**: *Pies* para personajes (los pies de cada frame quedan en una línea) o *Centro* para efectos, proyectiles y cosas que flotan (cada frame queda centrado; el tamaño es el del frame más grande).
- **Colores**: *Colores originales*, una paleta lista (PICO-8, Sweetie 16, Endesga 32, Game Boy), una paleta *desde una imagen*, *Mi propia paleta*, o *Reducir a N colores*. La paleta se comparte entre todas las imágenes y tus tiles. Las paletas fijas solo funcionan con pixel art.
- **Mi propia paleta**: haz clic en un color para cambiarlo, agrega o quita colores (hasta 256), empieza desde una paleta lista o desde los colores de tus imágenes, o pega una lista de códigos hex. Importa y exporta `.hex` (Lospec), `.gpl` (GIMP) o `.txt` (Paint.NET).
- **Variantes de color**: haz clic en un color para cambiarlo, luego **Duplicar como variante de color** para conservar las dos versiones (enemigos, equipos). Con varias imágenes, **Todas las imágenes** aplica ese cambio de colores a cada imagen, o duplica todas como variantes llamadas `nombre_<final>`. Con una paleta fija también puedes cambiar la paleta entera por otra con la misma cantidad de colores (por ejemplo, de PICO-8 a Sweetie 16).
- **Fondo**: Auto (el color más común del borde). *En todas partes (croma)* para magenta y verde; *Solo desde los bordes* para fondos blancos (también quita los huecos cerrados de blanco plano, como el que queda entre los pies). Baja la tolerancia si desaparece una parte del personaje.

### Sprites únicos y hojas de sprites

Un sprite único no tiene animaciones y tiene las vistas **Sprite** y **Original**. Una hoja de sprites tiene **Animación**, **Hoja final** y **Original**. Con varias imágenes, **Todas juntas** pone cada imagen sobre una sola línea de suelo con el mismo zoom: la prueba de que comparten escala.

### Arregla frames a mano

El editor de frames, bajo la tira de frames, actúa sobre el frame elegido: mover a izquierda o derecha, duplicar, quitar de la animación, empujar 1 px. Atajos: `[` y `]` mueven el frame, `D` lo duplica, `Supr` lo quita, `Mayús` + flechas lo empujan, `0` restablece el empuje. Cuando la IA repite una pose, la herramienta lo dice («El frame 4 repite el 1») y **Quitar duplicados** los quita.

### Caja de colisión

Cada sprite recibe una caja de colisión automática: el cuerpo en los personajes (brazos, espadas y capas quedan fuera) y un rectángulo centrado en los efectos. Marca **Caja de colisión** en la vista Animación para verla. Va en todas las exportaciones (ver abajo).

## 3. Usarlo en tu motor

Bajo el escenario, elige el motor y pulsa **Descargar para …**. El ZIP trae los archivos de ese motor (con *Todos los motores*, una carpeta por motor).

### Godot 4

1. Copia la carpeta `<nombre>/` del ZIP dentro de tu proyecto (por ejemplo, `res://personajes/<nombre>/`).
2. Arrastra `<nombre>.tscn` a tu escena. Es un `AnimatedSprite2D` con el **origen en los pies** y todas las animaciones listas, con sus fps y su bucle. Un **sprite único** trae en cambio una escena `Sprite2D`.
3. En pixel art, la escena ya usa el filtro *Nearest*. Para todo el proyecto: *Configuración del proyecto → Rendering → Textures → Default Texture Filter = Nearest*.

4. Para un personaje jugable, usa en cambio `<nombre>_body.tscn`: un `CharacterBody2D` con el sprite y un `CollisionShape2D` ya del tamaño de la caja de colisión. Agrégale tu script de movimiento.

Los efectos con el origen en el centro son escenas centradas. También puedes usar solo `<nombre>.tres` (un recurso `SpriteFrames`) en tu propio `AnimatedSprite2D`, pero el desplazamiento de los pies está en el `.tscn`. Si Godot muestra un error la primera vez, espera a que termine la importación o recarga el proyecto.

### GDevelop 5

El ZIP trae una carpeta por imagen con sus frames ya cortados (`<nombre>/<nombre>_<animación>_00.png`, `_01.png`…) y un `README.txt` con el origen y los fps.

- **Frames**: crea un objeto **Sprite**, añade una animación, pulsa *Añadir imágenes* y selecciona de una vez todos los PNG de esa animación.
- **Spritesheet con Piskel** (opcional: marca *Incluir también spritesheets para Piskel* antes de descargar): añade una animación, ábrela con *Editar con Piskel*, elige *Importar*, escoge `<nombre>/spritesheets/<nombre>_<animación>.png` y *Importar como spritesheet* con tu tamaño de frame.
- **Consejo al volver a importar**: GDevelop copia las imágenes a la carpeta del proyecto y borrarlas en GDevelop deja los archivos. Antes de reimportar, borra también los PNG viejos de esa carpeta, o GDevelop renombra las copias y puede repetir o mezclar frames. (Otra opción: descomprimir dentro del proyecto y elegir las imágenes ahí.)

Luego pon el tiempo entre frames en `1 / fps` y el bucle. En *Editar puntos* (el editor de Puntos), fija el punto **Origin** (Origen) en el valor del README (los pies) para todos los frames. Un **sprite único** es un solo PNG, `<nombre>/<nombre>.png`. El README también trae los 4 puntos de la **máscara de colisión**: en el editor de máscaras de colisión, desmarca «usar la imagen completa» y escríbelos. En pixel art, en las propiedades del juego elige el modo de escalado *Nearest (sin antialiasing)*. (Los nombres de menú siguen GDevelop 5 como lo vimos por última vez; el README del ZIP trae los mismos pasos.)

### Kaplay

`<nombre>.png` y `<nombre>.js` con la llamada `loadSprite(...)` (`sliceX`, `sliceY`, `anims`; cada animación empieza en `fila × columnas`). El código incluye `area({ shape: new Rect(...) })` con la caja de colisión. Usa `anchor("bot")` para que el origen esté en los pies (`anchor("center")` en los efectos), y `kaplay({ crisp: true, texFilter: "nearest" })` en pixel art. Un sprite único es un simple `loadSprite(nombre, png)`.

### Otros motores

`<nombre>.png` con `<nombre>.json` en el formato de Aseprite (con el origen y `meta.collision`), más un PNG por frame. Phaser lo lee como atlas de Aseprite, Unity corta el PNG con *Grid By Cell Size*, y Defold y Construct pueden importar los PNG por frame. Conocemos esos motores menos: revisa su documentación. Sirve cualquier motor que corte por tamaño de frame: la animación `k` es la fila `k`, el frame `i` es la columna `i`, con el origen en los pies.

## 4. Escenario

La pestaña **Escenario** construye el suelo y el paisaje. Tiene tres herramientas, en el orden de la pestaña: hoja de tiles, transiciones de terreno y fondo con parallax. La herramienta forma parte de la dirección (`#/world/sheet`, `#/world/terrain`, `#/world/parallax`).

### Hoja de tiles (limpiar un tileset de IA)

1. Agrega una imagen con varios tiles ordenados en filas y columnas (prueba *Tileset de montañas andinas*).
2. Elige el **tamaño del tile** (de 8 a 128 px, o el que quieras). La cuadrícula se detecta por los huecos vacíos entre tiles; si las líneas de corte se ven mal, desmarca *Detectar columnas y filas automáticamente* y escribe las columnas y filas.
3. Cada tile se remuestrea a exactamente ese tamaño, se quita el fondo, y los tiles vacíos se tachan y quedan fuera del tileset.
4. Elige un formato (Godot 4, Tiled / GDevelop, PNG) o todos los formatos y descarga.

### Transiciones de terreno (pasto → tierra, etc.)

1. Agrega la textura **A** (terreno base) y la textura **B** (se pinta sobre A). Ambas deben ser cuadradas y continuas. Marca *Sin textura B: pintar A sobre transparente* para crear una capa superpuesta.
2. Elige la disposición: **Blob 47 (Godot)** o **Dual 16 (GDevelop)**. Ajusta el estilo del borde. El **mapa de prueba** muestra un mapa al azar hecho con tus tiles; pulsa *Mezclar mapa* para comprobar que encajan en todas partes. *Costuras en A* y *Costuras en B* indican si cada textura se repite limpia.
3. **Descargar ZIP**: el PNG del atlas, un `TileSet` `.tres` de Godot con los datos de terreno completos y un README con la tabla de tiles.

### Usar los tiles en tu motor

- **Godot 4**: copia la carpeta `godot/<nombre>/` en tu proyecto y asigna el `.tres` a un `TileMapLayer`. Para Blob 47, abre el panel *TileMap*, elige la pestaña **Terrains** y pinta. Dual 16 está pensado para el addon *TileMapDual*.
- **GDevelop 5**: usa el objeto **Tilemap** con el `.tsx` (Tiled) y el PNG del atlas. El atlas Dual 16 no trae datos de terreno: píntalo a mano, usando la tabla del README.
- **Tiled / LDtk**: abre el `.tsx` como tileset.

### Fondo con parallax

Capas de fondo hechas con IA (cielo y montañas lejanas, colinas al medio, árboles y rocas cerca) se vuelven capas que se repiten hacia los lados a la altura de tu juego y se mueven a distintas velocidades. Créalas con el prompt *Capas de parallax*, uno por capa.

1. Agrega de 1 a 4 imágenes, de la más lejana a la más cercana (o prueba *Andes: montañas y árboles*). Cada capa tiene una **Velocidad**: 0 se queda quieta, 1 se mueve con la cámara (lejos 0.2, cerca 0.8 por defecto).
2. La herramienta quita el color de fondo plano de cada capa menos la más lejana, mirando la parte de arriba de la imagen, así funcionan los paisajes que llegan al borde de abajo. Desmarca **Quitar el fondo** si una capa ya es transparente.
3. **Alto de las capas** es el alto de tu juego (compartido con el Kit). El pixel art conserva su propia cuadrícula: se amplía por un número entero y la parte de arriba se rellena o se recorta para llegar al alto; la parte de abajo no se mueve.
4. **Hacer que se repita hacia los lados** une el borde derecho con el izquierdo por un corte escondido, así nada salta cuando la capa se repite. Una imagen que ya da la vuelta por su borde se deja como está; si no, la herramienta prueba varios anchos de unión y elige uno que no deje pedazos flotando. Revísalo en **Repetición** y mira el resultado en **Movimiento**.
5. Exportación: los PNG de las capas más una escena de Godot 4 con un `Parallax2D` por capa (repetición y velocidad listas), un README para GDevelop (un *Tiled Sprite* por capa con la extensión oficial "Parallax for Tiled Sprite"), código para Kaplay, o un JSON con tamaños y velocidades.

## 5. Objetos

En la pestaña **Objetos**, una imagen de IA con objetos separados (monedas, pociones, llaves, gemas, íconos) se vuelve un atlas donde cada objeto queda centrado en una casilla cuadrada del tamaño que elijas, sin fondo.

- Por defecto todos los objetos comparten una escala, así una moneda sigue siendo más pequeña que una espada. *Cada objeto llena su casilla* agranda cada objeto lo más posible, lo que sirve para íconos.
- El pixel art nunca se agranda: los objetos más pequeños que la casilla conservan su tamaño real, y los más grandes se reducen una sola vez, desde el original, sobre la cuadrícula de píxeles de la hoja.
- Haz clic en un objeto en **Original** para tacharlo, y pon nombre a los objetos en **Atlas**.
- Exportación: Godot recibe un `.tres` (`AtlasTexture`) por objeto, GDevelop un PNG por objeto, Kaplay una llamada `loadSpriteAtlas`, y Otros el PNG del atlas, un JSON con los rectángulos y los PNG sueltos.

## 6. Kit

La pestaña **Kit** junta tus sprites, tu escenario (tiles y fondo) y tus objetos para que compartan una escala.

- **Resolución del juego**: el tamaño de la pantalla de tu juego antes de ampliarla. Elige una que se amplíe a la pantalla por un número entero, así los píxeles se mantienen parejos:

  | Juego | Tile | Personaje | Full HD | 4K |
  |---|---|---|---|---|
  | 320×180 | 16 | 24–32 | ×6 | ×12 |
  | 640×360 | 32 | 48–64 | ×3 | ×6 |
  | 960×540 | 48 | 72–96 | ×2 | ×4 |
  | 1280×720 | 64 | 112–144 | – (×1,5) | ×3 |

- **Tamaño del tile del juego**: 16, 32, 48 o 64 px, la cuadrícula sobre la que se construye tu juego. Las alturas de los sprites se muestran en tiles, y un set de tiles con otro tamaño recibe una advertencia con un botón para arreglarlo.
- **Paleta compartida**: la misma paleta de Colores en Sprites. Una paleta fija también se aplica a tus tiles.
- **Vista previa a escala real**: tus sprites sobre una fila de tus tiles (sobre la primera fila sólida del tile, así las hojas de pasto de arriba no los hacen flotar). Si aquí se ve bien, se verá bien en tu juego.
- **Nivel de prueba**: pulsa **Jugar** para caminar, correr (con Mayús) y saltar con tu personaje sobre tus propios tiles, antes de abrir un motor. Usa la librería Kaplay real a la resolución de tu juego, con la misma hoja, animaciones, origen en los pies y caja de colisión que la exportación para Kaplay. Elige qué animación se ve al estar quieto, caminar, correr y en el aire; cada una puede venir de una imagen distinta. Si hiciste un fondo con parallax (Escenario), se desplaza detrás del nivel.
- **Descargar el kit para …**: un ZIP por motor con `sprites/`, `tiles/`, `items/`, `backgrounds/` (solo las partes que hiciste) y un `README.txt` que lista todos los tamaños y la paleta.

## Problemas frecuentes

| Problema | Solución |
|---|---|
| Se detectó con el tipo equivocado | Cambia **Tipo de imagen**: hoja de sprites o sprite único. |
| El número de frames no es el correcto | Usa *Cuadrícula* con las filas × columnas de la imagen, sube la tolerancia si unas manchas del fondo se convirtieron en frames, o dibuja los recuadros con **Editar recuadros**. |
| El salto sale más grande que las otras animaciones | La mayoría de sus frames están agachados: pulsa **Medir los frames más altos** y compara en **Todas juntas**; si hace falta, ajusta el **Tamaño relativo**. |
| Desaparece una parte del personaje | La quitó el borrado del fondo: baja la tolerancia, o usa *Solo desde los bordes*. La próxima vez, genera con la clave verde. |
| Un frame se corta en el borde del frame | Usa un tamaño de frame más grande o *Automático*, o un tamaño de sprite menor. |
| Jugador y enemigo tienen tamaños distintos | Elige un tamaño de sprite común. |
| «El sprite se reduce mucho» | La IA dibujó el personaje mucho más grande que tu tamaño de sprite: pídele uno más pequeño (de unos 32 píxeles de arte). |
| «No se encontró una cuadrícula de píxeles clara» | La imagen no es pixel art (usa *Cartoon*) o está en su tamaño original. |
| Los frames se repiten o el personaje cambia | La IA repitió una pose: **Quitar duplicados**, o genera de nuevo con una imagen de referencia. |
| Los pies saltan entre frames | Empuja el frame en el editor de frames (`Mayús` + flechas). |
| El personaje mira hacia el lado equivocado | **Crear versión espejo** en la animación. |
| El pixel art se ve borroso en el motor | Filtro Nearest: *Default Texture Filter* (Godot), *Modo de escalado* (GDevelop), `texFilter: "nearest"` (Kaplay). |
| Los sprites y los tiles no encajan | Fija el tamaño de tile del juego en la pestaña Kit y úsalo en tus tiles. |
| Una explosión o un proyectil salta entre frames | Pon el **Origen** en *Centro*: los efectos van centrados, no parados sobre sus pies. |
| Un video no se abre | Tu navegador no puede decodificarlo: usa un archivo MP4 (H.264) o WebM. |
| Se nota la unión de una capa parallax | Aumenta el **Ancho de la unión**, o pide de nuevo a la IA una capa cuyos bordes coincidan. |

## Créditos

Hecho por Alex Ojeda Copa, Lab TecnoSocial.

La detección de la cuadrícula de píxeles usa [unfake.js](https://github.com/jenissimo/unfake.js), de Eugeniy Smirnov, con licencia MIT ([aviso de la licencia](https://github.com/jenissimo/unfake.js/blob/main/LICENSE)).

align-sprites es software libre con licencia [GPL-3.0](https://github.com/alex-roc/align-sprites/blob/main/LICENSE).
