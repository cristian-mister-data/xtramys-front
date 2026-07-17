# Ficha de privacidad y revisión de tiendas — Xtramys

Actualizado: 17 de julio de 2026. Esta guía describe la versión móvil de solo acceso: no crea cuentas, no vende ni gestiona pagos y no incluye publicidad ni seguimiento.

## Google Play: Seguridad de los datos

- ¿La aplicación recoge o comparte datos de los tipos requeridos?: **Sí**.
- ¿Todos los datos se cifran en tránsito?: **Sí**. La app usa HTTPS/TLS para API, archivos y web legal.
- ¿La app permite crear cuentas?: **Mi aplicación no permite que los usuarios creen una cuenta**. El registro no está disponible ni enlazado desde la app móvil.
- URL de eliminación de cuentas: `https://xtramys.com/es/eliminar-cuenta`
- ¿Comparte datos?: **No**. Los proveedores de infraestructura que procesan datos por cuenta de Xtramys no se declaran como “compartición”. No hay venta, anuncios ni tracking.

Declara estos datos como **recogidos**, **cifrados en tránsito**, **no compartidos** y **vinculados al usuario**:

| Tipo de Play Console | Finalidad | Obligatorio |
| --- | --- | --- |
| Información personal: nombre, correo, ID de usuario y otra información personal | Funcionalidad de la app y gestión de cuenta | Nombre, correo e ID: sí; el resto: no |
| Salud y actividad física: información de salud y datos de fitness | Funcionalidad de rendimiento, wellness, nutrición, lesiones y rehabilitación | No |
| Fotos y vídeos | Funcionalidad de la app cuando el usuario los sube o crea | No |
| Archivos y documentos | Funcionalidad de la app cuando el usuario los adjunta o exporta | No |
| Contenido generado por el usuario | Funcionalidad de la app: equipos, jugadores, ejercicios, estrategias, entrenamientos e informes | No |
| Historial de compras | Funcionalidad de la app: mostrar el estado de acceso ya contratado fuera de la app | No |

No selecciones ubicación, contactos, mensajes, audio/micrófono, información financiera, identificadores de dispositivo, ID publicitario, diagnósticos, datos de rendimiento de la app, actividad de navegación ni tracking. Si se añade cualquier SDK o permiso nuevo, actualiza esta tabla antes de subir una versión.

Completa también la declaración de Salud de Play con las funciones reales: actividad y fitness, nutrición y control de peso, sueño, estrés y gestión de lesiones/rehabilitación. Indica que los datos se usan para gestión deportiva; Xtramys no es un dispositivo médico ni ofrece diagnóstico o tratamiento.

## App Store Connect: App Privacy

Marca **No** en “Data Used to Track You”. Declara como “Data Linked to You” y con finalidad “App Functionality”:

- Contact Info: Name, Email Address.
- Identifiers: User ID.
- Health & Fitness: Health, Fitness.
- User Content: Photos or Videos, Other User Content, Documents/Files cuando corresponda en el formulario.
- Purchases: Purchase History, solo para el estado de acceso contratado fuera de la app.

No declares publicidad, tracking, contactos, ubicación, audio, información financiera ni identificadores de dispositivo. En las notas de revisión explica: “Xtramys es una app de acceso y consumo. No permite crear cuentas ni comprar, suscribirse o gestionar pagos dentro de la app. El usuario inicia sesión con una cuenta ya creada. La eliminación de cuenta se inicia en Perfil > Eliminar cuenta y se confirma por correo en un máximo de 30 días.”

## Antes de enviar a revisión

1. Publica la web y comprueba que `https://xtramys.com/es/eliminar-cuenta` responde sin iniciar sesión.
2. Configura `SUPPORT_EMAIL` con un buzón atendido. Cada solicitud llega a ese buzón y debe completarse y confirmarse en el plazo publicado.
3. Entrega una cuenta de demostración activa en las notas de revisión de Apple y Play si la revisión necesita iniciar sesión.
4. Mantén visibles en la ficha de ambas tiendas la política de privacidad y la URL de eliminación de cuenta.
5. Vuelve a ejecutar `npm run check:mobile-subscriptions` antes de generar cada binario.
