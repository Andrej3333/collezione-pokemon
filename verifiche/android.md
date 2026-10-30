# App Android

Eseguito: 2026-10-30 03:33 UTC, versione 1.1

- **errore**, ultime righe:

```
::add-mask::c29639e61a7d60252fd88cf133720bd5

added 180 packages, and audited 181 packages in 4s

25 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

> collezione-pokemon@0.1.0 build
> tsc -b && vite build

[36mvite v8.3.5 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 101 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.76 kB │ gzip:   0.43 kB
dist/assets/index-j-HlVkd5.css    6.80 kB │ gzip:   1.98 kB
dist/assets/index-DDkuwT64.js   632.62 kB │ gzip: 178.36 kB

[33m[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 250ms[39m
[InAppBrowser] HTTP proxy swizzle omitted (already up to date).
✔ Copying web assets from dist to android/app/src/main/assets/public in 5.32ms
✔ Creating capacitor.config.json in android/app/src/main/assets in 656.24μs
✔ copy android in 18.46ms
✔ Updating Android plugins in 2.62ms
[info] Found 1 Capacitor plugin for android:
       @capgo/capacitor-inappbrowser@8.27.0
✔ update android in 31.63ms
[info] Sync finished in 0.105s
Downloading https://services.gradle.org/distributions/gradle-8.14.3-all.zip
.....................10%.....................20%......................30%.....................40%......................50%.....................60%.....................70%......................80%.....................90%......................100%

FAILURE: Build failed with an exception.

* Where:
Build file '/home/runner/work/collezione-pokemon/collezione-pokemon/app/android/app/build.gradle' line: 11

* What went wrong:
A problem occurred evaluating project ':app'.
> Value is null

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 31s
```
