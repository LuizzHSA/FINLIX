document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os elementos do HTML
    const form = document.getElementById('form-movimentacao');
    const tipoSelect = document.getElementById('tipo');
    const descricaoInput = document.getElementById('descricao');
    const categoriaSelect = document.getElementById('categoria');
    const valorInput = document.getElementById('valor');
    const dataInput = document.getElementById('data');
    const quemSelect = document.getElementById('quem');
    const notificacaoDiv = document.getElementById('notificacao');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const extratoWhatsappBtn = document.getElementById('extrato-whatsapp-btn');
    const extratoDiv = document.getElementById('extrato');
    const mostrarGraficoBtn = document.getElementById('mostrar-grafico-btn');
    const graficoSecao = document.getElementById('grafico-secao');
    const graficoCanvas = document.getElementById('graficoDespesas');

    let movimentacoes = [];
    let graficoInstance = null;

    // Função para buscar as movimentações do Firebase
    async function fetchMovimentacoes() {
        try {
            const snapshot = await db.collection('movimentacoes').orderBy('data', 'desc').get();
            movimentacoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderizarExtrato();
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error);
            extratoDiv.innerHTML = '<p class="aviso">Erro ao carregar os dados.</p>';
        }
    }

    // Função para renderizar o extrato na tela
    function renderizarExtrato() {
        extratoDiv.innerHTML = '';
        if (movimentacoes.length === 0) {
            extratoDiv.innerHTML = '<p class="aviso">Nenhuma movimentação registrada ainda.</p>';
            return;
        }
        const ul = document.createElement('ul');
        movimentacoes.forEach(mov => {
            const li = document.createElement('li');
            const classe = mov.tipo === 'despesa' ? 'despesa' : 'entrada';
            const emoji = mov.tipo === 'despesa' ? '🔴' : '🟢';
            li.className = classe;
            li.innerHTML = `${emoji} ${mov.descricao} (${mov.categoria}) - R$ ${parseFloat(mov.valor).toFixed(2)} (${mov.data}) por ${mov.quem}`;
            ul.appendChild(li);
        });
        extratoDiv.appendChild(ul);
    }

    // Função para gerar o gráfico
    function gerarGrafico() {
        const despesas = movimentacoes.filter(mov => mov.tipo === 'despesa');
        if (despesas.length === 0) {
            graficoSecao.innerHTML = '<h2>Gráfico de Despesas por Categoria</h2><p class="aviso">Não há despesas para gerar o gráfico.</p>';
            return;
        }
        const gastosPorCategoria = {};
        despesas.forEach(mov => {
            const categoria = mov.categoria;
            const valor = parseFloat(mov.valor);
            gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + valor;
        });
        const labels = Object.keys(gastosPorCategoria);
        const data = Object.values(gastosPorCategoria);
        if (graficoInstance) {
            graficoInstance.destroy();
        }
        const backgroundColors = labels.map(() => {
            const r = Math.floor(Math.random() * 255);
            const g = Math.floor(Math.random() * 255);
            const b = Math.floor(Math.random() * 255);
            return `rgba(${r}, ${g}, ${b}, 0.6)`;
        });
        graficoInstance = new Chart(graficoCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos por Categoria',
                    data: data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Distribuição de Despesas' }
                }
            }
        });
        graficoSecao.style.display = 'block';
    }

    // Event Listeners
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const novaMovimentacao = {
            tipo: tipoSelect.value,
            descricao: descricaoInput.value,
            categoria: categoriaSelect.value,
            valor: parseFloat(valorInput.value),
            data: dataInput.value,
            quem: quemSelect.value
        };
        try {
            await db.collection('movimentacoes').add(novaMovimentacao);
            notificacaoDiv.textContent = 'Movimentação registrada com sucesso!';
            notificacaoDiv.style.display = 'block';
            setTimeout(() => { notificacaoDiv.style.display = 'none'; }, 3000);
            form.reset();
            await fetchMovimentacoes();
        } catch (error) {
            console.error('Erro:', error);
            alert('Não foi possível se conectar ao Firebase.');
        }
    });

    whatsappBtn.addEventListener('click', () => {
        const tipo = tipoSelect.value;
        const descricao = descricaoInput.value;
        const valor = parseFloat(valorInput.value).toFixed(2);
        const data = dataInput.value;
        const quem = quemSelect.value;
        const categoria = categoriaSelect.value;
        if (!descricao || !valor || !data) {
            alert('Por favor, preencha todos os campos para enviar a mensagem!');
            return;
        }
        const tipoTexto = tipo === 'despesa' ? 'Despesa' : 'Entrada';
        const mensagem = `${tipoTexto} registrada por ${quem}:\n- Descrição: ${descricao}\n- Categoria: ${categoria}\n- Valor: R$ ${valor}\n- Data: ${data}`;
        abrirWhatsApp('', mensagem);
    });

    extratoWhatsappBtn.addEventListener('click', () => {
        let totalEntradas = 0;
        let totalDespesas = 0;
        let mensagem = `Extrato de Movimentações\n\n`;
        if (movimentacoes.length === 0) {
            mensagem += `Nenhuma movimentação registrada.`;
        } else {
            movimentacoes.forEach(mov => {
                const valor = parseFloat(mov.valor);
                if (mov.tipo === 'entrada') {
                    totalEntradas += valor;
                } else {
                    totalDespesas += valor;
                }
                const emoji = mov.tipo === 'despesa' ? '🔴' : '🟢';
                mensagem += `${emoji} ${mov.descricao}: R$ ${valor.toFixed(2)} (${mov.data}) por ${mov.quem} - Categoria: ${mov.categoria}\n`;
            });
            const saldo = totalEntradas - totalDespesas;
            const emojiSaldo = saldo >= 0 ? '✅' : '❌';
            mensagem += `\n---
Sumário:
🟢 Total de Entradas: R$ ${totalEntradas.toFixed(2)}
🔴 Total de Despesas: R$ ${totalDespesas.toFixed(2)}
${emojiSaldo} Saldo Final: R$ ${saldo.toFixed(2)}
---`;
        }
        abrirWhatsApp('', mensagem);
    });

    mostrarGraficoBtn.addEventListener('click', () => {
        gerarGrafico();
    });

    fetchMovimentacoes();
});