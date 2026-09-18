const KEY_ESTOQUE = 'estoque_validade_db';
let estoque = JSON.parse(localStorage.getItem(KEY_ESTOQUE) || '[]');
let html5QrCode = null;

window.onload = () => {
  renderEstoque();
  configurarLeitorUSB();
};

// -------------------------------------------------------------
// INTEGRAÇÃO LEITOR DE CÓDIGO DE BARRAS / CÂMARA
// -------------------------------------------------------------

// Suporte para Leitor USB / Bluetooth (detecta quando o leitor envia o 'Enter')
function configurarLeitorUSB() {
  const inputNome = document.querySelector('#nomeProduto');
  inputNome.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const codigo = inputNome.value.trim();
      if (codigo) buscarProdutoPorCodigo(codigo);
    }
  });
}

// Inicia a câmara do telemóvel/PC
function iniciarCamara() {
  const readerDiv = document.querySelector('#reader');
  readerDiv.style.display = 'block';

  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
    { facingMode: "environment" }, // Usa a câmara traseira no telemóvel
    { fps: 10, qrbox: { width: 250, height: 150 } },
    (decodedText) => {
      // Quando lê o código com sucesso:
      document.querySelector('#nomeProduto').value = decodedText;
      pararCamara();
      buscarProdutoPorCodigo(decodedText);
    },
    (errorMessage) => {
      // Ignores erros de leitura contínua do frame
    }
  ).catch(err => {
    alert('Erro ao abrir a câmara: ' + err);
    readerDiv.style.display = 'none';
  });
}

// Para a câmara
function pararCamara() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      document.querySelector('#reader').style.display = 'none';
    }).catch(err => console.error(err));
  }
}

// Procura o nome do produto através do código EAN numa API gratuita
async function buscarProdutoPorCodigo(codigo) {
  // Se não for um código numérico (ex: se o utilizador escreveu o nome manualmente), ignora a busca
  if (!/^\d+$/.test(codigo)) return;

  const inputNome = document.querySelector('#nomeProduto');
  inputNome.value = 'A procurar produto...';

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`);
    const data = await res.json();

    if (data.status === 1 && data.product.product_name) {
      const nomeEncontrado = data.product.product_name;
      const marca = data.product.brands ? ` (${data.product.brands})` : '';
      inputNome.value = `${nomeEncontrado}${marca}`;
    } else {
      inputNome.value = codigo; // Mantém o código se não encontrar o nome
      alert('Produto não localizado na base de dados. Pode preencher o nome manualmente.');
    }
  } catch (err) {
    inputNome.value = codigo;
  }
}

// -------------------------------------------------------------
// FUNÇÕES ORIGINAIS DO SISTEMA
// -------------------------------------------------------------

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
