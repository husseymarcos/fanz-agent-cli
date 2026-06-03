import * as AuditList from "./admin/AuditList";
import * as ResetAccount from "./admin/ResetAccount";
import * as Login from "./auth/Login";
import * as Whoami from "./auth/Whoami";
import * as CreateDate from "./dates/CreateDate";
import * as DeleteDate from "./dates/DeleteDate";
import * as ListDates from "./dates/ListDates";
import * as UpdateDate from "./dates/UpdateDate";
import * as CreateDiscount from "./discounts/CreateDiscount";
import * as DeleteDiscount from "./discounts/DeleteDiscount";
import * as ListDiscounts from "./discounts/ListDiscounts";
import * as UpdateDiscount from "./discounts/UpdateDiscount";
import * as CreateEvent from "./events/CreateEvent";
import * as DeleteEvent from "./events/DeleteEvent";
import * as DuplicateEvent from "./events/DuplicateEvent";
import * as ListEvents from "./events/ListEvents";
import * as PauseEvent from "./events/PauseEvent";
import * as ResumeEvent from "./events/ResumeEvent";
import * as UpdateEvent from "./events/UpdateEvent";
import * as Help from "./help/Help";
import * as ResendOrder from "./orders/ResendOrder";
import * as ShowOrder from "./orders/ShowOrder";
import * as ExportSales from "./sales/ExportSales";
import * as ListSales from "./sales/ListSales";
import * as SummarySales from "./sales/SummarySales";
import * as CreateTicket from "./tickets/CreateTicket";
import * as DeleteTicket from "./tickets/DeleteTicket";
import * as ListTickets from "./tickets/ListTickets";
import * as UpdateTicket from "./tickets/UpdateTicket";

export type CommandModule = {
  route: string;
  [exportName: string]: unknown;
};

export const commandModules: CommandModule[] = [
  Help,
  Login,
  Whoami,
  AuditList,
  ResetAccount,
  ListEvents,
  CreateEvent,
  UpdateEvent,
  PauseEvent,
  ResumeEvent,
  DuplicateEvent,
  DeleteEvent,
  ListDates,
  CreateDate,
  UpdateDate,
  DeleteDate,
  ListTickets,
  CreateTicket,
  UpdateTicket,
  DeleteTicket,
  ListDiscounts,
  CreateDiscount,
  UpdateDiscount,
  DeleteDiscount,
  ListSales,
  SummarySales,
  ExportSales,
  ShowOrder,
  ResendOrder,
];
