# FINLIX
Este é um assistente de finanças pessoal e compartilhado, desenvolvido para ajudar a gerenciar e visualizar suas movimentações financeiras de forma simples e sincronizada.

O projeto foi construído com foco na praticidade, permitindo o registro de gastos e entradas, visualização de extratos e gráficos.


## ✨ Funcionalidades
Registro de Movimentações: Formulário simples para registrar despesas e entradas com detalhes como valor, data, categoria e quem realizou a transação.

Extrato Dinâmico: Visualização em tempo real de todas as movimentações registradas.

Gráfico de Despesas: Gráfico de pizza que mostra a distribuição dos gastos por categoria, oferecendo uma visão clara do orçamento.

Sincronização com o Backend: Os dados são salvos e sincronizados em um banco de dados em nuvem, acessível de qualquer dispositivo.



## 🛠️ Tecnologias Utilizadas
Frontend: HTML5, CSS3 (design limpo e responsivo), JavaScript (ES6+).

Backend: Firebase (Cloud Firestore) para persistência de dados.

Visualização: Chart.js para renderização dos gráficos.

Hospedagem: Vercel para o deploy do frontend.



## 🚀 Como Rodar o Projeto
Para usar o projeto, você precisa conectá-lo a um banco de dados Firebase.

Configurar o Firebase:

Crie um projeto no Firebase Console.

Habilite o serviço Cloud Firestore.

Em "Project Settings" > "General", adicione um aplicativo web e copie o firebaseConfig que ele te fornecer.

Atualizar o Código:

Cole o firebaseConfig no seu arquivo index.html.

Certifique-se de que o seu script.js e style.css estão na versão mais recente que te forneci.

Hospedar no Vercel:

Conecte seu projeto a um repositório no GitHub.

No Vercel, importe o seu repositório. O deploy será feito automaticamente e o seu site estará online e sincronizado.


## 🗺️ Roteiro Futuro
O projeto é uma base sólida e ainda tem muito a evoluir. As próximas etapas poderiam incluir:

Autenticação de Usuários: Um sistema de login e registro para que cada pessoa tenha sua própria conta segura.

Gerenciador de Cartões: Uma seção para monitorar faturas, limites e gastos de cartões de crédito.

Desenvolvimento Mobile: Expansão para uma aplicação nativa ou cross-platform (via React Native).



