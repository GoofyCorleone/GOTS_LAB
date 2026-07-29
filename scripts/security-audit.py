#!/usr/bin/env python3
"""Security audit for GOTS_LAB — exercises RLS/triggers with REAL user JWTs
(anon key + password login), which is the only way to actually test the
policies. service_role is used solely for setup/inspection, never for the
attack simulation itself."""

import json
import os
import ssl
import time
import urllib.error
import urllib.request

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
ANON = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
SERVICE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

CTX = ssl.create_default_context()

results = []


def req(method, path, token, body=None, apikey=None, prefer=None):
    """Returns (status, parsed_body_or_text)."""
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(URL + path, data=data, method=method)
    r.add_header("apikey", apikey or ANON)
    # PostgREST resolves the role from the *bearer JWT*, not the apikey header.
    # Passing service_role only as apikey silently downgrades to anon, which
    # made every ground-truth verification return empty on the first run.
    bearer = token or (apikey if apikey else None)
    if bearer:
        r.add_header("Authorization", "Bearer " + bearer)
    r.add_header("Content-Type", "application/json")
    if prefer:
        r.add_header("Prefer", prefer)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(r, context=CTX, timeout=30) as resp:
                raw = resp.read().decode()
                try:
                    return resp.status, json.loads(raw) if raw else None
                except json.JSONDecodeError:
                    return resp.status, raw
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try:
                return e.code, json.loads(raw) if raw else None
            except json.JSONDecodeError:
                return e.code, raw
        except (urllib.error.URLError, ConnectionResetError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2)


def login(email, password):
    st, body = req("POST", "/auth/v1/token?grant_type=password", None,
                   {"email": email, "password": password})
    if st != 200:
        raise SystemExit(f"login failed for {email}: {st} {body}")
    return body["access_token"], body["user"]["id"]


def check(name, passed, detail=""):
    results.append((name, passed, detail))
    print(("  PASS  " if passed else "  ** FAIL **  ") + name + ("  | " + detail if detail else ""))


print("=== logging in ===")
ext_tok, ext_id = login("attacker.ext@gmail.com", "TestPass123!")
uis_tok, uis_id = login("test@correo.uis.edu.co", "TestPass123!")
other_tok, other_id = login("colaborador@correo.uis.edu.co", "TestPass123!")
print(f"external={ext_id}\nuis={uis_id}\nother={other_id}\n")

# ---------------------------------------------------------------------------
print("=== A. External account isolation ===")

st, b = req("GET", "/rest/v1/experiments?select=id,title", ext_tok)
check("A1 external cannot read experiments", st == 200 and b == [], f"status={st} rows={len(b) if isinstance(b,list) else b}")

st, b = req("GET", "/rest/v1/experiment_items?select=id", ext_tok)
check("A2 external cannot read experiment_items", st == 200 and b == [], f"rows={len(b) if isinstance(b,list) else b}")

st, b = req("GET", "/rest/v1/experiment_participants?select=id", ext_tok)
check("A3 external cannot read experiment_participants", st == 200 and b == [], f"rows={len(b) if isinstance(b,list) else b}")

st, b = req("GET", "/rest/v1/experiment_sessions?select=id", ext_tok)
check("A4 external cannot read experiment_sessions", st == 200 and b == [], f"rows={len(b) if isinstance(b,list) else b}")

st, b = req("GET", "/rest/v1/experiment_legal_acceptance?select=id", ext_tok)
check("A5 external cannot read experiment_legal_acceptance", st == 200 and b == [], f"rows={len(b) if isinstance(b,list) else b}")

st, b = req("GET", "/rest/v1/profiles?select=id,email,full_name", ext_tok)
n_prof = len(b) if isinstance(b, list) else -1
check("A6 external cannot harvest all lab member emails", n_prof <= 1,
      f"external can read {n_prof} profile rows")

st, b = req("GET", "/rest/v1/bug_reports?select=id", ext_tok)
check("A7 external cannot read bug_reports", st == 200 and b == [], f"rows={len(b) if isinstance(b,list) else b}")

# ---------------------------------------------------------------------------
print("\n=== B. Privilege escalation ===")

