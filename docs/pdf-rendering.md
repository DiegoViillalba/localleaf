# PDF Rendering System in LocalLeaf

LocalLeaf implements a dual-mode PDF viewer designed for efficiency, performance, and flexibility.

## Viewer Modes

### 1. LocalLeaf Reader (Canvas-based)
The default reader, built on top of `pdf.js`. It renders PDF pages directly onto an HTML5 Canvas.

- **Pros**: Consistent look and feel, full control over UI, better integration with LocalLeaf features.
- **Optimizations**:
  - **DPR Capping**: Limits the `devicePixelRatio` based on user settings (Low/Balanced/High) to prevent massive memory usage on high-DPI screens.
  - **Memory Cleanup**: Calls `page.cleanup()` after each render and `doc.destroy()` when switching files.
  - **Task Cancellation**: Automatically cancels pending `renderTask` when the page or scale changes rapidly.
  - **Container-based Sizing**: Uses `ResizeObserver` to re-render only when the actual container size changes, avoiding unnecessary cycles.

### 2. Browser Reader (Native-based)
Uses the browser's native PDF plugin via an `<iframe>`.

- **Pros**: Extremely low memory footprint in the main JS thread, high performance for scrolling, leverages OS-level hardware acceleration.
- **Cons**: UI is dictated by the browser/OS, limited integration (e.g., #page fragment navigation might vary).

## Memory Optimization Techniques

LocalLeaf uses several strategies to keep RAM usage low:

1.  **DPR Management**: High-DPI screens (like Retina) can easily 4x or 9x the number of pixels. By capping the DPR (e.g., at 1.5), we save up to 75% of canvas memory without significant loss of perceived sharpness.
2.  **Resource Recycling**: Canvases are cleared and resized before each render. Document proxies are explicitly destroyed when no longer needed.
3.  **Fragment Navigation**: In Browser mode, we use `#page=X` to navigate without re-rendering the entire viewer logic.
4.  **Persistent State**: The current page and zoom level are saved per PDF file in the global store. This allows users to jump between documents and pick up where they left off.

## Configuration

Users can adjust the rendering quality in **Settings > PDF Viewer**:

- **Low**: DPR 1.0. Minimal RAM usage, suitable for low-end hardware.
- **Balanced**: DPR 1.5. Good balance between sharpness and memory.
- **High**: DPR 2.5. Maximum sharpness for high-resolution displays.

## Technical Details

- **Store**: Zustand with `persist` middleware.
- **Core Library**: `pdfjs-dist`.
- **Protocol**: Uses Tauri's `protocol-asset` via `convertFileSrc` to load files efficiently without reading entire buffers into JavaScript memory when possible.
