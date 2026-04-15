# Lista de Tareas

Prioridades asignadas según dependencia y criticidad: **Alta** (esencial para funcionamiento básico), **Media** (funcionalidades core), **Baja** (integraciones o mejoras).

#### Alta Prioridad

1. Configurar Supabase: Inicializar cliente de Supabase para autenticación y base de datos en el backend.
2. Implementar autenticación con Supabase: Registro, login, manejo de JWT y roles vía metadatos de usuario.
3. Definir y crear esquemas en Supabase: Tablas `products` y `affiliations` (usuarios gestionados en `auth.users`).
4. Configurar roles de usuario en Supabase: Lógica para asignar y verificar múltiples roles simultáneos (student, producer, affiliate, admin).

#### Media Prioridad

5. Implementar gestión de productos: CRUD para productos usando cliente de Supabase, con validaciones y estados.
6. Sistema de afiliados: Crear y gestionar afiliaciones con comisiones y códigos de referido vía Supabase.
7. Middleware de autorización: Verificar permisos por rol en rutas usando Supabase Auth.

#### Baja Prioridad

8. Integrar Lemon Squeezy para pagos: Configurar webhooks y delegar procesamiento como MoR.
9. Sistema de gamificación: Implementar niveles, XP y rankings basados en acciones de usuarios.
10. Analytics para producers: Endpoints para métricas de ventas y participación usando datos de Supabase.
