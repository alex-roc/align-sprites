# Guía de align-sprites

**[Abrir la herramienta →](https://alex-roc.github.io/align-sprites/)** · [Guide in English](README.md)

Los modelos de imagen (Gemini / Nano Banana, ChatGPT…) dibujan buenos personajes, pero sus hojas de sprites fallan en los motores de juego. Los frames salen de tamaños distintos y el personaje salta de un frame a otro. Cada imagen trae otra escala, el pixel art es «falso» (bloques ×8 borrosos sobre una cuadrícula irregular) y el fondo viene de color en vez de transparente. align-sprites lo corrige en tu navegador. Tus imágenes no se suben a ningún lado.

| Lo que da la IA | Después de align-sprites (32 px de alto, 16 colores, celdas de 32×32) |
|---|---|
| ![caballero antes](img/knight-before.png) | ![caballero después](img/knight-after.png) |
| ![zorro antes](img/fox-before.png) | ![zorro después](img/fox-after.png) |

## 1. Generar con IA

Abre la pestaña **Generar con IA**:

1. Describe el personaje y la acción (caminar, correr, reposo, ataque, salto…), el número de frames y de columnas.
2. Copia el prompt y descarga la **imagen guía**: una cuadrícula magenta con la línea de los pies.
3. En Gemini o ChatGPT pega el prompt y adjunta la guía. Si ya tienes un buen personaje, adjúntalo también como referencia: lo que mantiene la coherencia del personaje es generar la animación a partir de una imagen de referencia.
4. Descarga el resultado.

Consejos:

- Pide **toda la animación en una sola imagen**. Los frames generados uno por uno nunca coinciden.
- Usa la **clave verde** si tu personaje es rosado, morado o magenta.
- A la IA le cuesta menos mantener coherentes los personajes pequeños, de 16 a 48 píxeles de arte de alto.
- La IA no seguirá la guía al pie de la letra (número de frames, línea de pies, tamaño). No importa: la herramienta lo corrige.

## 2. Normalizar

Abre la pestaña **Sprites** y suelta una o varias imágenes.

**Ajustes para todo el lote.** Son compartidos, así todos los personajes quedan a la misma escala:

- **Estilo de arte**: *Pixel art* encuentra la cuadrícula real de píxeles, quita el desenfoque de la IA, mantiene los bordes duros y puede limitar la paleta. *Cartoon / vectorial* redimensiona arte suave con bordes limpios y antialiasing.
- **Tamaño de celda**: *Auto* elige el menor múltiplo de 32 donde quepan todos los frames. También puedes fijar el ancho y el alto (32, 64, 96, 128…). Un personaje suele ser más alto que ancho, por ejemplo 64×96.
- **Altura del personaje**: al activarla, cada personaje del lote se redimensiona a esa altura en píxeles. Esto arregla el problema de que el jugador y el enemigo salgan de tamaños distintos. Un personaje suelto grande (una imagen de tipo *Personaje suelto*) se redimensiona igual.
- **Colores máximos** (pixel art): una paleta compartida por todo el lote, por ejemplo de 16 o 32 colores.

**Ajustes por imagen**: el fondo (casi siempre *Auto*), la detección de frames (*Auto*, *Cuadrícula* de filas × columnas o *Un solo personaje*), las animaciones (nombre, frames como `0-5`, fps y bucle) y el tamaño relativo (1.5 para un jefe).

**Resultado**: los frames detectados sobre la imagen original, la hoja final, una vista previa animada (papel cebolla, línea de pies y origen) y un diagnóstico con advertencias, por ejemplo «se recortó contenido: usa una celda más grande o Auto».

## 3. Usarlo en tu motor

**Descargar ZIP** trae una carpeta por motor.

### Godot 4

1. Copia la carpeta `godot/<nombre>/` dentro de tu proyecto (por ejemplo, `res://personajes/<nombre>/`).
2. Arrastra `<nombre>.tscn` a tu escena. Es un `AnimatedSprite2D` con el **origen en los pies** y todas las animaciones listas, con sus fps y su bucle.
3. En pixel art, la escena ya usa el filtro *Nearest*. Para todo el proyecto: *Configuración del proyecto → Rendering → Textures → Default Texture Filter = Nearest*.

También puedes usar solo `<nombre>.tres` (un recurso `SpriteFrames`) en tu propio `AnimatedSprite2D`. Si Godot muestra un error la primera vez, espera a que termine la importación o vuelve a abrir el proyecto.

### GDevelop 5

GDevelop no importa hojas de sprites, así que el ZIP trae un PNG por frame en `gdevelop/<nombre>/<animación>/<animación>_00.png…`.

1. Crea un objeto **Sprite**, añade una animación y agrega todas sus imágenes a la vez (se ordenan por nombre).
2. Pon el tiempo entre frames en `1 / fps` y el *bucle* como indica el README.
3. En *Editar puntos*, fija el punto **Origen** en el valor del README (los pies) para que todas las animaciones queden alineadas.
4. En pixel art, en las propiedades del proyecto elige el modo de escalado *Nearest* (pixel art).

### Kaplay

`kaplay/<nombre>.png` y `kaplay/<nombre>.js` con la llamada `loadSprite(...)` (`sliceX`, `sliceY`, `anims`). Usa `anchor("bot")` para que el origen esté en los pies, y `kaplay({ crisp: true, texFilter: "nearest" })` en pixel art.

### Otros motores

`generic/<nombre>.png` con `<nombre>.json` en el formato de Aseprite (sirve para Phaser, los importadores de Unity, Defold…), más un PNG por frame.

## 4. Tiles

La pestaña **Tiles** tiene dos herramientas.

### Hoja de tiles (limpiar un tileset de IA)

1. Agrega una imagen con varios tiles ordenados en filas y columnas (prueba *Tileset de montañas andinas*).
2. Elige el **tamaño del tile** (16, 32, 48, 64 o el que quieras). La cuadrícula (columnas × filas) se detecta por los huecos vacíos entre tiles; si las líneas de corte se ven mal, desmarca *Detectar automáticamente* y escribe las columnas y filas.
3. Cada tile se remuestrea a exactamente ese tamaño, se quita el fondo, y las celdas vacías se tachan y quedan fuera del tileset.
4. **Descargar ZIP**: `godot/<nombre>/` (PNG del atlas + `TileSet` `.tres`), `tiled/<nombre>/` (PNG del atlas + `.tsx`) y el `<nombre>.png` simple.

### Transiciones de terreno (pasto → tierra, etc.)

1. Agrega la textura **A** (terreno base) y la textura **B** (se pinta sobre A). Ambas deben ser cuadradas y continuas. Marca *Sin textura B* para crear una capa superpuesta: A se dibuja sobre transparente y puedes ponerla encima de cualquier otro terreno.
2. Elige el formato: **Blob 47** (Terrains de Godot) o **Dual 16** (tilemaps de doble cuadrícula). Ajusta el estilo del borde (margen, suavidad, irregularidad, semilla, contorno). El **mapa de prueba** muestra un mapa al azar hecho con tus tiles; pulsa *Mezclar mapa* para comprobar que encajan en todas partes. *Costuras en A/B* indica si cada textura se repite limpia (cerca de 1 es bueno).
3. **Descargar ZIP**: el PNG del atlas, un `TileSet` `.tres` de Godot con los datos de terreno completos y un README con la tabla de tiles.

### Usar los tiles en tu motor

- **Godot 4**: copia la carpeta `godot/<nombre>/` en tu proyecto. Para una hoja de tiles, asigna el `.tres` a un `TileMapLayer` y pinta con los tiles. Para las transiciones de terreno (Blob 47), asigna el `.tres` a un `TileMapLayer`, abre el panel *TileMap*, elige la pestaña **Terrains** y pinta: Godot elige el tile de borde correcto en cada celda. Dual 16 está pensado para el addon *TileMapDual*.
- **GDevelop 5**: usa el objeto **Tilemap** con el `.tsx` (Tiled) y el PNG del atlas, o importa un mapa hecho en Tiled / LDtk. El atlas Dual 16 no trae datos de terreno: píntalo a mano, usando la tabla del README para saber qué tile va en cada patrón de esquinas.
- **Tiled / LDtk**: abre el `.tsx` como tileset.

## Problemas frecuentes

| Problema | Solución |
|---|---|
| El número de frames no es el correcto | Usa *Cuadrícula* con las filas × columnas de la imagen, o sube la tolerancia si unas manchas del fondo se convirtieron en frames. |
| Desaparece una parte del personaje | La quitó el borrado del fondo: baja la tolerancia o genera con la clave verde. En los fondos blancos se usa *flood* (solo desde los bordes) para que la ropa blanca sobreviva. |
| «Se recortó contenido» | Usa una celda más grande o *Auto*. Los personajes anchos (animales, slimes) necesitan celdas más anchas. |
| «Reducción grande» | La IA dibujó el personaje mucho más grande que tu altura objetivo. Pídele un personaje más pequeño (por ejemplo, de 32 píxeles de arte) y saldrá más nítido. |
| «No se encontró cuadrícula de píxeles» | La imagen no es pixel art (usa *Cartoon*) o ya está a su tamaño nativo. |
| Los frames se repiten o el personaje cambia | Eso viene de la IA: vuelve a generar adjuntando una imagen de referencia del personaje. |
