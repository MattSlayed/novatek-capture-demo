"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Gate } from "@/components/gate/Gate";
import { Limits } from "@/components/limits/Limits";
import { OrderDetail } from "@/components/order/OrderDetail";
import { OrderList } from "@/components/orders/OrderList";
import { TimeOnOrder } from "@/components/time/TimeOnOrder";
import {
  goTo,
  parseId,
  parseSurface,
  replaceWith,
  screenKey,
} from "@/lib/client/navigate";
import { readSession } from "@/lib/client/projection";
import type { Artisan, ConflictCode } from "@/lib/data/types";

import { Header } from "./Header";

/* The screen switcher — D-01, D-02, D-03; SC-5; 04-RESEARCH.md Pattern 1,
   Pattern 3 and Pattern 4. Rendered by app/page.tsx inside its one
   <Suspense> boundary, on the one route.

   WHY A CLIENT COMPONENT. Measured against this repository (Next.js 16.3.4,
   cacheComponents: true): a Server Component's searchParams prop does not
   update on history.pushState. It stayed frozen at its first-render value
   across every push, replace and pop, with zero server round trips, because
   a history write issues no request and there is nothing to re-render the
   server tree against. The framework's client hook that reads the query,
   imported above and read once below, is the only reader that tracks it.
   The build enforces the other half: that hook outside a Suspense boundary
   is a hard prerender error under cacheComponents, so neither half of this
   shape can be undone without the build saying so.

   THE ONE PARSE POINT. `s` and `id` arrive from a link anyone can craft.
   They are validated here and nowhere else, by navigate.ts's two guards,
   and this file is their only importer (invariant A17). The validated id is
   a fetch path segment handed to a surface: it is never rendered as text
   and never placed in a header, so a crafted id can only ever produce the
   server's own refusal sentence.

   THE SESSION, BEFORE ANY BODY. The account is held in a three-state value:
   unresolved, no session, or a session. Until GET /api/session answers,
   this component renders no <main> at all; the ribbon is already on screen
   from the layout and carries the document, which is UJ-1's own first step
   ("the ribbon renders before anything else"). A deliberate decision, with
   its reason: deciding the first paint server-side from the credential's
   presence would put a second reader of it outside the six enumerated route
   handlers, and would show the order-list skeleton to a reader whose
   session is expired or forged, a false claim in the one window FR-48a is
   about. Only a definite answer changes the state; a refused or unanswered
   read leaves it where it was, so a cold load that gets no answer stays
   unresolved and claims nothing.

   THE BRANCH. With no session the gate renders at every value of `s`: the
   gate is not an `s` value, it is what any surface shows when there is no
   session (D-03). Entry re-reads the session and replaces to the order
   list, so the artisan always lands there and any requested surface is
   dropped, with no intent stored across the gate. With a session, the order
   list carries the header with no back control, order detail carries back
   to the order list, the time surface carries back to order detail, and
   Limits renders as the Phase 1 surface with no header. An absent or
   unrecognised `s`, or an id-bearing surface whose id fails the shape
   guard, is normalised to the order list by a replace from inside an
   effect, never during render. A malformed id gets no refusal card: no
   server refusal exists to render, and the client may not compose one
   (D-02), so it gets the order list and nothing else.

   BACK. The header's back control pushes its own target surface rather
   than stepping the history stack: the artisan may have arrived by a deep
   link, where the browser's own back would leave the app. The system back
   gesture and the hardware back button remain the platform's own history
   pop, which the query hook tracks and this component handles exactly like
   any other change. There is no framework router and no history listener
   of its own here, and no gesture interceptor.

   THE REFUSAL. A refused deep link is held in state, set by the onRefused
   prop the two id-bearing surfaces call from their own await
   continuations. The handler stores the code and the sentence and replaces
   to the order list, so the URL never claims a screen the app is not on
   (UI-SPEC Decision 5). It is cleared in the screen-resolution effect's
   await continuation whenever the current surface is not the order list,
   so the card never outlives the arrival it belongs to. Recorded
   consequence: it does not survive a reload.

   FOCUS. One effect whose whole body is the focus call on #screen-title,
   keyed on the screen key and on the session's resolved state, so it runs
   once the surface's heading exists and re-runs on an id-only transition.
   Two measurements stand behind that key. An effect keyed on `s` alone did
   not re-run on order(A) to order(B), which would leave focus on a control
   that was just replaced. And element.focus() scrolls, so a new screen
   starts at its heading and scroll position is not restored on back:
   deliberate, because EXPERIENCE.md states a focus rule and no
   scroll-restoration rule, and focusing without scrolling would leave the
   heading focused but off screen. The effect sets no state. */

type SessionState =
  | { kind: "unresolved" }
  | { kind: "none" }
  | { kind: "session"; account: Artisan };

type Refusal = { code: ConflictCode; sentence: string };

const UNRESOLVED: SessionState = { kind: "unresolved" };
const NO_SESSION: SessionState = { kind: "none" };

function stateFor(account: Artisan | null): SessionState {
  return account === null ? NO_SESSION : { kind: "session", account };
}

export function Screen() {
  const query = useSearchParams();
  const surface = parseSurface(query.get("s"));
  const id = parseId(query.get("id"));
  const key = screenKey(surface ?? "", id ?? "");
  const legal =
    surface === "orders" ||
    surface === "limits" ||
    ((surface === "order" || surface === "time") && id !== null);

  const [session, setSession] = useState<SessionState>(UNRESOLVED);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const resolved = session.kind;

  /* Screen resolution: normalise an illegal URL, or ask the server whether
     there is a session. Every setter runs in the await continuation. */
  useEffect(() => {
    if (!legal) {
      replaceWith("orders");
      return;
    }

    let live = true;

    async function resolve() {
      const outcome = await readSession();
      if (!live) return;
      if (surface !== "orders") setRefusal(null);
      if (outcome.kind === "ok") setSession(stateFor(outcome.value));
    }

    void resolve();
    return () => {
      live = false;
    };
  }, [key, legal, surface]);

  useEffect(() => {
    document.getElementById("screen-title")?.focus();
  }, [key, resolved]);

  async function enter() {
    const outcome = await readSession();
    setRefusal(null);
    if (outcome.kind === "ok") setSession(stateFor(outcome.value));
    replaceWith("orders");
  }

  function endedSession() {
    setRefusal(null);
    setSession(NO_SESSION);
  }

  function refused(code: ConflictCode, sentence: string) {
    setRefusal({ code, sentence });
    replaceWith("orders");
  }

  if (session.kind === "unresolved") return null;
  if (session.kind === "none") return <Gate onEntered={() => void enter()} />;

  const { account } = session;

  if (surface === "orders") {
    return (
      <>
        <Header accountName={account.name} />
        <OrderList
          account={account}
          refusal={refusal}
          onSessionEnded={endedSession}
        />
      </>
    );
  }

  if (surface === "order" && id !== null) {
    return (
      <>
        <Header
          accountName={account.name}
          back={{ label: "Back", onPress: () => goTo("orders") }}
        />
        <OrderDetail account={account} orderId={id} onRefused={refused} />
      </>
    );
  }

  if (surface === "time" && id !== null) {
    return (
      <>
        <Header
          accountName={account.name}
          back={{ label: "Back", onPress: () => goTo("order", id) }}
        />
        <TimeOnOrder account={account} orderId={id} onRefused={refused} />
      </>
    );
  }

  if (surface === "limits") return <Limits />;

  /* An illegal URL, for the one render before the replace above lands. */
  return null;
}
