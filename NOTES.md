# Monetra — Notas de Backend

> **Visión del producto:** Alternativa gamificada a Hotmart. Una plataforma donde productores, afiliados y estudiantes interactúan en un ecosistema de cursos digitales con mecánicas de juego (XP, niveles, logros, rankings) que impulsan la participación y las ventas.

---

## 1. Sistema de Autenticación

La autenticación es la columna vertebral del sistema. Cada acción en la plataforma pertenece a un usuario autenticado con un rol específico.

### 1.1 Roles

Un usuario puede tener múltiples roles simultáneamente:

| Rol         | Permisos principales                         |
| ----------- | -------------------------------------------- |
| `student`   | Comprar cursos, consumir contenido, ganar XP |
| `producer`  | Crear y vender productos, ver analytics      |
| `affiliate` | Promocionar productos con link de referido   |
| `admin`     | Gestión total de la plataforma               |

> Un mismo usuario puede ser `producer` + `affiliate` al mismo tiempo.

### 1.2 Flujo de autenticación

```
registro del usuario
↓
backend crea cuenta (contraseña hasheada con bcrypt)
↓
se genera JWT
↓
frontend almacena token (cookie segura / localStorage)
↓
token incluido en cada request posterior
↓
middleware verifica token y rol antes de permitir acción
```

### 1.3 Tabla `users`

```sql
id             UUID PRIMARY KEY
email          VARCHAR UNIQUE NOT NULL
password_hash  VARCHAR NOT NULL
name           VARCHAR
roles          TEXT[]          -- ['producer', 'affiliate']
avatar_url     VARCHAR
level          INT DEFAULT 1   -- sistema de niveles (gamificación)
xp             INT DEFAULT 0   -- experiencia acumulada
created_at     TIMESTAMP
```

### 1.4 Tecnologías recomendadas

- Runtime: **Node.js**
- Auth: **JWT** + cookies `httpOnly`
- Hashing: **bcrypt**
- Sesiones opcionales: **Redis**

---

## 2. Sistema de Productos

### 2.1 Tabla `products`

```sql
id             UUID PRIMARY KEY
producer_id    UUID REFERENCES users(id)
title          VARCHAR NOT NULL
description    TEXT
price          DECIMAL(10,2)
currency       VARCHAR DEFAULT 'USD'
status         ENUM('draft', 'published', 'archived')
thumbnail_url  VARCHAR
created_at     TIMESTAMP
```

### 2.2 Relación con afiliados

Cuando un afiliado quiere promocionar un producto, se crea un registro de afiliación con su comisión pactada.

#### Tabla `affiliations`

```sql
id                  UUID PRIMARY KEY
product_id          UUID REFERENCES products(id)
affiliate_id        UUID REFERENCES users(id)
commission_percent  DECIMAL(5,2)   -- ej: 20.00
referral_code       VARCHAR UNIQUE
status              ENUM('active', 'paused', 'revoked')
created_at          TIMESTAMP
```

---

## 3. Sistema de Pagos y Cobros (Lemon Squeezy como MoR)

Monetra **no procesa pagos directamente**. Usa **Lemon Squeezy** como Merchant of Record (MoR), lo que delega:

- Procesamiento de tarjetas
- Gestión de impuestos internacionales
- Detección de fraude y compliance
- Emisión de facturas

Monetra solo gestiona lo que ocurre **después** del pago: comisiones, wallets y retiros.

### 3.1 Flujo completo de una venta

```
cliente selecciona un curso
↓
redirige al checkout de Lemon Squeezy
↓
Lemon Squeezy procesa el pago
↓
Lemon Squeezy envía webhook al backend
↓
backend verifica la firma del webhook
↓
backend registra la venta
↓
backend detecta si hay afiliado (por referral_code)
↓
backend calcula y distribuye comisiones
↓
wallets internas se actualizan
```

### 3.2 Tabla `sales`

