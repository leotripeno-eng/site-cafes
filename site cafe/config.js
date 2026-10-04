/* =====================================================================
   CONFIGURAÇÃO DA LOJA · Grão Dourado
   ---------------------------------------------------------------------
   Este é o único arquivo que você precisa editar para colocar os dados
   reais da sua cafeteria. Tudo que está marcado com  ⚠ TROCAR  é exemplo.
   Depois de salvar, é só recarregar a página.
   ===================================================================== */
const CONFIG = {
  nome: 'Grão Dourado',
  slogan: 'Cafés especiais, torra fresca e entrega rápida.',

  // ⚠ TROCAR: endereço, contato e documentos
  endereco: {
    rua: 'Rua Exemplo, 123',          // ⚠ TROCAR
    bairro: 'Centro',                 // ⚠ TROCAR
    cidade: 'São Paulo',              // ⚠ TROCAR  (usada também para calcular a entrega)
    uf: 'SP',                         // ⚠ TROCAR
    cep: '01000-000',                 // ⚠ TROCAR
    lat: -23.5505,                    // ⚠ TROCAR  (posição no mapa)
    lng: -46.6333,                    // ⚠ TROCAR
  },
  telefone: '(11) 90000-0000',        // ⚠ TROCAR
  email: 'contato@exemplo.com.br',    // ⚠ TROCAR
  cnpj: '00.000.000/0001-00',         // ⚠ TROCAR
  instagram: 'graodourado',           // ⚠ TROCAR  (sem @)

  // WhatsApp que recebe os pedidos: DDI + DDD + número, só dígitos. Ex.: '5511999999999'
  // Vazio = o site mostra o resumo do pedido para copiar (modo teste).
  whatsapp: '',                       // ⚠ TROCAR

  // ---------------- Pix ----------------
  // Chave Pix da loja (CPF/CNPJ só números, e-mail, telefone +55..., ou chave aleatória).
  // Vazio = o QR Code aparece em modo demonstração, sem valor de pagamento.
  pix: {
    chave: '',                        // ⚠ TROCAR
    recebedor: 'GRAO DOURADO',        // até 25 letras, sem acentos
    cidade: 'SAO PAULO',              // até 15 letras, sem acentos
  },

  // ---------------- Horário de funcionamento ----------------
  // 0 = domingo ... 6 = sábado.  null = fechado.
  horarios: {
    0: ['09:00', '14:00'],
    1: ['07:00', '19:00'],
    2: ['07:00', '19:00'],
    3: ['07:00', '19:00'],
    4: ['07:00', '19:00'],
    5: ['07:00', '20:00'],
    6: ['08:00', '18:00'],
  },

  // ---------------- Entrega ----------------
  entrega: {
    cidade: 'São Paulo',              // só entrega nesta cidade (o resto vira "retirar na loja")
    taxaPadrao: 8.0,                  // R$ para bairros que não estão na lista abaixo
    gratisAPartirDe: 60.0,            // pedido mínimo para entrega grátis (após desconto)
    pedidoMinimo: 15.0,               // abaixo disso, só retirada
    prazo: '30 a 50 min',
    // Bairros com taxa especial (o nome é comparado sem acento e sem maiúsculas)
    bairros: {
      'centro': 5.0,
      'republica': 5.0,
      'bela vista': 6.0,
      'consolacao': 6.0,
      'liberdade': 6.5,
      'pinheiros': 10.0,
      'vila mariana': 10.0,
      'moema': 12.0,
    },
  },

  // ---------------- Cupons ----------------
  cupons: {
    CAFEINA10: { pct: 10, nome: 'CAFEINA10 · 10% off' },
    SEGUNDA:   { pct: 15, nome: 'SEGUNDA · 15% off' },
  },

  // ---------------- Fidelidade ----------------
  fidelidade: { selos: 10 },          // a cada 10 bebidas, a próxima é por nossa conta

  // ---------------- Avaliações ----------------
  // Coloque aqui avaliações REAIS de clientes (com autorização). Enquanto a lista
  // estiver vazia, o site mostra um convite para avaliar no Google.
  // Exemplo de formato:
  //   { nome: 'Ana P.', nota: 5, texto: 'Melhor cold brew do bairro.', data: '2026-09' },
  avaliacoes: [],
  linkAvaliarGoogle: 'https://www.google.com/maps', // ⚠ TROCAR pelo link da sua ficha no Google

  // ---------------- Perguntas frequentes ----------------
  // ⚠ Revise as respostas para que reflitam as regras reais da loja.
  faq: [
    ['Qual o prazo de entrega?', 'Em média {prazo}, dependendo do bairro e do movimento. Você acompanha tudo pelo WhatsApp.'],
    ['Onde vocês entregam?', 'Entregamos em {cidade}. A taxa é calculada pelo CEP na hora de fechar o pedido, e acima de {gratis} a entrega é grátis.'],
    ['Quais formas de pagamento?', 'Pix (com QR Code na hora), cartão de crédito e débito na entrega, ou dinheiro com troco.'],
    ['Posso retirar na loja?', 'Pode, sim. Escolha "Retirar na loja" no carrinho e passe no balcão em {endereco}.'],
    ['Vocês têm opções sem lactose e veganas?', 'Todas as bebidas com leite podem ser feitas com leite sem lactose, de aveia ou de amêndoas. Os alérgenos de cada item aparecem no cardápio.'],
    ['Os grãos vêm moídos?', 'Você escolhe: em grãos ou moídos para coador, espresso, prensa francesa ou moka.'],
    ['Como funciona a assinatura?', 'Você escolhe o tamanho, a frequência e a moagem. A primeira entrega sai com o pedido e as próximas combinamos pelo WhatsApp, sempre com 15% de desconto.'],
  ],
};
