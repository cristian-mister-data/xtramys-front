# Pipeline iOS

Xtramys usa Capacitor 8 con Swift Package Manager. El proyecto nativo de
`ios/App` forma parte del repositorio; `npx cap sync ios` actualiza sus recursos
web y `ios/App/CapApp-SPM/Package.swift`. No se usan CocoaPods ni Fastlane.

## Flujo

Cada `push` a `main` ejecuta `.github/workflows/ios.yml`:

1. Instala Node.js 22 y las dependencias con `npm ci`.
2. Compila Vite y sincroniza Capacitor.
3. Resuelve los paquetes Swift con Xcode 26.
4. Importa temporalmente el certificado y el perfil de distribucion.
5. Firma y archiva `ios/App/App.xcodeproj` con el numero de build de GitHub.
6. Exporta el IPA y lo conserva como artefacto durante 14 dias.
7. Sube el IPA con `xcrun altool` y una clave de App Store Connect.

El workflow tambien puede iniciarse manualmente desde GitHub Actions.

## Secretos de GitHub

Configura estos secretos en `Settings > Secrets and variables > Actions`:

- `APPLE_CERTIFICATE_BASE64`: contenido Base64 del certificado `.p12`.
- `APPLE_CERTIFICATE_PASSWORD`: contrasena del `.p12`.
- `APPLE_PROVISION_PROFILE_BASE64`: contenido Base64 del `.mobileprovision`.
- `APPLE_TEAM_ID`: Team ID de Apple Developer.
- `BUNDLE_IDENTIFIER`: `com.xtramys.app`.
- `APPSTORE_API_KEY_ID`: Key ID de la clave de App Store Connect.
- `APPSTORE_ISSUER_ID`: Issuer ID de App Store Connect.
- `APPSTORE_API_PRIVATE_KEY`: contenido completo del archivo `AuthKey_*.p8`.

Usa una clave de equipo de App Store Connect con rol `App Manager`. El archivo
`.p8` solo puede descargarse una vez al crear la clave.

## Archivos versionados

Se versionan el proyecto Xcode, los fuentes Swift, storyboards, assets,
`PrivacyInfo.xcprivacy`, `CapApp-SPM` y `ios/ExportOptions.plist`. Permanecen
ignorados los recursos web copiados por Capacitor, builds, `DerivedData`, Pods,
perfiles, certificados, claves privadas e IPA.

No se debe ejecutar `npx cap add ios` en CI ni reconstruir `ios/` en cada build:
eso descartaria configuracion nativa, permisos, iconos y futuros cambios de
Xcode. Los cambios de plugins se incorporan ejecutando `npx cap sync ios` y
subiendo el `Package.swift` actualizado.

## Referencias

- [Capacitor 8 y Swift Package Manager](https://capacitorjs.com/docs/ios/spm)
- [Requisitos de Capacitor 8](https://capacitorjs.com/docs/updating/8-0)
- [Firma de Xcode en GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications)
- [Subida de builds a App Store Connect](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
