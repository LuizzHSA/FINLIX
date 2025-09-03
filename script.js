document.addEventListener('DOMContentLoaded', () => {
    // Seletores
    const form = document.getElementById('form-movimentacao');
    const tipo = document.getElementById('tipo');
    const descricao = document.getElementById('descricao');
    const categoria = document.getElementById('categoria');
    const valor = document.getElementById('valor');
    const data = document.getElementById('data');
    const quem = document.getElementById('quem');
    const notificacao = document.getElementById('notificacao');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const extratoWhatsappBtn = document.getElementById('extrato-whatsapp-btn');
    const extrato = document.getElementById('extrato');
    const mostrarGraficoBtn = document.getElementById('mostrar-grafico-btn');
    const graficoSecao = document.getElementById('grafico-secao');
    const graficoCanvas = document.getElementById('graficoDespesas');

    let movimentacoes = [];
    let graficoInstance = null;

    // ================== FIREBASE REALTIME ==================
    function escutarMovimentacoes() {
        db.collection('movimentacoes').orderBy('data', 'desc')
            .onSnapshot(snapshot => {
                movimentacoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderizarExtrato();
            }, error => {
                console.error('Erro ao buscar movimentações:', error);
                extrato.innerHTML = '<p class="aviso">Erro ao carregar os dados.</p>';
            });
    }

    // ================== RENDERIZAÇÃO ==================
    function renderizarExtrato() {
        extrato.innerHTML = '';
        if (movimentacoes.length === 0) {
            extrato.innerHTML = '<p class="aviso">Nenhuma movimentação registrada ainda.</p>';
            return;
        }
        const ul = document.createElement('ul');
        movimentacoes.forEach(mov => {
            const li = document.createElement('li');
            li.className = mov.tipo === 'despesa' ? 'despesa' : 'entrada';
            const emoji = mov.tipo === 'despesa' ? '🔴' : '🟢';
            li.innerHTML = `${emoji} ${mov.descricao} (${mov.categoria}) - R$ ${parseFloat(mov.valor).toFixed(2)} (${mov.data}) por ${mov.quem}`;
            ul.appendChild(li);
        });
        extrato.appendChild(ul);
    }

    // ================== GRÁFICO ==================
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
        if (graficoInstance) graficoInstance.destroy();
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

    // ================== WHATSAPP ==================
    function abrirWhatsApp(numero, mensagem) {
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
    }

    function montarMensagemMovimentacao() {
        const tipoTexto = tipo.value === 'despesa' ? 'Despesa' : 'Entrada';
        return `${tipoTexto} registrada por ${quem.value}:\n- Descrição: ${descricao.value}\n- Categoria: ${categoria.value}\n- Valor: R$ ${parseFloat(valor.value).toFixed(2)}\n- Data: ${data.value}`;
    }

    function montarMensagemExtrato() {
        let totalEntradas = 0;
        let totalDespesas = 0;
        let mensagem = `Extrato de Movimentações\n\n`;
        if (movimentacoes.length === 0) {
            mensagem += `Nenhuma movimentação registrada.`;
        } else {
            movimentacoes.forEach(mov => {
                const valorMov = parseFloat(mov.valor);
                if (mov.tipo === 'entrada') totalEntradas += valorMov;
                else totalDespesas += valorMov;
                const emoji = mov.tipo === 'despesa' ? '🔴' : '🟢';
                mensagem += `${emoji} ${mov.descricao}: R$ ${valorMov.toFixed(2)} (${mov.data}) por ${mov.quem} - Categoria: ${mov.categoria}\n`;
            });
            const saldo = totalEntradas - totalDespesas;
            const emojiSaldo = saldo >= 0 ? '✅' : '❌';
            mensagem += `\n---\nSumário:\n🟢 Total de Entradas: R$ ${totalEntradas.toFixed(2)}\n🔴 Total de Despesas: R$ ${totalDespesas.toFixed(2)}\n${emojiSaldo} Saldo Final: R$ ${saldo.toFixed(2)}\n---`;
        }
        return mensagem;
    }

    // ================== EVENTOS ==================
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const novaMovimentacao = {
            tipo: tipo.value,
            descricao: descricao.value,
            categoria: categoria.value,
            valor: parseFloat(valor.value),
            data: data.value,
            quem: quem.value
        };
        try {
            await db.collection('movimentacoes').add(novaMovimentacao);
            notificacao.textContent = 'Movimentação registrada com sucesso!';
            notificacao.style.display = 'block';
            setTimeout(() => { notificacao.style.display = 'none'; }, 3000);
            form.reset();
        } catch (error) {
            console.error('Erro:', error);
            alert('Não foi possível se conectar ao Firebase.');
        }
    });

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            if (!descricao.value || !valor.value || !data.value) {
                alert('Por favor, preencha todos os campos para enviar a mensagem!');
                return;
            }
            abrirWhatsApp('', montarMensagemMovimentacao());
        });
    }

    if (extratoWhatsappBtn) {
        extratoWhatsappBtn.addEventListener('click', () => {
            abrirWhatsApp('', montarMensagemExtrato());
        });
    }

    if (mostrarGraficoBtn) {
        mostrarGraficoBtn.addEventListener('click', gerarGrafico);
    }

    // ================== INICIALIZAÇÃO ==================
    escutarMovimentacoes();
    
    fetchMovimentacoes();
});