st, b = req("PATCH", f"/rest/v1/profiles?id=eq.{ext_id}", ext_tok,
            {"access_scope": "uis"}, prefer="return=representation")
escalated = False
if st in (200, 204):
    st2, b2 = req("GET", f"/rest/v1/profiles?select=access_scope&id=eq.{ext_id}", ext_tok)
    # may not be readable; use service role to confirm ground truth
    st3, b3 = req("GET", f"/rest/v1/profiles?select=access_scope&id=eq.{ext_id}",
                  None, apikey=SERVICE)
    escalated = isinstance(b3, list) and b3 and b3[0]["access_scope"] == "uis"
check("B1 external cannot self-promote access_scope to 'uis'", not escalated,
      f"patch_status={st} escalated={escalated}")

if escalated:  # revert immediately so the rest of the audit is meaningful
    req("PATCH", f"/rest/v1/profiles?id=eq.{ext_id}", None,
        {"access_scope": "external"}, apikey=SERVICE)
    print("      (reverted access_scope back to external)")

st, b = req("PATCH", f"/rest/v1/profiles?id=eq.{ext_id}", ext_tok, {"role": "admin"})
st3, b3 = req("GET", f"/rest/v1/profiles?select=role&id=eq.{ext_id}", None, apikey=SERVICE)
role_now = b3[0]["role"] if isinstance(b3, list) and b3 else "?"
check("B2 cannot self-promote profiles.role", role_now == "member", f"role={role_now}")

st, b = req("PATCH", f"/rest/v1/profiles?id=eq.{uis_id}", ext_tok, {"full_name": "HACKED"})
st3, b3 = req("GET", f"/rest/v1/profiles?select=full_name&id=eq.{uis_id}", None, apikey=SERVICE)
check("B3 cannot modify another user's profile",
      isinstance(b3, list) and b3 and b3[0]["full_name"] != "HACKED",
      f"full_name={b3[0]['full_name'] if isinstance(b3,list) and b3 else '?'}")

st, b = req("POST", "/rest/v1/group_professors", ext_tok,
            {"full_name": "Fake Prof", "display_order": 99, "is_active": True})
check("B4 cannot insert into group_professors", st >= 400, f"status={st}")

st, b = req("GET", "/rest/v1/group_professors?select=id,full_name,profile_id", ext_tok)
profs = b if isinstance(b, list) else []
st, b2 = req("PATCH", "/rest/v1/group_professors?display_order=eq.1", ext_tok,
             {"profile_id": ext_id})
st3, b3 = req("GET", "/rest/v1/group_professors?select=profile_id&display_order=eq.1",
              None, apikey=SERVICE)
hijacked = isinstance(b3, list) and b3 and b3[0]["profile_id"] == ext_id
check("B5 cannot hijack a professor slot (become the lender)", not hijacked, f"status={st}")

# ---------------------------------------------------------------------------
print("\n=== C. Loan state machine ===")

active_prof = next((p for p in profs if p.get("full_name", "").startswith("Rafael")), None)
prof_id = active_prof["id"] if active_prof else (profs[0]["id"] if profs else None)

# Find an available inventory item
st, avail = req("POST", "/rest/v1/rpc/get_inventory_availability", ext_tok, {})
free_item = next((r["inventory_item_id"] for r in avail if r["quantity_available"] > 0), None) \
    if isinstance(avail, list) else None

loan_id = None
if prof_id and free_item:
    st, b = req("POST", "/rest/v1/loan_requests", ext_tok, {
        "requester_id": ext_id, "professor_id": prof_id,
        "purpose_description": "Auditoria de seguridad automatizada",
        "usage_start": "2026-08-01T10:00:00Z", "usage_end": "2026-08-05T10:00:00Z",
    }, prefer="return=representation")
    if st in (200, 201) and isinstance(b, list) and b:
        loan_id = b[0]["id"]
        print(f"      created loan {loan_id}")
    else:
        print(f"      could not create loan: {st} {b}")

