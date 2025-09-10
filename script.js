const form = document.getElementById("form-movimentacao");
const extrato = document.getElementById("extrato");
const notificacao = document.getElementById("notificacao");
const saldoDisponivel = document.getElementById("saldo-disponivel");
const graficoCanvas = document.getElementById("graficoDespesas");
const graficoSecao = document.getElementById("grafico-secao");

const salarioLuizInput = document.getElementById("salario-luiz");
const salarioKetyInput = document.getElementById("salario-kety");
const salvarSalariosBtn = document.getElementById("salvar-salarios-btn");

const whatsappBtn = document.getElementById("whatsapp-btn");
const extratoWhatsappBtn = document.getElementById("extrato-whatsapp-btn");

let graficoInstance = null;
let salarios = { luiz: 0, kety: 0 };

// cria o filtro dinâmico
const filtro = document.createElement("select");
filtro.id = "filtro";
filtro.className = "form-select mb-3";
extrato.parentNode.insertBefore(filtro, extrato);

// atualizar opções do filtro
function atualizarFiltro() {
    db.collection("movimentacoes").get().then(snapshot => {
        const pessoas = new Set(["todos"]);
        snapshot.forEach(doc => pessoas.add(doc.data().quem));

        filtro.innerHTML = "";
        pessoas.forEach(pessoa => {
            const option = document.createElement("option");
            option.value = pessoa;
            option.textContent = pessoa.charAt(0).toUpperCase() + pessoa.slice(1);
            filtro.appendChild(option);
        });
    });
}

// renderizar item do extrato
function renderMovimentacao(doc) {
    const data = doc.data();
    const item = document.createElement("div");
    item.className = "list-group-item d-flex justify-content-between align-items-center";

    const info = document.createElement("div");
    info.innerHTML = `
        <strong>${data.tipo.toUpperCase()}</strong> - 
        ${data.descricao} | ${data.categoria} | 
        R$ ${parseFloat(data.valor).toFixed(2)} | 
        ${data.quem} | ${data.data}
    `;

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "btn btn-sm btn-danger";
    btnExcluir.textContent = "Excluir";
    btnExcluir.onclick = async () => {
        if (confirm("Deseja realmente excluir essa movimentação?")) {
            await db.collection("movimentacoes").doc(doc.id).delete();
        }
    };

    item.appendChild(info);
    item.appendChild(btnExcluir);
    extrato.appendChild(item);
}

// carregar movimentações (com filtro)
function carregarMovimentacoes(filtroPessoa) {
    let query = db.collection("movimentacoes").orderBy("data", "desc");

    if (filtroPessoa && filtroPessoa !== "todos") {
        query = db.collection("movimentacoes")
            .where("quem", "==", filtroPessoa)
            .orderBy("data", "desc");
    }

    query.onSnapshot(snapshot => {
        extrato.innerHTML = "";
        const movimentacoes = [];
        snapshot.forEach(doc => {
            movimentacoes.push(doc.data());
            renderMovimentacao(doc);
        });
        atualizarSaldo(movimentacoes);
        gerarGrafico(movimentacoes);
    });
}

// atualizar saldo com salários individuais
function atualizarSaldo(movimentacoes) {
    const despesasLuiz = movimentacoes
        .filter(mov => mov.tipo === "despesa" && mov.quem === "Luiz")
        .reduce((acc, mov) => acc + mov.valor, 0);

    const despesasKety = movimentacoes
        .filter(mov => mov.tipo === "despesa" && mov.quem === "Kety")
        .reduce((acc, mov) => acc + mov.valor, 0);

    const saldoLuiz = (salarios.luiz || 0) - despesasLuiz;
    const saldoKety = (salarios.kety || 0) - despesasKety;

    const totalDespesas = despesasLuiz + despesasKety;
    const saldoGeral = (salarios.luiz || 0) + (salarios.kety || 0) - totalDespesas;

    saldoDisponivel.innerHTML = `
         <br> R$ ${saldoGeral.toFixed(2)}<br>
          `;

    salarioLuizInput.value = salarios.luiz || 0;
    salarioKetyInput.value = salarios.kety || 0;
}

// gerar gráfico de despesas por categoria
function gerarGrafico(movimentacoes) {
    const despesas = movimentacoes.filter(mov => mov.tipo === "despesa");
    if (despesas.length === 0) {
        graficoSecao.innerHTML = '<h2>Gráfico de Despesas</h2><p class="aviso">Sem despesas para exibir.</p>';
        return;
    }

    const gastosPorCategoria = {};
    despesas.forEach(mov => {
        gastosPorCategoria[mov.categoria] = (gastosPorCategoria[mov.categoria] || 0) + mov.valor;
    });

    const labels = Object.keys(gastosPorCategoria);
    const dataChart = Object.values(gastosPorCategoria);

    if (graficoInstance) graficoInstance.destroy();

    graficoInstance = new Chart(graficoCanvas, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                label: "Gastos por Categoria",
                data: dataChart,
                backgroundColor: labels.map(() => {
                    const r = Math.floor(Math.random() * 255);
                    const g = Math.floor(Math.random() * 255);
                    const b = Math.floor(Math.random() * 255);
                    return `rgba(${r}, ${g}, ${b}, 0.6)`;
                })
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "top" },
                title: { display: true, text: "Distribuição de Despesas" }
            }
        }
    });

    graficoSecao.style.display = "block";
}

