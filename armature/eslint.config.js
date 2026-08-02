import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The rig editor (RigContext/Bone/Timeline/BoneTrackGroup) drives real-time
      // pointer interactions — drag, rotate, scale, scrub, marquee-select — at
      // 60fps via refs mutated across a shared context, by design: re-rendering
      // on every mousemove isn't viable for this kind of app. These three rules
      // assume a purely-functional render model (React Compiler readiness) that's
      // fundamentally incompatible with that pattern, not a bug to fix here.
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // Several files intentionally colocate a context + hook + provider
      // component (RigContext.jsx) or a context + component (Bone.jsx) in one
      // file — a Fast Refresh DX nicety this rule flags, not a correctness issue.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Legacy single-bone editor, superseded by RigEditor + Bone (see README).
    // Frozen, not actively developed — not held to exhaustive-deps.
    files: ['**/AnimationEditor.jsx'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])
