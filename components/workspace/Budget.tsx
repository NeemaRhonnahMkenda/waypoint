"use client";

import { useState } from "react";
import { balances, currenciesUsed, settleUp, summarise, useRates } from "../../lib/money";
import { updateTrip } from "../../lib/store";
import { CATEGORIES, CATEGORY_LABEL, type Category, type Expense, type LocalTrip, type Trip } from "../../lib/types";
import { cx, fmtDate, fmtMoney } from "../../lib/util";
import { BalanceChart, CategoryBars, SpendByDay } from "../charts";
import { Icon } from "../icons";
import { Avatar, Button, Card, CatIcon, Empty, Field, Modal, Segmented, SectionTitle, inputCls, useReadOnly } from "../ui";
import ExpenseModal from "./ExpenseModal";

export default function Budget({ lt }: { lt: LocalTrip }) {
  const { trip } = lt;
  const ro = useReadOnly();
  const others = currenciesUsed(trip);
  const rates = useRates(trip.currency, others.length > 0);
  const sum = summarise(trip, rates);
  const [by, setBy] = useState<"person" | "family">("person");
  const [editing, setEditing] = useState<{ e?: Expense; key: number } | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const bal = balances(trip, rates, by);
  const transfers = settleUp(bal);
  const remaining = trip.budget.total - sum.spentTotal;
  const cur = trip.currency;

  return (
    <div className="grid gap-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { k: "Budget", v: trip.budget.total ? fmtMoney(trip.budget.total, cur) : "Not set" },
          { k: "Spent", v: fmtMoney(sum.spentTotal, cur) },
          {
            k: remaining >= 0 ? "Left to spend" : "Over budget",
            v: trip.budget.total ? fmtMoney(Math.abs(remaining), cur) : "–",
            warn: trip.budget.total > 0 && remaining < 0,
          },
          { k: "Committed in plans", v: fmtMoney(sum.plannedTotal, cur) },
        ].map((s) => (
          <Card key={s.k} className="p-4 sm:p-5">
            <p className={cx("inline-flex items-center gap-1 text-xs font-medium sm:text-sm", s.warn ? "text-[var(--critical)]" : "text-muted")}>
              {s.warn ? <Icon.Alert className="size-4" /> : null}
              {s.k}
            </p>
            <p className="mt-1 font-display text-xl font-extrabold sm:text-2xl">{s.v}</p>
          </Card>
        ))}
      </div>

      {others.length ? (
        <p className="-mt-2 text-xs text-muted">
          {rates === null
            ? "Loading exchange rates…"
            : sum.unconverted
              ? `${sum.unconverted} item(s) couldn't be converted to ${cur} and are left out of totals.`
              : `Converted from ${others.join(", ")} to ${cur} at today's rates (open.er-api.com).`}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionTitle
            title="Budget vs spent"
            action={
              ro ? null : (
                <Button size="sm" icon="Pencil" onClick={() => setBudgetOpen(true)}>
                  {trip.budget.total ? "Edit budget" : "Set budget"}
                </Button>
              )
            }
          />
          <CategoryBars
            budget={trip.budget.categories as Record<Category, number>}
            spent={sum.spentByCategory}
            committed={sum.plannedByCategory}
            currency={cur}
          />
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionTitle title="Spending by day" />
          <SpendByDay data={sum.spentByDay} currency={cur} />
        </Card>
      </div>

      {/* Who owes whom */}
      <Card className="p-5 sm:p-6">
        <SectionTitle
          title="Who owes whom"
          sub="Blue is owed money, red owes money."
          action={
            trip.families.length ? (
              <Segmented
                label="Group balances by"
                value={by}
                onChange={setBy}
                options={[
                  { value: "person", label: "By person" },
                  { value: "family", label: "By family" },
                ]}
              />
            ) : null
          }
        />
        {trip.expenses.length ? (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <BalanceChart data={bal} currency={cur} />
            <div>
              <h3 className="mb-3 text-sm font-medium">To settle up</h3>
              {transfers.length ? (
                <ul className="grid gap-2">
                  {transfers.map((t, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 text-sm">
                      <span>
                        <strong>{t.from}</strong> pays <strong>{t.to}</strong>
                      </span>
                      <span className="font-display font-semibold">{fmtMoney(t.amount, cur)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent"><Icon.Check className="size-4" strokeWidth={3} /> Everyone is square</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Log who paid for what and Waypoint works out the fairest way to settle up.</p>
        )}
      </Card>

      {/* Expenses */}
      <section>
        <SectionTitle
          title="Expenses"
          sub={`${trip.expenses.length} logged`}
          action={
            ro ? null : (
              <Button variant="primary" icon="Plus" onClick={() => setEditing({ key: Date.now() })}>
                Log expense
              </Button>
            )
          }
        />
        {trip.expenses.length ? (
          <Card className="divide-y divide-line">
            {[...trip.expenses]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((e) => {
                const payer = trip.members.find((m) => m.id === e.paidBy);
                const Row = ro ? "div" : "button";
                return (
                  <Row
                    key={e.id}
                    {...(ro ? {} : { type: "button" as const, onClick: () => setEditing({ e, key: Date.now() }) })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunk sm:px-5"
                  >
                    <CatIcon c={e.category} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {e.date ? fmtDate(e.date) + " · " : ""}
                        {payer?.name ?? "Unknown"} paid · split {e.splitAmong.length === trip.members.length ? "with everyone" : `${e.splitAmong.length} ways`}
                      </span>
                    </span>
                    {payer ? <Avatar m={payer} size={26} /> : null}
                    <span className="w-28 shrink-0 text-right font-medium">{fmtMoney(e.amount, e.currency)}</span>
                  </Row>
                );
              })}
          </Card>
        ) : (
          <Empty
            icon="Wallet"
            tone="sun"
            title="No expenses yet"
            body="Log deposits, tickets and meals as they happen, in any currency."
            action={ro ? null : <Button icon="Plus" onClick={() => setEditing({ key: Date.now() })}>Log the first one</Button>}
          />
        )}
      </section>

      {editing ? <ExpenseModal key={editing.key} trip={trip} me={lt.me} initial={editing.e} onClose={() => setEditing(null)} /> : null}
      {budgetOpen ? <BudgetEditor trip={trip} onClose={() => setBudgetOpen(false)} /> : null}
    </div>
  );
}

function BudgetEditor({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [cats, setCats] = useState<Record<Category, number>>(() => ({ ...(trip.budget.categories as Record<Category, number>) }));
  const sumCats = CATEGORIES.reduce((a, c) => a + (cats[c] || 0), 0);
  const [total, setTotal] = useState(trip.budget.total || sumCats);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Budget (${trip.currency})`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              updateTrip(trip.id, (t) => (t.budget = { total: Math.max(0, total), categories: cats }));
              onClose();
            }}
          >
            Save budget
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Total trip budget" hint={sumCats ? `Categories add up to ${fmtMoney(sumCats, trip.currency)}` : undefined}>
          {(id) => (
            <div className="flex gap-2">
              <input id={id} type="number" inputMode="decimal" min={0} className={inputCls} value={total || ""} onChange={(e) => setTotal(Math.max(0, Number(e.target.value) || 0))} />
              {sumCats && sumCats !== total ? (
                <Button size="sm" onClick={() => setTotal(sumCats)}>
                  Use sum
                </Button>
              ) : null}
            </div>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <Field key={c} label={CATEGORY_LABEL[c]}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className={inputCls}
                  value={cats[c] || ""}
                  onChange={(e) => setCats((p) => ({ ...p, [c]: Math.max(0, Number(e.target.value) || 0) }))}
                />
              )}
            </Field>
          ))}
        </div>
      </div>
    </Modal>
  );
}
