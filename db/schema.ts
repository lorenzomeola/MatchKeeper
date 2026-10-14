import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  doublePrecision,
  numeric,
  integer,
  smallint,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- Enums ---

export const userRole = pgEnum("user_role", ["player", "goalkeeper"]);
export const matchStatus = pgEnum("match_status", [
  "open",
  "assigned",
  "completed",
  "cancelled",
]);
export const applicationStatus = pgEnum("application_status", [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
]);
export const paymentStatus = pgEnum("payment_status", [
  "held",
  "released",
  "refunded",
  "failed",
  "pending",
  "partially_refunded",
  "disputed",
  "none",
]);
export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "under_review",
  "completed",
  "cancelled",
]);
export const cancelledBy = pgEnum("cancelled_by", [
  "team",
  "keeper",
  "system",
  "admin",
]);
export const teamResponse = pgEnum("team_response", [
  "confirmed",
  "reported_no_show",
  "reported_other",
]);

// --- Tablas ---

// 1:1 con auth.users de Supabase (mismo id que el usuario autenticado).
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  role: userRole("role").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  city: text("city"),
  // porteros: años jugando de portero. Jugadores: sin uso.
  experienceYears: integer("experience_years"),
  // porteros: nivel al que juegan. Equipos: nivel habitual de sus partidos.
  level: text("level"),
  // jugadores: "individual" (un jugador que organiza con amigos) o "team" (equipo con nombre).
  playerKind: text("player_kind"),
  // porteros: tramo de edad (18-24 | 25-34 | 35-44 | 45-54 | 55+).
  ageRange: text("age_range"),
  baseLat: doublePrecision("base_lat"),
  baseLng: doublePrecision("base_lng"),
  // solo aplica a porteros: se activa tras revisión manual del admin.
  approved: boolean("approved").notNull().default(false),
  // acceso al panel /admin — se setea a mano en la DB, nunca desde el cliente.
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.profileId] })],
);

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  address: text("address"),
  level: text("level"),
  // 5 a 11 jugadores por lado.
  format: smallint("format"),
  // grass | artificial | indoor | futsal
  surface: text("surface"),
  // preferencia opcional de edad del portero (mismos tramos que profiles.age_range); nunca bloquea aplicar.
  prefAgeMin: text("pref_age_min"),
  prefAgeMax: text("pref_age_max"),
  notes: text("notes"),
  budgetSuggested: numeric("budget_suggested", { precision: 10, scale: 2 }),
  // Porteros que necesita el partido (1 o 2). Baja solo al cancelar una reserva con otra aún vigente.
  keepersNeeded: smallint("keepers_needed").notNull().default(1),
  status: matchStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [check("matches_keepers_needed_chk", sql`${t.keepersNeeded} in (1, 2)`)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    goalkeeperId: uuid("goalkeeper_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
    message: text("message"),
    status: applicationStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // un portero solo puede aplicar una vez por partido.
    uniqueIndex("applications_match_goalkeeper_uq").on(
      t.matchId,
      t.goalkeeperId,
    ),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "restrict" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "restrict" }),
  goalkeeperId: uuid("goalkeeper_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "restrict" }),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  commissionPct: numeric("commission_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("15.00"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentStatus: paymentStatus("payment_status").notNull().default("held"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // --- Pagos (PAYMENTS_SPEC.md §9). Importes en peniques enteros, calculados en el servidor. ---
  // Default 'confirmed' mantiene el comportamiento actual; accept_application pasará a
  // 'pending_payment' explícito al implementar el cobro.
  status: bookingStatus("status").notNull().default("confirmed"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledBy: cancelledBy("cancelled_by"),
  cancellationChargePct: smallint("cancellation_charge_pct"),
  ratePence: integer("rate_pence"),
  platformFeePence: integer("platform_fee_pence"),
  totalPence: integer("total_pence"),
  keeperPayoutPence: integer("keeper_payout_pence"),
  keeperCheckedInAt: timestamp("keeper_checked_in_at", { withTimezone: true }),
  checkInLat: doublePrecision("check_in_lat"),
  checkInLng: doublePrecision("check_in_lng"),
  checkInDistanceM: integer("check_in_distance_m"),
  // Foto opcional del portero al llegar; el archivo vive en el bucket privado checkin-photos.
  checkInPhotoPath: text("check_in_photo_path"),
  checkInPhotoAt: timestamp("check_in_photo_at", { withTimezone: true }),
  teamResponse: teamResponse("team_response"),
  teamRespondedAt: timestamp("team_responded_at", { withTimezone: true }),
  teamReportNote: text("team_report_note"),
  autoReleaseAt: timestamp("auto_release_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  stripeChargeId: text("stripe_charge_id"),
  stripeTransferId: text("stripe_transfer_id"),
  stripeRefundId: text("stripe_refund_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  termsVersion: text("terms_version"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  },
  (t) => [
    // Un portero no puede tener dos reservas activas en el mismo partido. La capacidad (1 o 2) la fija accept_application.
    uniqueIndex("bookings_active_match_keeper_uq")
      .on(t.matchId, t.goalkeeperId)
      .where(sql`${t.status} <> 'cancelled'`),
  ],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  goalkeeperId: uuid("goalkeeper_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5, validar en la capa de app
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  // hilo 1 a 1: una conversación por aplicación.
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "cascade",
  }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messageReads = pgTable(
  "message_reads",
  {
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.applicationId, t.userId] })],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  reportedId: uuid("reported_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  reason: text("reason").notNull(),
  details: text("details"),
  // open | reviewed | dismissed
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const strikes = pgTable("strikes", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalkeeperId: uuid("goalkeeper_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, {
    onDelete: "set null",
  }),
  reason: text("reason").notNull(),
  // late_cancel | no_show
  kind: text("kind"),
  // Un admin puede anular un strike (error, lesión, campo cerrado): deja de contar pero queda registrado.
  waivedAt: timestamp("waived_at", { withTimezone: true }),
  waivedBy: uuid("waived_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  waivedReason: text("waived_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Cuenta de Stripe Connect del portero. Tabla aparte (y no columnas de profiles) porque
// profiles es legible por los equipos; esto solo lo lee su dueño y lo escribe el servidor.
export const keeperStripeAccounts = pgTable("keeper_stripe_accounts", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  // Último pago a su banco que Stripe no pudo hacer (webhook payout.failed); se borra con un payout.paid posterior.
  payoutFailedAt: timestamp("payout_failed_at", { withTimezone: true }),
  payoutFailure: text("payout_failure"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Registro de auditoría por reserva: solo se inserta, nunca se edita. Base de la evidencia de disputas.
export const bookingEvents = pgTable("booking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // null = el sistema
  actorId: uuid("actor_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeDisputeId: text("stripe_dispute_id").notNull().unique(),
  bookingId: uuid("booking_id").references(() => bookings.id, {
    onDelete: "set null",
  }),
  reason: text("reason"),
  status: text("status").notNull(),
  amountPence: integer("amount_pence").notNull(),
  dueBy: timestamp("due_by", { withTimezone: true }),
  evidenceSubmittedAt: timestamp("evidence_submitted_at", { withTimezone: true }),
  outcome: text("outcome"),
  // keeper | platform | unclear
  fault: text("fault"),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
  stripeChargeId: text("stripe_charge_id"),
  // Evidencia ya preparada, a la espera de que un admin la revise y la envíe: { stripe, checks }.
  evidence: jsonb("evidence"),
  evidenceGeneratedAt: timestamp("evidence_generated_at", { withTimezone: true }),
  // Estado de pago de la reserva antes de la disputa, para restaurarlo si se gana.
  prevPaymentStatus: text("prev_payment_status"),
  faultSetBy: uuid("fault_set_by").references(() => profiles.id, { onDelete: "set null" }),
  faultSetAt: timestamp("fault_set_at", { withTimezone: true }),
  // Recuperación del portero: reversión de su transferencia (o el error si Stripe no pudo).
  reversalId: text("reversal_id"),
  reversedPence: integer("reversed_pence").notNull().default(0),
  reversalError: text("reversal_error"),
  retransferId: text("retransfer_id"),
  retransferredAt: timestamp("retransferred_at", { withTimezone: true }),
  fundsWithdrawnAt: timestamp("funds_withdrawn_at", { withTimezone: true }),
  fundsReinstatedAt: timestamp("funds_reinstated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Lo que un portero debe a MatchKeeper tras una disputa perdida por su culpa y que no se pudo revertir.
// Se descuenta de sus próximos pagos (keeper_debt_deductions guarda cuánto en cada reserva).
export const keeperDebts = pgTable("keeper_debts", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalkeeperId: uuid("goalkeeper_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  disputeId: uuid("dispute_id").references(() => disputes.id, { onDelete: "set null" }),
  amountPence: integer("amount_pence").notNull(),
  recoveredPence: integer("recovered_pence").notNull().default(0),
  // open | settled | waived
  status: text("status").notNull().default("open"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export const keeperDebtDeductions = pgTable(
  "keeper_debt_deductions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => keeperDebts.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    amountPence: integer("amount_pence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("keeper_debt_deductions_debt_booking_uq").on(t.debtId, t.bookingId)],
);

// Ids de eventos de Stripe ya recibidos: evita procesar dos veces un webhook repetido.
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Cola de emails: cada aviso se anota antes de mandarse. La clave única evita duplicados si un evento se repite,
// y guarda el id de Resend para poder cancelar un envío programado (recordatorios, aviso de chat).
export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    template: text("template").notNull(),
    toEmail: text("to_email").notNull(),
    toUserId: uuid("to_user_id").references(() => profiles.id, { onDelete: "set null" }),
    // Datos de la plantilla.
    payload: jsonb("payload").notNull().default({}),
    sendAfter: timestamp("send_after", { withTimezone: true }).notNull().defaultNow(),
    // pending | sending | scheduled | sent | failed | cancelled | skipped
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerId: text("provider_id"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_outbox_due_idx").on(t.status, t.sendAfter)],
);
