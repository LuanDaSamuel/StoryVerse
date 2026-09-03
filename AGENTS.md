# Custom Agent Directives

## Data Integrity & Database / Storage Policies
- **Strict Data Fidelity**: Whenever code or features touch the database, storage, persistence, or data usage optimization (local or cloud sync):
  - **NEVER modify, downscale, compress, or alter any user image** (such as novel cover images or any uploaded graphics). Preserve the exact original binary/Base64 data as uploaded by the user.
  - **NEVER modify or truncate user text inputs**, including novel titles, descriptions, chapter content, sketches, character notes, synopsis, tags, or custom dictionary entries.
  - **NEVER alter user settings or font sizes** (e.g. `baseFontSize`, theme, writingMode, language).
  - **Internet & Bandwidth Optimization Scope**: Data usage must ONLY be reduced through network transmission optimizations (such as payload diffing to skip redundant uploads when data is unchanged, or reducing HTTP roundtrips), NEVER by altering, degrading, or limiting user-created data, image quality, or application settings.
