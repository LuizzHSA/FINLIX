import os
from flask import Flask, render_template, request, jsonify
import psycopg2
from psycopg2 import sql

app = Flask(__name__)

# Configura a conexão com o banco de dados
# Em produção, a string de conexão deve vir de uma variável de ambiente por segurança
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost/dbname')

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    return conn

@app.route('/')
def index():
    # A rota principal que serve o seu arquivo HTML
    return render_template('index.html')

@app.route('/api/movimentacoes', methods=['GET', 'POST'])
def api_movimentacoes():
    if request.method == 'POST':
        data = request.json
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = sql.SQL("INSERT INTO movimentacoes (tipo, descricao, categoria, valor, data, quem) VALUES (%s, %s, %s, %s, %s, %s)")
                cursor.execute(query, (data['tipo'], data['descricao'], data['categoria'], data['valor'], data['data'], data['quem']))
                conn.commit()
        return jsonify({"status": "sucesso", "message": "Movimentação salva!"}), 201
    
    elif request.method == 'GET':
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM movimentacoes ORDER BY created_at DESC")
                columns = [desc[0] for desc in cursor.description]
                movimentacoes = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(movimentacoes)

if __name__ == '__main__':
    app.run(debug=True)