-- schema_v22: status aguardando_confirmacao para confirmação de entrega pelo despachante
-- Se pedido.status for coluna TEXT (sem constraint): nenhuma mudança necessária no DB.
-- Se for enum, executar:
-- ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'aguardando_confirmacao';

-- Novo fluxo de entrega:
--   motoboy: marca como "aguardando_confirmacao" ao entregar
--   empresa: confirma com status "entregue"
