# align-sprites

Normalize AI-generated sprites and tiles so they work in **Godot 4**, **GDevelop 5** and **Kaplay**: fixed cell sizes, one shared scale, feet-aligned frames, a true pixel grid and clean transparency. Everything runs in your browser.

**Work in progress.** → https://alex-roc.github.io/align-sprites/

*Español:* herramienta para normalizar sprites y tiles generados con IA (Gemini, ChatGPT…) para usarlos en Godot, GDevelop y Kaplay. En desarrollo.

## Development

```sh
pnpm install
pnpm dev      # http://localhost:5173/align-sprites/
pnpm test
pnpm build
```

See [dev-docs/architecture.md](dev-docs/architecture.md).

## License

GPL-3.0-or-later. Includes the [unfake.js](https://github.com/jenissimo/unfake.js) WASM core (MIT), which bundles imagequant (GPL-3.0).