```sql
id              UUID PRIMARY KEY
product_id      UUID REFERENCES products(id)
buyer_id        UUID REFERENCES users(id)   -- puede ser null si compra como invitado
affiliate_id    UUID REFERENCES users(id)   -- null si no hay afiliado
amount          DECIMAL(10,2)               -- precio total pagado
currency        VARCHAR
status          ENUM('completed', 'refunded', 'disputed', 'chargeback')
lemon_order_id  VARCHAR UNIQUE              -- ID del pedido en Lemon Squeezy
created_at      TIMESTAMP
```

### 3.3 Distribución de comisiones (ejemplo)

```
Precio del curso: $100

Productor  →  70%  →  $70
Afiliado   →  20%  →  $20
Plataforma →  10%  →  $10
```

> Los porcentajes son configurables por producto. Si no hay afiliado, su parte se redistribuye (ej: 80% productor / 20% plataforma).

---

## 4. Wallets Internas

Las wallets son registros contables en la base de datos. **No representan dinero en banco todavía**, sino saldos ganados pendientes de retiro.

### 4.1 Tabla `wallets`

```sql
user_id            UUID PRIMARY KEY REFERENCES users(id)
pending_balance    DECIMAL(10,2) DEFAULT 0   -- en período de espera (ej: 14 días)
available_balance  DECIMAL(10,2) DEFAULT 0   -- listo para retirar
paid_balance       DECIMAL(10,2) DEFAULT 0   -- total retirado históricamente
currency           VARCHAR DEFAULT 'USD'
updated_at         TIMESTAMP
```

### 4.2 Estados del dinero

| Estado      | Descripción                                                | Duración típica            |
| ----------- | ---------------------------------------------------------- | -------------------------- |
| `pending`   | Recién ingresado. Sujeto a reembolso, fraude o contracargo | 14 días                    |
| `available` | Libre para retirar                                         | Indefinido hasta el retiro |
| `paid`      | Ya retirado por el usuario                                 | Histórico                  |

### 4.3 Tabla `transactions`

Registro de cada movimiento que afecta una wallet:

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
sale_id     UUID REFERENCES sales(id)
type        ENUM('commission', 'payout', 'refund', 'adjustment')
role        ENUM('producer', 'affiliate', 'platform')
amount      DECIMAL(10,2)
status      ENUM('pending', 'available', 'paid', 'reversed')
available_at TIMESTAMP                  -- cuándo pasa de pending a available
created_at  TIMESTAMP
```

---

## 5. Sistema de Retiros (Payouts)

### 5.1 Flujo de retiro

```
usuario autenticado solicita retiro
↓
backend verifica que available_balance >= monto mínimo
↓
se crea registro de payout con status 'pending'
↓
backend (o job programado) procesa el pago externo
↓
wallet se actualiza: available_balance -= monto, paid_balance += monto
↓
payout cambia a status 'completed'
```

### 5.2 Tabla `payouts`

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
amount      DECIMAL(10,2)
method      ENUM('paypal', 'bank_transfer', 'wise', 'payoneer')
status      ENUM('pending', 'processing', 'completed', 'failed')
reference   VARCHAR                     -- ID de transacción en el método de pago
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### 5.3 Métodos de pago soportados

- PayPal
- Transferencia bancaria (SWIFT/SEPA)
- Wise
- Payoneer

---

## 6. Sistema de Gamificación ⚡

Este es el diferenciador clave frente a Hotmart. La plataforma incorpora mecánicas de juego para motivar a estudiantes, productores y afiliados.

### 6.1 Experiencia (XP) y Niveles

Los usuarios acumulan XP al completar acciones:

| Acción                            | XP ganado |
| --------------------------------- | --------- |
| Completar una lección             | +10 XP    |
| Completar un módulo               | +50 XP    |
| Completar un curso                | +200 XP   |
| Primera venta (productor)         | +500 XP   |
| Referir a un comprador (afiliado) | +100 XP   |
| Reseña verificada                 | +30 XP    |
| Racha de 7 días consecutivos      | +150 XP   |

### 6.2 Tabla `xp_events`

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
event_type  VARCHAR          -- 'lesson_complete', 'course_complete', 'sale_made', etc.
xp_amount   INT
reference_id UUID            -- lección, curso, venta, etc.
created_at  TIMESTAMP
```

