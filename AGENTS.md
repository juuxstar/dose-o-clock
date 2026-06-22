@/Users/juuxstar/.codex/RTK.md

# Code Style And Organization

- Put stand-alone reusable Vue components under `src/components/widgets`.
- Use the widgets folder for shared UI pieces such as `DialSelector`, `DotRingTimer`, and `PanelShell`.
- Add a brief JSDoc intent comment immediately above each component's `@Component` decorator.
- Keep the main component class first in each Vue component script after imports and decorators.
- Move local interfaces, type declarations, constants, and helper-only declarations below the main class when they are less important than the component itself.
- Preserve existing project formatting, import sorting, and component patterns.

# Local Verification

- When confirming prompt results with local visual or browser tests, start the Vite dev server with `rtk npm run dev:http` so Codex can use a local HTTP server without HTTPS.
- The HTTP dev server is configured for `http://localhost:5175`.
