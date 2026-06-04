import { requireSession } from "../permissions";
import { createDate, createEvent, eventView } from ".";
import { CliError } from "../../parser";
import { flagString } from "../../flags";
import { commandResponse } from "../response";
import { createTicket } from "../tickets";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";
import type { IdStore } from "../../data";
import type { TicketData } from "../tickets";

@RequiresPermission("write")
export class CreateEvent implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const token = requireSession(state);
    const event = createEvent(state, token.accountId, command.flags);
    const firstDate = flagString(command.flags, "date");
    const ticket = flagString(command.flags, "ticket");

    state.events.push(event);
    if (firstDate) {
      state.dates.push(createDate(state, event.id, { ...command.flags, starts: firstDate }));
    }
    if (ticket) state.tickets.push(createTicketFromSpec(state, event.id, ticket));

    return commandResponse(command, "Create event", eventView(state, event));
  }
}

function createTicketFromSpec(
  store: IdStore,
  eventId: string,
  spec: string,
): TicketData {
  const [name, rawPrice, rawStock] = spec.split(":");
  const price = Number(rawPrice);
  const stock = Number(rawStock);
  if (!name || !Number.isFinite(price) || !Number.isInteger(stock)) {
    throw new CliError(
      '--ticket must use "Name:price:stock", for example "General:10000:500"',
      "validation_error",
    );
  }
  return createTicket(store, eventId, { name, price: String(price), stock: String(stock) });
}