### 6.3 Logros (Badges)

```sql
-- Tabla badges
id           UUID PRIMARY KEY
name         VARCHAR
description  TEXT
icon_url     VARCHAR
condition    JSONB            -- reglas para otorgar el badge

-- Tabla user_badges
id           UUID PRIMARY KEY
user_id      UUID REFERENCES users(id)
badge_id     UUID REFERENCES badges(id)
earned_at    TIMESTAMP
```

Ejemplos de badges:

- 🔥 **Racha de 30 días** — acceso diario por 30 días
- 💰 **Primera venta** — primer producto vendido
- 🌟 **Top Afiliado** — top 10 del mes en comisiones
- 🎓 **Graduado** — primer curso completado

### 6.4 Rankings / Leaderboards

```sql
id           UUID PRIMARY KEY
type         ENUM('sales', 'affiliates', 'learners')   -- tipo de ranking
user_id      UUID REFERENCES users(id)
score        DECIMAL(10,2)
period       VARCHAR          -- 'monthly', 'weekly', 'all_time'
rank         INT
updated_at   TIMESTAMP
```

Rankings sugeridos:

- **Top Productores** del mes (por ventas)
- **Top Afiliados** del mes (por comisiones)
- **Top Estudiantes** (por XP)

### 6.5 Rachas (Streaks)

```sql
user_id         UUID PRIMARY KEY REFERENCES users(id)
current_streak  INT DEFAULT 0
longest_streak  INT DEFAULT 0
last_activity   DATE
```

---

## 7. Arquitectura de Tablas (Resumen)

```
users
 ├── products (producer_id)
 ├── affiliations (affiliate_id)
 ├── sales (buyer_id, affiliate_id)
 ├── wallets (user_id)
 ├── transactions (user_id)
 ├── payouts (user_id)
 ├── xp_events (user_id)
 ├── user_badges (user_id)
 ├── leaderboards (user_id)
 └── streaks (user_id)
```

---

## 8. División de Responsabilidades

| Lemon Squeezy                | Monetra Backend                      |
| ---------------------------- | ------------------------------------ |
| Checkout y pagos con tarjeta | Registro de ventas                   |
| Facturación automática       | Cálculo y distribución de comisiones |
| Impuestos internacionales    | Wallets internas                     |
| Detección de fraude          | Sistema de afiliados                 |
| Reembolsos (flujo externo)   | Procesamiento de retiros (payouts)   |
| —                            | Gamificación (XP, badges, rankings)  |
| —                            | Analytics de productores             |

---

## 9. Flujo Completo de la Plataforma

```
usuario se registra
↓
elige rol (estudiante / productor / afiliado)
↓
[productor] crea y publica un producto
↓
[afiliado] genera su link de referido
↓
[cliente] hace clic en link de afiliado y compra
↓
checkout en Lemon Squeezy
↓
webhook → backend registra venta
↓
comisiones calculadas y distribuidas en wallets
↓
todos reciben notificación
↓
[gamificación] se otorga XP y se actualizan rankings
↓
[estudiante] consume el curso y acumula XP
↓
[productor / afiliado] solicita retiro cuando el saldo está disponible
```

---

## 10. Consideraciones Técnicas Clave

- **Webhooks de Lemon Squeezy** deben validarse con firma HMAC antes de procesar.
- **Jobs programados** (cron): mover saldos de `pending` a `available` al cumplirse el período de espera, y actualizar rankings periódicamente.
- **Idempotencia**: los webhooks pueden llegar duplicados; usar `lemon_order_id` como clave única para evitar doble registro.
- **Multi-currency**: preparar el sistema para manejar USD como moneda base, con soporte futuro a otras divisas.
- **Soft deletes**: no eliminar registros de ventas ni wallets; usar flags `deleted_at` para auditoría.
