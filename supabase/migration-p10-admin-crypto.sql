-- Operator console: expose on-chain state for crypto requests.
--
-- admin_ops previously returned the unified ledger (payments) and webhooks.
-- A crypto request's real state lives in crypto_payments — awaiting_payment /
-- detected / verifying / confirmed / expired — which the unified row hides
-- behind payments.status = 'created'. This re-defines admin_ops to also return
-- the RPC truth for each Solana request, joined to what it was for.

create or replace function admin_ops(p_actor uuid)
returns jsonb
language plpgsql
security definer
as $$
declare v_actor profiles%rowtype;
begin
  v_actor := assert_admin(p_actor);
  return jsonb_build_object(
    'webhooks', (
      select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc), '[]'::jsonb)
      from (
        select provider, event_type, status, provider_event_id, created_at
        from webhook_events order by created_at desc limit 25
      ) w
    ),
    'payments', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc), '[]'::jsonb)
      from (
        select pay.provider, pay.status, pay.amount_minor, pay.currency,
               pay.provider_payment_id, pay.created_at, i.number as invoice_number
        from payments pay left join invoices i on i.id = pay.invoice_id
        order by pay.created_at desc limit 25
      ) p
    ),
    'crypto', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
      from (
        select cp.payment_id, cp.network, cp.token_symbol, cp.status,
               cp.payment_reference, cp.transaction_signature,
               cp.expected_amount_minor, cp.detected_at, cp.confirmed_at,
               cp.expires_at, cp.created_at, cp.attempts, cp.last_error,
               cp.recipient_wallet, pay.amount_minor as ledger_minor,
               pay.currency, pay.plan_key, i.number as invoice_number,
               p.email as user_email
        from crypto_payments cp
        join payments pay on pay.id = cp.payment_id
        left join invoices i on i.id = pay.invoice_id
        left join profiles p on p.id = pay.user_id
        order by cp.created_at desc limit 25
      ) c
    )
  );
end;
$$;

-- Execute is still admin-only: the grant set in p7 is untouched, and a
-- re-created function does not resurrect public access to it.
