import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔑 Troque pelas suas credenciais do Supabase
const SUPABASE_URL = "https://uavfnaupgxrztcwhnqwq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdmZuYXVwZ3hyenRjd2hucXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDQ1NzUsImV4cCI6MjA3MjMyMDU3NX0.GdfbtvGs3dlpZNymP7YDSzcVNI-TW6p6fO_M7_Suqdw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== REGISTRAR MOVIMENTAÇÃO ==================
document.getElementById("form-movimentacao").addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipo = document.getElementById("tipo").value;
    const descricao = document.getElementById("descricao").value;
    const categoria = document.getElementById("categoria").value;
    const valor = parseFloat(document.getElementById("valor").value);
    const data = document.getElementById("data").value;
    const quem = document.getElementById("quem").value;

    const { error } = await supabase
        .from("movimentacoes")
        .insert([{ tipo, descricao, categoria, valor, data, quem }]);

    if (error) {
        alert("Erro ao registrar movimentação: " + error.message);
        return;
    }

    document.getElementById("notificacao").style.display = "block";
    setTimeout(() => {
        document.getElementById("notificacao").style.display = "none";
    }, 3000);

    e.target.reset();
    carregarExtrato();
    carregarGrafico();
});

// ================== CARREGAR EXTRATO ==================
async function carregarExtrato() {
    const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .order("data", { ascending: false });

    if (error) {
        console.error("Erro ao carregar extrato:", error);
        return;
    }

    const extratoDiv = document.getElementById("extrato");
    extratoDiv.innerHTML = "";

    data.forEach((mov) => {
        const item = document.createElement("div");
        item.classList.add("extrato-item");
        item.innerHTML = `
            <span><strong>${mov.tipo.toUpperCase()}</strong> - ${mov.descricao} (${mov.categoria})</span>
            <span>R$ ${mov.valor.toFixed(2)} - ${mov.quem} - ${mov.data}</span>
        `;
        extratoDiv.appendChild(item);
    });
}

// ================== ENVIAR PARA WHATSAPP ==================
document.getElementById("whatsapp-btn").addEventListener("click", async () => {
    const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .order("data", { ascending: false })
        .limit(1);

    if (error || !data.length) {
        alert("Nenhuma movimentação encontrada!");
        return;
    }

    const mov = data[0];
    const mensagem = `💸 Nova movimentação registrada:\n\nTipo: ${mov.tipo}\nDescrição: ${mov.descricao}\nCategoria: ${mov.categoria}\nValor: R$ ${mov.valor.toFixed(2)}\nData: ${mov.data}\nQuem: ${mov.quem}`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
});

// ================== ENVIAR EXTRATO COMPLETO ==================
document.getElementById("extrato-whatsapp-btn").addEventListener("click", async () => {
    const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .order("data", { ascending: false });

    if (error || !data.length) {
        alert("Nenhuma movimentação encontrada!");
        return;
    }

    let mensagem = "📊 Extrato de Movimentações:\n\n";
    data.forEach((mov) => {
        mensagem += `- ${mov.tipo.toUpperCase()} | ${mov.descricao} | R$ ${mov.valor.toFixed(2)} | ${mov.categoria} | ${mov.quem} | ${mov.data}\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
});

// ================== GRÁFICO ==================
let chartInstance = null;
async function carregarGrafico() {
    const { data, error } = await supabase
        .from("movimentacoes")
        .select("categoria, valor, tipo");

    if (error) {
        console.error("Erro ao carregar gráfico:", error);
        return;
    }

    const despesas = data.filter(m => m.tipo === "despesa");
    const categorias = {};
    despesas.forEach(m => {
        categorias[m.categoria] = (categorias[m.categoria] || 0) + m.valor;
    });

    const ctx = document.getElementById("graficoDespesas").getContext("2d");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(categorias),
            datasets: [{
                data: Object.values(categorias),
                backgroundColor: [
                    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
                    "#9966FF", "#FF9F40", "#E91E63", "#009688"
                ],
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
        },
    });
}

document.getElementById("mostrar-grafico-btn").addEventListener("click", () => {
    document.getElementById("grafico-secao").style.display = "block";
    carregarGrafico();
});

// ================== AUTO CARREGAR ==================
carregarExtrato();
