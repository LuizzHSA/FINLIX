document.addEventListener('DOMContentLoaded', () => {
    // ----- SELETORES -----
    const formMovimentacao = document.getElementById('form-movimentacao');
    const notificacaoDiv = document.getElementById('notificacao');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const extratoWhatsappBtn = document.getElementById('extrato-whatsapp-btn');
    const extratoDiv = document.getElementById('extrato');
    const mostrarGraficoBtn = document.getElementById('mostrar-grafico-btn');
    const graficoSecao = document.getElementById('grafico-secao');
    const graficoCanvas = document.getElementById('graficoDespesas');

    const filtroPessoaSelect = document.getElementById('filtro-pessoa');
    const filtroCategoriaSelect = document.getElementById('filtro-categoria');
    const filtroDataInicioInput = document.getElementById('filtro-data-inicio');
    const filtroDataFimInput = document.getElementById('filtro-data-fim');
    const aplicarFiltrosBtn = document.getElementById('aplicar-filtros');

    const formSalarios = document.getElementById('form-salarios');
    const salarioLuizInput = document.getElementById('salario-luiz');
    const salarioKetyInput = document.getElementById('salario-kety');
    const saldoDisponivelSpan = document.getElementById('saldo-disponivel');
    const despesasLuizSpan = document.getElementById('despesas-luiz');
    const despesasKetySpan = document.getElementById('despesas-kety');

    const formInvestimento = document.getElementById('form-investimento');
    const listaInvestimentosDiv = document.getElementById('lista-investimentos');

    const formCartao = document.getElementById('form-cartao');
    const listaCartoesDiv = document.getElementById('lista-cartoes');

    let movimentacoes = [];
    let graficoInstance = null;
    let salarios = { luiz: 0, kety: 0 };

    // ----- FUNÇÕES -----
    async function fetchMovimentacoes(filtros = {}) {
        try {
            let query = db.collection('movimentacoes').orderBy('data','desc');
            if(filtros.pessoa && filtros.pessoa!=='todos') query=query.where('quem','==',filtros.pessoa);
            if(filtros.categoria && filtros.categoria!=='todos') query=query.where('categoria','==',filtros.categoria);
            if(filtros.dataInicio) query=query.where('data','>=',filtros.dataInicio);
            if(filtros.dataFim) query=query.where('data','<=',filtros.dataFim);

            const snapshot = await query.get();
            movimentacoes = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
            renderizarExtrato();
            atualizarSaldos();
        } catch(e){
            console.error(e);
            extratoDiv.innerHTML='<p class="text-red-500">Erro ao carregar movimentações.</p>';
        }
    }

    function renderizarExtrato(){
        extratoDiv.innerHTML='';
        if(movimentacoes.length===0){
            extratoDiv.innerHTML='<p class="text-gray-500">Nenhuma movimentação encontrada.</p>';
            return;
        }
        movimentacoes.forEach(mov=>{
            const card = document.createElement('div');
            card.className='bg-white shadow-md rounded p-3 flex justify-between items-center animate-fadeIn';
            const emoji = mov.tipo==='despesa'?'🔴':'🟢';
            card.innerHTML=`
                <div>
                    ${emoji} <strong>${mov.descricao}</strong><br>
                    <small>R$ ${parseFloat(mov.valor).toFixed(2)} | ${mov.quem} | ${mov.data} | ${mov.categoria}</small>
                </div>
                <button class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition excluir-btn" data-id="${mov.id}">Excluir</button>
            `;
            extratoDiv.appendChild(card);
        });

        document.querySelectorAll('.excluir-btn').forEach(btn=>{
            btn.addEventListener('click',async e=>{
                const id = e.target.dataset.id;
                if(confirm('Deseja excluir esta movimentação?')){
                    await db.collection('movimentacoes').doc(id).delete();
                    fetchMovimentacoes();
                }
            });
        });
    }

    function gerarGrafico(){
        const despesas = movimentacoes.filter(m=>m.tipo==='despesa');
        if(despesas.length===0){
            graficoSecao.classList.add('hidden');
            return;
        }
        const dados={};
        despesas.forEach(m=>dados[m.categoria]=(dados[m.categoria]||0)+parseFloat(m.valor));
        const labels = Object.keys(dados);
        const data = Object.values(dados);
        if(graficoInstance) graficoInstance.destroy();
        const cores = labels.map(()=>`rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},0.6)`);
        graficoInstance = new Chart(graficoCanvas,{
            type:'pie',
            data:{labels,datasets:[{label:'Gastos',data,backgroundColor:cores,hoverOffset:4}]},
            options:{responsive:true,plugins:{legend:{position:'top'},title:{display:true,text:'Despesas por Categoria'}},animation:{duration:1000,easing:'easeOutQuart'}}
        });
        graficoSecao.classList.remove('hidden');
    }

    async function fetchSalarios(){
        const doc = await db.collection('salarios').doc('fixos').get();
        if(doc.exists) salarios=doc.data();
        salarioLuizInput.value=salarios.luiz||0;
        salarioKetyInput.value=salarios.kety||0;
        atualizarSaldos();
    }

    function atualizarSaldos(){
        const despLuiz=movimentacoes.filter(m=>m.tipo==='despesa'&&m.quem==='Luiz').reduce((a,b)=>a+parseFloat(b.valor),0);
        const despKety=movimentacoes.filter(m=>m.tipo==='despesa'&&m.quem==='Kety').reduce((a,b)=>a+parseFloat(b.valor),0);
        const entradas=movimentacoes.filter(m=>m.tipo==='entrada').reduce((a,b)=>a+parseFloat(b.valor),0);
        const saldo=(salarios.luiz||0)+(salarios.kety||0)+entradas-despLuiz-despKety;
        saldoDisponivelSpan.textContent=`R$ ${saldo.toFixed(2)}`;
        despesasLuizSpan.textContent=`R$ ${despLuiz.toFixed(2)}`;
        despesasKetySpan.textContent=`R$ ${despKety.toFixed(2)}`;
    }

    async function fetchInvestimentos(){
        const snapshot=await db.collection('investimentos').get();
        listaInvestimentosDiv.innerHTML='';
        if(snapshot.empty){
            listaInvestimentosDiv.innerHTML='<p class="text-gray-500">Nenhuma meta de investimento.</p>';
            return;
        }
        snapshot.forEach(doc=>{
            const data=doc.data();
            const div=document.createElement('div');
            div.className='bg-gray-100 p-2 rounded animate-fadeIn';
            const perc=Math.min((data.atual/data.alvo)*100,100);
            div.innerHTML=`
                <strong>${data.nome}</strong> - R$ ${data.atual.toFixed(2)}/${data.alvo.toFixed(2)}
                <div class="w-full bg-gray-300 h-2 rounded mt-1 overflow-hidden">
                    <div class="bg-green-500 h-2 rounded transition-all duration-700" style="width:0%"></div>
                </div>`;
            listaInvestimentosDiv.appendChild(div);
            setTimeout(()=>div.querySelector('.bg-green-500').style.width=perc+'%',50);
        });
    }

    async function fetchCartoes(){
        const snapshot=await db.collection('cartoes').get();
        listaCartoesDiv.innerHTML='';
        if(snapshot.empty){
            listaCartoesDiv.innerHTML='<p class="text-gray-500">Nenhum cartão adicionado.</p>';
            return;
        }
        snapshot.forEach(doc=>{
            const data=doc.data();
            const div=document.createElement('div');
            div.className='bg-gray-100 p-2 rounded animate-fadeIn';
            div.innerHTML=`<strong>${data.nome}</strong> - Limite: R$ ${data.limite.toFixed(2)} | Vencimento: dia ${data.vencimento}`;
            listaCartoesDiv.appendChild(div);
        });
    }

    function abrirWhatsApp(num,mensagem){
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`,'_blank');
    }

    // ----- EVENTOS -----
    formMovimentacao.addEventListener('submit',async e=>{
        e.preventDefault();
        const mov={
            tipo: document.getElementById('tipo').value,
            descricao: document.getElementById('descricao').value,
            categoria: document.getElementById('categoria').value,
            valor: parseFloat(document.getElementById('valor').value),
            data: document.getElementById('data').value,
            quem: document.getElementById('quem').value
        };
        await db.collection('movimentacoes').add(mov);
        notificacaoDiv.textContent='Movimentação registrada com sucesso!';
        notificacaoDiv.style.display='block';
        setTimeout(()=>notificacaoDiv.style.display='none',3000);
        formMovimentacao.reset();
        fetchMovimentacoes();
    });

    aplicarFiltrosBtn.addEventListener('click',()=>{
        const filtros={
            pessoa:filtroPessoaSelect.value,
            categoria:filtroCategoriaSelect.value,
            dataInicio:filtroDataInicioInput.value,
            dataFim:filtroDataFimInput.value
        };
        fetchMovimentacoes(filtros);
    });

    whatsappBtn.addEventListener('click',()=>{
        const tipo=document.getElementById('tipo').value;
        const descricao=document.getElementById('descricao').value;
        const valor=parseFloat(document.getElementById('valor').value);
        const data=document.getElementById('data').value;
        const quem=document.getElementById('quem').value;
        const categoria=document.getElementById('categoria').value;
        if(!descricao||!valor||!data){ alert('Preencha todos os campos!'); return; }
        const tipoTexto=tipo==='despesa'?'Despesa':'Entrada';
        const msg=`${tipoTexto} registrada por ${quem}:\n- Descrição: ${descricao}\n- Categoria: ${categoria}\n- Valor: R$ ${valor.toFixed(2)}\n- Data: ${data}`;
        abrirWhatsApp('',msg);
    });

    extratoWhatsappBtn.addEventListener('click',()=>{
        if(movimentacoes.length===0){ alert('Nenhuma movimentação para enviar'); return; }
        let msg='Extrato de Movimentações\n\n';
        movimentacoes.forEach(m=>{
            const emoji=m.tipo==='despesa'?'🔴':'🟢';
            msg+=`${emoji} ${m.descricao}: R$ ${parseFloat(m.valor).toFixed(2)} (${m.data}) por ${m.quem} - ${m.categoria}\n`;
        });
        abrirWhatsApp('',msg);
    });

    mostrarGraficoBtn.addEventListener('click',()=>gerarGrafico());

    formSalarios.addEventListener('submit',async e=>{
        e.preventDefault();
        salarios={luiz:parseFloat(salarioLuizInput.value), kety:parseFloat(salarioKetyInput.value)};
        await db.collection('salarios').doc('fixos').set(salarios);
        atualizarSaldos();
        alert('Salários salvos!');
    });

    formInvestimento.addEventListener('submit',async e=>{
        e.preventDefault();
        const meta={
            nome: document.getElementById('meta-nome').value,
            atual: parseFloat(document.getElementById('meta-atual').value),
            alvo: parseFloat(document.getElementById('meta-alvo').value)
        };
        await db.collection('investimentos').add(meta);
        formInvestimento.reset();
        fetchInvestimentos();
    });

    formCartao.addEventListener('submit',async e=>{
        e.preventDefault();
        const cartao={
            nome: document.getElementById('cartao-nome').value,
            limite: parseFloat(document.getElementById('cartao-limite').value),
            vencimento: parseInt(document.getElementById('cartao-vencimento').value)
        };
        await db.collection('cartoes').add(cartao);
        formCartao.reset();
        fetchCartoes();
    });

    // ----- INICIALIZAÇÃO -----
    fetchMovimentacoes();
    fetchSalarios();
    fetchInvestimentos();
    fetchCartoes();
});
