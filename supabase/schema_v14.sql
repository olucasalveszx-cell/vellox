-- schema_v14: RPC para salvar localização da empresa (security definer)
create or replace function public.update_empresa_localizacao(
  p_endereco   text,
  p_lat        double precision,
  p_lng        double precision,
  p_raio       integer default 50,
  p_cidade     text    default null,
  p_estado     text    default null,
  p_pais       text    default 'Brasil'
)
returns void
language plpgsql security definer
as $$
begin
  update public.empresas
  set
    endereco      = p_endereco,
    lat           = p_lat,
    lng           = p_lng,
    raio_geofence = p_raio,
    cidade        = p_cidade,
    estado        = p_estado,
    pais          = p_pais
  where id = auth.uid();
end;
$$;

grant execute on function public.update_empresa_localizacao(text, double precision, double precision, integer, text, text, text)
  to authenticated;