// ================= SALÁRIOS =================
async function fetchSalarios() {
    try {
        const doc = await db.collection("salarios").doc("fixos").get();
        if (doc.exists) {
            salarios = doc.data();
        }
        salarioLuizInput.value = salarios.luiz || 0;
        salarioKetyInput.value = salarios.kety || 0;
        atualizarSaldo([]);
    } catch (error) {
        console.error("Erro ao buscar salários:", error);
    }
}

async function salvarSalarios() {
    const salarioLuiz = parseFloat(salarioLuizInput.value) || 0;
    const salarioKety = parseFloat(salarioKetyInput.value) || 0;

    salarios = { luiz: salarioLuiz, kety: salarioKety };
    try {
        await db.collection("salarios").doc("fixos").set(salarios);
        alert("Salários salvos com sucesso!");
        atualizarSaldo([]);
    } catch (error) {
        console.error("Erro ao salvar salários:", error);
        alert("Erro ao salvar salários.");
    }
}

// ================= WHATSAPP =================
function abrirWhatsApp(numero, mensagem) {
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
}

function montarMensagemExtrato(movimentacoes, filtroPessoa) {
    let totalEntradas = 0;
    let totalDespesas = 0;
    let despesasLuiz = 0;
    let despesasKety = 0;

    let mensagem = `Extrato de Movimentações (${filtroPessoa})\n\n`;

    if (movimentacoes.length === 0) {
        mensagem += "Nenhuma movimentação registrada.";
    } else {
        movimentacoes.forEach(mov => {
            const valorMov = parseFloat(mov.valor);
            if (mov.tipo === "entrada") totalEntradas += valorMov;
            else totalDespesas += valorMov;

            if (mov.tipo === "despesa" && mov.quem === "Luiz") despesasLuiz += valorMov;
            if (mov.tipo === "despesa" && mov.quem === "Kety") despesasKety += valorMov;

            const emoji = mov.tipo === "despesa" ? "🔴" : "🟢";
            mensagem += `${emoji} ${mov.descricao}: R$ ${valorMov.toFixed(2)} (${mov.data}) por ${mov.quem} - Categoria: ${mov.categoria}\n`;
        });
        const saldo = totalEntradas - totalDespesas;
        const saldoLuiz = (salarios.luiz || 0) - despesasLuiz;
        const saldoKety = (salarios.kety || 0) - despesasKety;

        mensagem += `\n---\n🟢 Entradas: R$ ${totalEntradas.toFixed(2)}\n🔴 Despesas: R$ ${totalDespesas.toFixed(2)}\n✅ Saldo Final: R$ ${saldo.toFixed(2)}\n\n Luiz: R$ ${saldoLuiz.toFixed(2)} | Kety: R$ ${saldoKety.toFixed(2)}\n---`;
    }
    return mensagem;
}

// registrar movimentação
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipo = form.tipo.value;
    const descricao = form.descricao.value;
    const categoria = form.categoria.value;
    const valor = parseFloat(form.valor.value);
    const data = form.data.value;
    const quem = form.quem.value;

    await db.collection("movimentacoes").add({
        tipo, descricao, categoria, valor, data, quem
    });

    form.reset();
    notificacao.classList.remove("d-none");
    setTimeout(() => notificacao.classList.add("d-none"), 2000);

    atualizarFiltro();
});

// botões
salvarSalariosBtn.addEventListener("click", salvarSalarios);
if (extratoWhatsappBtn) {
    extratoWhatsappBtn.addEventListener("click", async () => {
        const filtroPessoa = filtro.value;
        let query = db.collection("movimentacoes").orderBy("data", "desc");

        if (filtroPessoa !== "todos") {
            query = db.collection("movimentacoes")
                .where("quem", "==", filtroPessoa)
                .orderBy("data", "desc");
        }

        const snapshot = await query.get();
        const movimentacoes = snapshot.docs.map(doc => doc.data());

        const mensagem = montarMensagemExtrato(movimentacoes, filtroPessoa);
        abrirWhatsApp("", mensagem);
    });
}

// inicialização
carregarMovimentacoes("todos");
atualizarFiltro();
fetchSalarios();
filtro.addEventListener("change", () => carregarMovimentacoes(filtro.value));
