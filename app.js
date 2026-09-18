const KEY_ESTOQUE = 'estoque_validade_db';
let estoque = JSON.parse(localStorage.getItem(KEY_ESTOQUE) || '[]');

window.onload = () => {
  renderEstoque();
};

function cadastrarProduto() {
  const nome = document.querySelector('#nomeProduto').value.trim();
  const qtd = Number(document.querySelector('#qtdProduto').value);
  const dataValidade = document.querySelector('#dataVencimento').value;

  if (!nome || !qtd || !dataValidade) {
    alert('Por favor, informe o nome, quantidade e data de vencimento.');
    return;
  }

  estoque.push({ id: Date.now(), nome, qtd, dataValidade });
  salvarDB();

  document.querySelector('#nomeProduto').value = '';
  document.querySelector('#qtdProduto').value = '1';
  document.querySelector('#dataVencimento').value = '';

  renderEstoque();
}

function removerProduto(id) {
  estoque = estoque.filter(p => p.id !== id);
  salvarDB();
  renderEstoque();
}

function salvarDB() {
  localStorage.setItem(KEY_ESTOQUE, JSON.stringify(estoque));
}

function obterStatusValidade(dataIso) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const vencimento = new Date(dataIso + 'T00:00:00');
  const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

  if (diffDias <= 3) return { classe: 'status-alerta', texto: diffDias < 0 ? 'VENCIDO!' : `Vence em ${diffDias} dia(s)!` };
  if (diffDias <= 7) return { classe: 'status-atencao', texto: `Vence em ${diffDias} dias` };
  return { classe: 'status-ok', texto: `Vence em ${diffDias} dias` };
}

function renderEstoque() {
  const container = document.querySelector('#listaEstoque');

  if (estoque.length === 0) {
    container.innerHTML = '<p class="muted">Nenhum produto cadastrado no estoque.</p>';
    return;
  }

  // Ordena por data de vencimento (o que vence primeiro fica no topo)
  estoque.sort((a, b) => new Date(a.dataValidade) - new Date(b.dataValidade));

  container.innerHTML = estoque.map(p => {
    const status = obterStatusValidade(p.dataValidade);
    const dataFmt = new Date(p.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR');

    return `
      <div class="item-estoque ${status.classe}">
        <div>
          <b>${p.qtd}x ${p.nome}</b><br>
          <small>Vencimento: ${dataFmt} (<b>${status.texto}</b>)</small>
        </div>
        <button class="btn-remover" onclick="removerProduto(${p.id})">X</button>
      </div>
    `;
  }).join('');
}

function gerarRelatorio(diasLimite) {
  if (estoque.length === 0) {
    alert('Nenhum produto para gerar relatório.');
    return;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const filtrados = estoque.filter(p => {
    const venc = new Date(p.dataValidade + 'T00:00:00');
    const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
    return diffDias <= diasLimite;
  });

  if (filtrados.length === 0) {
    alert(`Nenhum produto vencendo nos próximos ${diasLimite} dias!`);
    return;
  }

  let texto = `🚨 *RELATÓRIO DE VENCIMENTOS (${diasLimite} DIAS)*\n----------------------------------\n`;
  
  filtrados.forEach(p => {
    const dataFmt = new Date(p.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR');
    texto += `• *${p.qtd}x ${p.nome}* | Vence: ${dataFmt}\n`;
  });

  texto += `----------------------------------\n📌 *Ação recomendada:* Colocar em promoção ou destacar na prateleira!`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}