# `nova add` — adding features to an existing project

`nova add` copies an addon's files into a project that already exists on
disk and merges its dependencies/scripts into that project's
`package.json`. It's the incremental counterpart to running `nova <name>`
from scratch.

## Usage

```bash
nova add <feature...> [options]
```

If you omit the feature list, you'll get an interactive multiselect with
the same options as the initial generator prompt.

### Options

| Flag | Description |
|---|---|
| `--path`, `-p <dir>` | Target project directory (default: current directory) |
| `--force`, `-f` | Overwrite files that already exist instead of skipping them |

### Examples

```bash
# Run from inside the project
cd my-app
nova add prisma redis

# Or target another directory
nova add tanstack-query --path ./my-app

# Re-copy files even if they already exist
nova add sentry --force
```

Feature names accept either the camelCase key (`tanstackQuery`) or the
kebab-case addon folder name (`tanstack-query`).

## What it does

1. Reads the target's `package.json` (the directory must already be a
   Node/Next.js project — `nova add` never creates a project itself).
2. Detects whether the project keeps its code under `src/` or at the
   project root, and copies each addon's files accordingly — any file the
   addon authors under `src/...` is copied without the `src/` prefix when
   the target project has no `src/` directory.
3. Creates whatever intermediate folders are needed (`lib/redis`,
   `emails/`, `.storybook/`, etc.) — nothing needs to exist beforehand.
4. Merges the addon's `dependencies` / `devDependencies` into
   `package.json` (a newer pinned version wins), and adds any new `scripts`
   entries **without overwriting** a script you've already customized.
5. Skips files that already exist in the project, so re-running `nova add`
   is safe — pass `--force` if you deliberately want the shipped template
   version back.

## Known limitations

- Switching UI libraries (`mui`, `chakra`, `ant`, ...) isn't supported via
  `nova add` — that requires rewriting the app's provider tree, which is
  only handled during initial generation.
- Config-file wiring that the generator applies automatically at scaffold
  time (e.g. `output: "standalone"` in `next.config.mjs` for Docker, or
  wrapping `next.config.mjs` for Sentry/PWA/Bundle Analyzer) is **not**
  re-applied by `nova add`. Files are copied and dependencies are added, but
  you may need to wire a couple of lines into `next.config.mjs` by hand —
  check that feature's `docs/*.md` in the generated project for the exact
  snippet.
- Run your package manager's install command afterwards; `nova add` only
  updates `package.json`, it doesn't install anything.