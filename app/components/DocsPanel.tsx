import type { ReactNode } from "react";

const CLI_COMMANDS = [
  "fanz login --token mock_admin",
  "fanz auth whoami --json",
  "fanz events list --json",
  "fanz tickets list --event EVT_100 --json",
  "fanz sales summary --event EVT_100 --json",
  "fanz audit list --json",
];

const PRODUCT_AREAS = [
  {
    title: "Terminal como foco",
    body: "La experiencia principal es escribir y ejecutar comandos. El panel lateral existe para guiar la prueba, pero no reemplaza la terminal.",
  },
  {
    title: "Flujo guiado",
    body: "El sidebar ordena el recorrido end-to-end para que se pueda probar autenticacion, eventos, tickets, descuentos, ventas, ordenes y auditoria sin pedir instrucciones extra.",
  },
  {
    title: "Salida para humanos y agentes",
    body: "Los comandos muestran respuestas legibles en terminal y tambien soportan JSON para validar resultados de forma programatica.",
  },
  {
    title: "Demo autocontenida",
    body: "No hay APIs reales ni credenciales externas. Todo el estado es mock, local y se puede resetear para repetir la evaluacion.",
  },
];

const LIMITATIONS = [
  "Hay una sola cuenta mock; no existe flujo de cambio de cuenta.",
  "Las ventas y ordenes son datos seed; no hay checkout ni simulacion de pagos.",
  "La exportacion CSV devuelve el contenido en la respuesta en vez de descargar un archivo.",
  "La terminal esta pensada para evaluacion en navegador, no para fidelidad total de una shell nativa.",
  "No hay llamadas a APIs externas; todo el comportamiento es deterministico y local.",
];

const ASSUMPTIONS = [
  "Quien evalua necesita ver salida legible para humanos y tambien respuestas JSON parseables.",
  "El flujo completo deberia poder probarse sin setup extra mas alla de abrir la app.",
  "Los comandos destructivos tienen que ser explicitos incluso en un entorno mock.",
  "La demo tiene que comunicar claramente reglas de negocio, permisos y estados de error.",
];

const REPOSITORY_URL = "https://github.com/husseymarcos/fanz-agent-cli";

export function DocsPanel() {
  return (
    <article className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-dark-card)">
      <header className="border-b border-(--color-border) bg-black/20 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--color-accent-light)">Docs</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight text-white">Documentacion de Fanz Agent CLI</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-(--color-light)">
          Esta pagina resume el enfoque de producto, las decisiones principales, los supuestos y las limitaciones de la
          demo. La implementacion usa Next.js porque es el mismo stack del equipo, y esta pensada para desplegarse en
          Vercel.
        </p>
        <a
          className="mt-5 inline-flex rounded-lg border border-(--color-border-light) bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-(--color-accent-light)"
          href={REPOSITORY_URL}
          rel="noreferrer"
          target="_blank"
        >
          Ver repo en GitHub
        </a>
      </header>

      <div className="max-w-6xl space-y-10 px-6 py-8">
        <DocSection id="overview" title="Resumen">
          <p>
            Fanz Agent CLI es una CLI mock para operar una cuenta de ticketing desde una terminal web. La terminal es la
            interfaz principal y el flujo esta pensado para que cualquier evaluador pueda probarlo sin contexto previo.
          </p>
          <p>
            La demo cubre autenticacion, creacion de eventos, fechas, tipos de ticket, descuentos, resumenes de venta,
            reenvio de ordenes, guardrails destructivos e historial de auditoria. La mayoria de los comandos soportan
            <code>--json</code> para que el mismo flujo lo pueda evaluar una persona o un agente.
          </p>
        </DocSection>

        <DocSection id="approach" title="Enfoque">
          <p>
            Lo pense como una CLI primero y una app web despues. La terminal mantiene el foco de la experiencia, mientras
            que el sidebar funciona como una guia para recorrer el flujo completo sin tener que leer instrucciones
            externas.
          </p>
          <p>
            La app esta hecha en Next.js porque coincide con el stack esperado y facilita un deploy directo en Vercel.
            Evite depender de servicios externos para que la demo sea estable y facil de revisar.
          </p>
        </DocSection>

        <DocSection id="architecture" title="Estructura de la experiencia">
          <div className="space-y-3">
            {PRODUCT_AREAS.map((item) => (
              <section className="rounded-lg border border-(--color-border) bg-(--color-dark) p-4" key={item.title}>
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                <p className="mt-2 text-sm leading-6 text-(--color-light)">{item.body}</p>
              </section>
            ))}
          </div>
        </DocSection>

        <DocSection id="commands" title="Modelo de comandos">
          <p>
            Los comandos siguen un formato consistente: accion, entidad, parametros y flags. La idea es que el usuario
            pueda inferir comandos nuevos a partir de los ejemplos, y que los errores sean accionables.
          </p>
          <div className="mt-4 rounded-lg border border-(--color-border) bg-black/30 p-4">
            <div className="space-y-2">
              {CLI_COMMANDS.map((command) => (
                <code className="block rounded-md bg-(--color-dark) px-3 py-2 text-xs leading-5 text-white" key={command}>
                  {command}
                </code>
              ))}
            </div>
          </div>
        </DocSection>

        <DocSection id="state" title="Estado y datos">
          <p>
            La demo usa datos mock para representar una cuenta de ticketing con eventos, fechas, tickets, descuentos,
            ventas, ordenes y auditoria. No se conecta con datos reales ni necesita credenciales externas.
          </p>
          <p>
            El estado se mantiene en el navegador para que la prueba sea fluida. El boton Reset vuelve al punto de inicio
            y permite repetir el flujo completo.
          </p>
        </DocSection>

        <DocSection id="guardrails" title="Guardrails">
          <p>
            Las acciones destructivas son deliberadamente explicitas. Los deletes requieren <code>--dry-run</code> o
            <code>--yes</code>, y los eventos con ordenes pagas no se pueden borrar ni siquiera con confirmacion.
          </p>
          <p>
            Los permisos tambien forman parte del flujo: <code>mock_admin</code> puede hacer todo, <code>mock_ops</code>
            opera sin permisos de delete y <code>mock_viewer</code> es solo lectura.
          </p>
        </DocSection>

        <DocSection id="testing" title="Testing">
          <p>
            La validacion se enfoca en comportamiento: parsing de comandos, respuestas, permisos, dry-run, errores,
            ventas, ordenes, descuentos y auditoria.
          </p>
          <p>
            Para evaluar manualmente, el sidebar propone un recorrido completo y cada comando puede ejecutarse desde la
            terminal para inspeccionar el resultado.
          </p>
        </DocSection>

        <DocSection id="assumptions" title="Supuestos">
          <ul>
            {ASSUMPTIONS.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </DocSection>

        <DocSection id="limitations" title="Limitaciones">
          <ul>
            {LIMITATIONS.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </DocSection>
      </div>
    </article>
  );
}

function DocSection({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-6 space-y-4 text-sm leading-7 text-(--color-light)" id={id}>
      <h3 className="text-xl font-extrabold text-white">{title}</h3>
      {children}
    </section>
  );
}