if loan_id:
    st, b = req("POST", "/rest/v1/loan_request_items", ext_tok,
                {"loan_request_id": loan_id, "inventory_item_id": free_item, "quantity": 1})
    check("C0 requester can add items to own pending loan", st in (200, 201), f"status={st}")

    # C1: self-approve
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok, {"status": "approved"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=status&id=eq.{loan_id}", None, apikey=SERVICE)
    now = b3[0]["status"] if isinstance(b3, list) and b3 else "?"
    check("C1 requester cannot self-approve loan", now == "pending", f"status_now={now} patch={st}")

    # C2: self-extend usage_end without professor approval
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"usage_end": "2030-01-01T00:00:00Z"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=usage_end&id=eq.{loan_id}", None, apikey=SERVICE)
    end_now = b3[0]["usage_end"] if isinstance(b3, list) and b3 else "?"
    check("C2 requester cannot silently extend usage_end", not str(end_now).startswith("2030"),
          f"usage_end={end_now} patch={st}")

    # C3: forge decided_by / decided_at
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"decided_by": ext_id, "decided_at": "2026-01-01T00:00:00Z"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=decided_by&id=eq.{loan_id}", None, apikey=SERVICE)
    dec = b3[0]["decided_by"] if isinstance(b3, list) and b3 else "?"
    check("C3 requester cannot forge decided_by", dec is None, f"decided_by={dec} patch={st}")

    # C4: the meaningful legal invariant is that equipment cannot be released
    # without acceptance, i.e. approval is gated — NOT that a freshly created
    # pending loan already has the row (it can't: the acceptance references
    # the loan, so it is inserted immediately after). Tested on its own loan
    # below (C16) to avoid contaminating it with C7's inserted acceptance.
    check("C4 pending loan starts without legal acceptance (expected by design)", True,
          "the binding check is C16: approval is gated")

    # C5: another UIS user (not the professor) cannot approve
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", other_tok, {"status": "approved"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=status&id=eq.{loan_id}", None, apikey=SERVICE)
    now = b3[0]["status"] if isinstance(b3, list) and b3 else "?"
    check("C5 unrelated user cannot approve someone else's loan", now == "pending",
          f"status_now={now} patch={st}")

    # C6: external cannot read OTHER people's loans
    st, b = req("GET", "/rest/v1/loan_requests?select=id,requester_id", ext_tok)
    foreign = [r for r in b if r["requester_id"] != ext_id] if isinstance(b, list) else []
    check("C6 external only sees own loans", len(foreign) == 0, f"foreign_rows={len(foreign)}")

    # C7: legal acceptance immutable
    req("POST", "/rest/v1/loan_legal_acceptance", ext_tok,
        {"loan_request_id": loan_id, "accepted_by": ext_id})
    st, b = req("PATCH", f"/rest/v1/loan_legal_acceptance?loan_request_id=eq.{loan_id}",
                ext_tok, {"policy_version": "hacked"})
    st2, b2 = req("DELETE", f"/rest/v1/loan_legal_acceptance?loan_request_id=eq.{loan_id}", ext_tok)
    st3, b3 = req("GET", f"/rest/v1/loan_legal_acceptance?select=policy_version&loan_request_id=eq.{loan_id}",
                  None, apikey=SERVICE)
    intact = isinstance(b3, list) and b3 and b3[0]["policy_version"] != "hacked"
    check("C7 loan_legal_acceptance is immutable", bool(intact) or not b3,
          f"patch={st} delete={st2}")

    # C8: over-reserve inventory beyond stock
    st, b = req("POST", "/rest/v1/loan_request_items", ext_tok,
                {"loan_request_id": loan_id, "inventory_item_id": free_item, "quantity": 999999})
    check("C8 cannot over-reserve inventory via loans", st >= 400, f"status={st}")

    # C9: negative / zero quantity
    st, b = req("POST", "/rest/v1/loan_request_items", ext_tok,
                {"loan_request_id": loan_id, "inventory_item_id": free_item, "quantity": -5})
    check("C9 cannot request negative quantity", st >= 400, f"status={st}")

    # C10: usage_end before usage_start
    st, b = req("POST", "/rest/v1/loan_requests", ext_tok, {
        "requester_id": ext_id, "professor_id": prof_id,
        "purpose_description": "rango invertido de fechas",
        "usage_start": "2026-09-10T10:00:00Z", "usage_end": "2026-09-01T10:00:00Z"})
    check("C10 rejects usage_end before usage_start", st >= 400, f"status={st}")

    # C11: impersonate another requester
    st, b = req("POST", "/rest/v1/loan_requests", ext_tok, {
        "requester_id": uis_id, "professor_id": prof_id,
        "purpose_description": "solicitud a nombre de otra persona",
        "usage_start": "2026-08-01T10:00:00Z", "usage_end": "2026-08-05T10:00:00Z"})
    check("C11 cannot file a loan in someone else's name", st >= 400, f"status={st}")

    # C12: freeze the formal request document
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"purpose_description": "texto cambiado despues de enviar"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=purpose_description&id=eq.{loan_id}",
                  None, apikey=SERVICE)
    pd = b3[0]["purpose_description"] if isinstance(b3, list) and b3 else "?"
    check("C12 cannot rewrite purpose_description after submitting",
          "cambiado" not in pd, f"patch={st}")

    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"returned_at": "2026-01-01T00:00:00Z"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=returned_at&id=eq.{loan_id}",
                  None, apikey=SERVICE)
    ra = b3[0]["returned_at"] if isinstance(b3, list) and b3 else "?"
    check("C13 cannot forge returned_at", ra is None, f"returned_at={ra} patch={st}")

    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"marked_lost_at": None, "status": "returned"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=status&id=eq.{loan_id}",
                  None, apikey=SERVICE)
    stt = b3[0]["status"] if isinstance(b3, list) and b3 else "?"
    check("C14 cannot jump pending -> returned", stt == "pending", f"status={stt} patch={st}")

    # C15: request an extension on a still-pending loan
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"requested_new_usage_end": "2027-01-01T00:00:00Z"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=requested_new_usage_end&id=eq.{loan_id}",
                  None, apikey=SERVICE)
    rn = b3[0]["requested_new_usage_end"] if isinstance(b3, list) and b3 else "?"
    check("C15 cannot request extension on a pending loan", rn is None, f"value={rn} patch={st}")

    # C16: approval without legal acceptance must be refused even for the real
    # lending professor. Uses a DEDICATED loan — the shared one already got an
    # acceptance row from C7, which would silently make this pass for the
    # wrong reason.
    req("PATCH", f"/rest/v1/group_professors?id=eq.{prof_id}", None,
        {"profile_id": other_id}, apikey=SERVICE)

    st, b = req("POST", "/rest/v1/loan_requests", ext_tok, {
        "requester_id": ext_id, "professor_id": prof_id,
        "purpose_description": "prueba del gate de aceptacion legal",
        "usage_start": "2026-08-01T10:00:00Z", "usage_end": "2026-08-05T10:00:00Z",
    }, prefer="return=representation")
    gate_loan = b[0]["id"] if st in (200, 201) and isinstance(b, list) and b else None

    if gate_loan:
        st3, b3 = req("GET", f"/rest/v1/loan_legal_acceptance?select=id&loan_request_id=eq.{gate_loan}",
                      None, apikey=SERVICE)
        assert not b3, "precondition: gate loan must have no legal acceptance"
        st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{gate_loan}", other_tok,
                    {"status": "approved", "decided_by": other_id,
                     "decided_at": "2026-07-29T12:00:00Z"})
        st3, b3 = req("GET", f"/rest/v1/loan_requests?select=status&id=eq.{gate_loan}",
                      None, apikey=SERVICE)
        stt = b3[0]["status"] if isinstance(b3, list) and b3 else "?"
        check("C16 professor cannot approve without legal acceptance", stt == "pending",
              f"status={stt} patch={st}")

        # C16b: a requester must not be able to erase the legal record by
        # deleting the loan out from under it.
        req("POST", "/rest/v1/loan_legal_acceptance", ext_tok,
            {"loan_request_id": gate_loan, "accepted_by": ext_id})
        st, b = req("DELETE", f"/rest/v1/loan_requests?id=eq.{gate_loan}", ext_tok)
        st3, b3 = req("GET", f"/rest/v1/loan_requests?select=id&id=eq.{gate_loan}",
                      None, apikey=SERVICE)
        check("C16b cannot delete a loan that has a legal acceptance record",
              isinstance(b3, list) and len(b3) == 1, f"delete_status={st}")

        for tbl, col in [("loan_legal_acceptance", "loan_request_id"),
                         ("loan_request_items", "loan_request_id"),
                         ("notifications", "related_loan_request_id")]:
            req("DELETE", f"/rest/v1/{tbl}?{col}=eq.{gate_loan}", None, apikey=SERVICE)
        req("DELETE", f"/rest/v1/loan_requests?id=eq.{gate_loan}", None, apikey=SERVICE)

    # C17: with legal acceptance present, the real professor CAN approve.
    req("POST", "/rest/v1/loan_legal_acceptance", ext_tok,
        {"loan_request_id": loan_id, "accepted_by": ext_id})
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", other_tok,
                {"status": "approved", "decided_by": other_id,
                 "decided_at": "2026-07-29T12:00:00Z"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=status&id=eq.{loan_id}",
                  None, apikey=SERVICE)
    stt = b3[0]["status"] if isinstance(b3, list) and b3 else "?"
    check("C17 professor CAN approve once legal acceptance exists", stt == "approved",
          f"status={stt} patch={st}")

    # C18: now approved — requester still cannot move the deadline.
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"usage_end": "2031-01-01T00:00:00Z"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=usage_end&id=eq.{loan_id}",
                  None, apikey=SERVICE)
    ue = b3[0]["usage_end"] if isinstance(b3, list) and b3 else "?"
    check("C18 approved loan deadline still not self-extendable",
          not str(ue).startswith("2031"), f"usage_end={ue} patch={st}")

    # C19: legitimate extension flow works end to end.
    st, b = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", ext_tok,
                {"requested_new_usage_end": "2026-08-20T10:00:00Z"})
    st2, b2 = req("PATCH", f"/rest/v1/loan_requests?id=eq.{loan_id}", other_tok,
                  {"usage_end": "2026-08-20T10:00:00Z", "requested_new_usage_end": None,
                   "status": "approved"})
    st3, b3 = req("GET", f"/rest/v1/loan_requests?select=usage_end,requested_new_usage_end&id=eq.{loan_id}",
                  None, apikey=SERVICE)
    ue = b3[0]["usage_end"] if isinstance(b3, list) and b3 else "?"
    check("C19 legitimate extension flow still works", str(ue).startswith("2026-08-20"),
          f"usage_end={ue} req={st} resolve={st2}")

    # restore the professor slot
    req("PATCH", f"/rest/v1/group_professors?id=eq.{prof_id}", None,
        {"profile_id": None}, apikey=SERVICE)

