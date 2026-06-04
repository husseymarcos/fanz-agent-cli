# Fanz Agent CLI

Demo web de un CLI mock para operar una cuenta de ticketing desde una terminal en el navegador. El objetivo es que una persona o un agente pueda ejecutar comandos estables, con errores accionables y salida parseable usando `--json`.

## Probar localmente

```bash
bun install
bun run dev
```

Abrir `http://localhost:3000`.

## Credenciales mock

- `mock_admin`: `read`, `write`, `delete`, `export`, `resend`
- `mock_ops`: `read`, `write`, `export`, `resend`
- `mock_viewer`: `read`

## Flujo end-to-end

```bash
fanz login --token mock_admin
fanz auth whoami --json
fanz events create --name "Fiesta Demo" --description "Evento creado desde la prueba" --location "C Complejo Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json
fanz events list --json
fanz dates create --event EVT_101 --starts 2026-07-21T23:00:00Z --venue "Art Media" --json
fanz tickets create --event EVT_101 --name VIP --price 25000 --stock 80 --json
fanz tickets update TCK_102 --price 12000 --stock 450 --json
fanz discounts create --event EVT_101 --code DEMO20 --percent 20 --max-uses 100 --json
fanz orders create --event EVT_101 --ticket TCK_102 --buyer-email buyer@example.test --quantity 2 --json
fanz sales summary --event EVT_101 --json
fanz sales summary --event EVT_100 --json
fanz sales list --event EVT_100 --json
fanz orders show ORD_100 --json
fanz orders resend ORD_100 --email comprador@example.test --json
fanz audit list --json
```

## Guardrails

```bash
fanz events delete EVT_101 --dry-run --json
fanz events delete EVT_101 --yes --json
fanz login --token mock_viewer
fanz tickets create --event EVT_100 --name Campo --price 9000 --stock 100 --json
```

El primer comando muestra un preview sin aplicar cambios. El segundo requiere `--yes` porque borra datos. El ultimo falla porque `mock_viewer` no tiene permiso de escritura.

## Agent contract

- Usar `--json` para respuestas parseables y sin tablas.
- Las respuestas JSON incluyen `schemaVersion`, `command`, `code`, `hint`, `resource`, `warnings`, `data` y `exitCode`.
- Descubrir comandos con `fanz commands list --json`.
- Inspeccionar un contrato con `fanz commands describe orders.create --json`.
- Las acciones de escritura relevantes soportan `--dry-run`; las destructivas requieren `--yes`.
- `fanz orders create` genera una orden mock pagada, emite tickets y actualiza ventas/stock para probar un evento creado desde cero.

## Decisiones

- El motor CLI vive en `lib` y no depende de React ni de xterm.js.
- La web usa xterm.js solo como interfaz de entrada/salida.
- El estado mock se persiste en `localStorage` para que el flujo sea repetible dentro del navegador.
- No hay datos reales ni llamadas externas.

## Limitaciones

- Es una cuenta mock single-tenant.
- Las ventas son seed data; no hay checkout real.
- La exportacion CSV se devuelve como string en JSON en vez de descargar un archivo.
