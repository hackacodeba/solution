document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    if (email === '' || password === '') {
        messageDiv.style.display = 'block';
        messageDiv.className = 'mt-3 text-center alert alert-danger';
        messageDiv.textContent = 'Por favor, preencha todos os campos.';
    } else {
        // Simulação de login (em um cenário real, enviaria para o servidor)
        messageDiv.style.display = 'block';
        messageDiv.className = 'mt-3 text-center alert alert-success';
        messageDiv.textContent = 'Login realizado com sucesso!';
        // Redirecionar para o dashboard após 2 segundos
        setTimeout(() => {
            window.location.href = 'pages/dashboard.html';
        }, 2000);
    }
});