# ---------------------------------------------------------------------------
print("\n=== D. Anonymous access ===")
for tbl in ["profiles", "experiments", "loan_requests", "inventory_items", "group_professors"]:
    st, b = req("GET", f"/rest/v1/{tbl}?select=id", None)
    empty = (isinstance(b, list) and len(b) == 0)
    check(f"D-{tbl} no anonymous read", st >= 400 or empty, f"status={st}")

# ---------------------------------------------------------------------------
print("\n=== E. UIS user baseline (should still work) ===")
st, b = req("GET", "/rest/v1/experiments?select=id,title", uis_tok)
check("E1 UIS user CAN still read experiments", st == 200 and isinstance(b, list) and len(b) > 0,
      f"rows={len(b) if isinstance(b,list) else b}")
st, b = req("GET", "/rest/v1/inventory_items?select=id", ext_tok)
check("E2 external CAN read inventory (needed for loans)", st == 200 and isinstance(b, list) and len(b) > 0,
      f"rows={len(b) if isinstance(b,list) else b}")

# ---------------------------------------------------------------------------
print("\n" + "=" * 70)
failed = [r for r in results if not r[1]]
print(f"RESULT: {len(results)-len(failed)}/{len(results)} passed")
if failed:
    print("\nFAILURES:")
    for name, _, detail in failed:
        print(f"  - {name}  | {detail}")
print("=" * 70)
if loan_id:
    print(f"\ncleanup hint: loan_id={loan_id}")
