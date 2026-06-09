-- schema_v17: recriar aceitar_pedido retornando jsonb com códigos de erro detalhados
-- (DROP obrigatório porque o tipo de retorno mudou de boolean → jsonb)

drop function if exists public.aceitar_pedido(uuid);

create function public.aceitar_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql security definer
as $$
declare
  v_motoboy_id     uuid;
  v_empresa_id     uuid;
  v_pedido_status  text;
  v_pedido_mb      uuid;
  v_tem_ativo      boolean := false;
begin
  -- 1. Localizar motoboy pelo auth.uid()
  select id, empresa_id
    into v_motoboy_id, v_empresa_id
    from public.motoboys
   where auth_id = auth.uid()
     and empresa_id is not null
   limit 1;

  if v_motoboy_id is null then
    return jsonb_build_object('ok', false, 'code', 'motoboy_not_found');
  end if;

  -- 2. Verificar se já tem pedido ativo vinculado
  select exists(
    select 1 from public.pedidos
     where motoboy_id = v_motoboy_id
       and status in ('em_coleta', 'em_rota_de_entrega')
  ) into v_tem_ativo;

  if v_tem_ativo then
    return jsonb_build_object('ok', false, 'code', 'motoboy_busy');
  end if;

  -- 3. Verificar estado atual do pedido
  select status, motoboy_id
    into v_pedido_status, v_pedido_mb
    from public.pedidos
   where id = p_pedido_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'pedido_not_found');
  end if;

  if v_pedido_mb is not null then
    return jsonb_build_object('ok', false, 'code', 'already_taken');
  end if;

  if v_pedido_status != 'finalizado' then
    return jsonb_build_object('ok', false, 'code', 'wrong_status', 'status', v_pedido_status);
  end if;

  -- 4. Aceitar atomicamente (evita race condition)
  update public.pedidos
     set motoboy_id = v_motoboy_id,
         status     = 'em_coleta',
         updated_at = now()
   where id          = p_pedido_id
     and status      = 'finalizado'
     and motoboy_id is null;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'race_condition');
  end if;

  -- 5. Marcar motoboy em entrega
  update public.motoboys
     set status = 'em_entrega'
   where id = v_motoboy_id;

  return jsonb_build_object('ok', true, 'code', 'accepted');
end;
$$;

grant execute on function public.aceitar_pedido(uuid) to authenticated;
