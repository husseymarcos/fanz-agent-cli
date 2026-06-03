import { nextId } from "../../data";
import { requirePermission } from "../../auth";
import { eventView, findEvent } from "../../events";
import { flagString } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";
import type { EventData } from "../../events";

export class DuplicateEvent implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const source = findEvent(state, command.subject);
    const newId = nextId(state, "EVT");
    const name = flagString(command.flags, "name", `${source.name} copia`) ?? `${source.name} copia`;
    const copy: EventData = {
      ...source,
      id: newId,
      name,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.events.push(copy);
    state.dates
      .filter((date) => date.eventId === source.id)
      .forEach((date) =>
        state.dates.push({ ...date, id: nextId(state, "DAT"), eventId: newId, status: "draft" }),
      );
    state.tickets
      .filter((ticket) => ticket.eventId === source.id)
      .forEach((ticket) =>
        state.tickets.push({
          ...ticket,
          id: nextId(state, "TCK"),
          eventId: newId,
          sold: 0,
          status: "active",
        }),
      );
    state.discounts
      .filter((discount) => discount.eventId === source.id)
      .forEach((discount) =>
        state.discounts.push({
          ...discount,
          id: nextId(state, "DSC"),
          eventId: newId,
          uses: 0,
          status: "paused",
        }),
      );

    return commandResponse(command, "Duplicate event", eventView(state, copy));
  }
}
