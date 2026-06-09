const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('config.json nao encontrado. Execute o instalador novamente.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { supabase_url, supabase_anon_key, empresa_id, empresa_nome, printer_name } = config;

if (!supabase_url || !supabase_anon_key || !empresa_id) {
  console.error('Configuracao incompleta. Execute o instalador novamente.');
  process.exit(1);
}

const supabase = createClient(supabase_url, supabase_anon_key);
const printed = new Set();

const PGTO = {
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartao de Credito',
  cartao_debito: 'Cartao de Debito',
  pix: 'PIX',
  ja_pago: 'Ja pago',
};

function sep(n = 32) { return '-'.repeat(n); }
function center(str, n = 32) {
  const pad = Math.max(0, Math.floor((n - str.length) / 2));
  return ' '.repeat(pad) + str;
}
function cols(left, right, n = 32) {
  const space = n - left.length - right.length;
  return left + (space > 0 ? ' '.repeat(space) : ' ') + right;
}

function formatReceipt(pedido) {
  const nome = (empresa_nome || 'PEDIDO').toUpperCase();
  const data = new Date(pedido.created_at);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataStr = data.toLocaleDateString('pt-BR');
  const total = pedido.valor_pedido + pedido.valor_motoboy;
  const pgto = PGTO[pedido.forma_pagamento] || pedido.forma_pagamento || '---';
  const now = new Date();
  const printedAt = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const lines = [
    center(nome),
    sep(),
    center(`PEDIDO #${pedido.id.slice(0, 8).toUpperCase()}`),
    sep(),
    cols(pedido.cliente_nome.slice(0, 18), `${hora} ${dataStr}`),
    sep(),
    center(pedido.tipo_pedido === 'entrega' ? 'ENTREGA' : 'RETIRADA'),
    sep(),
    'CLIENTE/CELULAR',
    `${pedido.cliente_nome} - ${pedido.cliente_telefone}`,
    ...(pedido.tipo_pedido === 'entrega' ? [
      'ENDERECO DE ENTREGA:',
      pedido.endereco_entrega + (pedido.bairro ? `, ${pedido.bairro}` : ''),
    ] : []),
    ...(pedido.observacoes ? [sep(), 'OBS: ' + pedido.observacoes] : []),
    sep(),
    ...(pedido.descricao_itens || '').split('\n').filter(Boolean),
    sep(),
    cols('SUBTOTAL', `R$ ${pedido.valor_pedido.toFixed(2).replace('.', ',')}`),
    ...(pedido.valor_motoboy > 0 ? [
      cols('TAXA DE ENTREGA', `R$ ${pedido.valor_motoboy.toFixed(2).replace('.', ',')}`)
    ] : []),
    cols('TOTAL DO PEDIDO', `R$ ${total.toFixed(2).replace('.', ',')}`),
    sep(),
    'TIPO DE PAGAMENTO',
    pgto + (pedido.troco_para ? ` - Troco p/ R$ ${pedido.troco_para.toFixed(2).replace('.', ',')}` : ''),
    sep(),
    `IMPRESSO EM ${printedAt}`,
    center('appvellox.online'),
    '', '', '',
  ];

  return lines.join('\r\n');
}

function printReceipt(text) {
  const tmp = path.join(os.tmpdir(), `vellox_${Date.now()}.txt`);
  fs.writeFileSync(tmp, text, 'latin1');

  const printerArg = printer_name ? `-Name '${printer_name.replace(/'/g, "''")}'` : '';
  const cmd = `powershell -NoProfile -Command "Get-Content -Encoding Latin1 '${tmp.replace(/\\/g, '\\\\')}' | Out-Printer ${printerArg}"`;

  exec(cmd, (err) => {
    try { fs.unlinkSync(tmp); } catch {}
    if (err) console.error(`[ERRO] ${err.message}`);
    else console.log(`[OK] Cupom enviado para a impressora!`);
  });
}

console.log('\n=====================================');
console.log('  Vellox - Servidor de Impressao');
console.log('=====================================');
console.log(`Empresa : ${empresa_nome || empresa_id}`);
console.log(`Impressora: ${printer_name || 'padrao do sistema'}`);
console.log('Aguardando pedidos...\n');

supabase
  .channel('vellox-print-server')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'pedidos',
    filter: `empresa_id=eq.${empresa_id}`,
  }, (payload) => {
    const pedido = payload.new;
    if (pedido.status !== 'em_fila') return;
    if (printed.has(pedido.id)) return;
    printed.add(pedido.id);

    const t = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${t}] Pedido: #${pedido.id.slice(0, 8).toUpperCase()} - ${pedido.cliente_nome}`);
    printReceipt(formatReceipt(pedido));
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') console.log('Conectado! Pronto para imprimir.\n');
    if (status === 'CHANNEL_ERROR') console.error('Erro de conexao com Supabase.');
  });

setInterval(() => {}, 60000);
