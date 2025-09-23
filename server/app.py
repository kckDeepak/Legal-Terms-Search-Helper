import os
import re
import datetime
import mysql.connector
from sentence_transformers import SentenceTransformer
import chromadb
import chromadb.errors
from transformers import pipeline
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# Load environment variables from .env file
load_dotenv()

# Configuration
UPLOAD_FOLDER = 'uploads'
CHROMA_COLLECTION_NAME = 'legal_docs'
TOP_K = 5
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
QA_MODEL = 'distilbert-base-uncased-distilled-squad'

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Load sensitive data from .env
MYSQL_HOST = os.getenv('MYSQL_HOST')
MYSQL_USER = os.getenv('MYSQL_USER')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD')
MYSQL_DB = os.getenv('MYSQL_DB')

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'txt'}

# Initialize embedding model
try:
    embedder = SentenceTransformer(EMBEDDING_MODEL)
except Exception as e:
    print(f"Error loading embedding model: {e}")
    exit(1)

# Initialize ChromaDB client
try:
    chroma_client = chromadb.Client()
except Exception as e:
    print(f"Error initializing ChromaDB client: {e}")
    exit(1)

# Initialize Hugging Face question-answering pipeline
try:
    qa_pipeline = pipeline('question-answering', model=QA_MODEL, tokenizer=QA_MODEL)
except Exception as e:
    print(f"Error loading QA model: {e}")
    exit(1)

# Setup MySQL database and table
def setup_mysql():
    try:
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DB}")
        conn.commit()
        cursor.close()
        conn.close()

        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DB
        )
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS qa_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                timestamp DATETIME NOT NULL
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        exit(1)

# Save Q&A to MySQL
def save_to_mysql(question, answer):
    try:
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DB
        )
        cursor = conn.cursor()
        timestamp = datetime.datetime.now()
        cursor.execute(
            "INSERT INTO qa_history (question, answer, timestamp) VALUES (%s, %s, %s)",
            (question, answer, timestamp)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except mysql.connector.Error as err:
        print(f"Error saving to MySQL: {err}")

# Check if file extension is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Load and process legal text
def load_legal_text(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        chunks = [chunk.strip() for chunk in re.split(r'\n\s*\n', text) if chunk.strip()]
        return chunks
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        raise
    except Exception as e:
        print(f"Error reading file: {e}")
        raise

# Index chunks into ChromaDB
def index_chunks(chunks):
    try:
        # Delete existing collection to ensure fresh indexing
        try:
            chroma_client.delete_collection(name=CHROMA_COLLECTION_NAME)
        except chromadb.errors.NotFoundError:
            pass
        collection = chroma_client.create_collection(name=CHROMA_COLLECTION_NAME)
        
        embeddings = embedder.encode(chunks)
        ids = [f"chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"text": chunk[:200], "section": extract_section(chunk)} for chunk in chunks]
        collection.add(ids=ids, embeddings=embeddings.tolist(), metadatas=metadatas)
        return collection
    except Exception as e:
        print(f"Error indexing chunks: {e}")
        raise

# Extract section from chunk
def extract_section(chunk):
    match = re.search(r'(Section\s)?(\d+\.\d+)', chunk)
    return match.group(2) if match else "Unknown"

# Retrieve relevant chunks for a query
def retrieve_chunks(query, collection, top_k=TOP_K):
    try:
        query_embedding = embedder.encode([query]).tolist()
        results = collection.query(query_embeddings=query_embedding, n_results=top_k)
        return [meta['text'] for meta in results['metadatas'][0]], [meta['section'] for meta in results['metadatas'][0]]
    except Exception as e:
        print(f"Error retrieving chunks: {e}")
        return [], []

# Generate answer using Hugging Face QA model
def generate_answer(query, contexts, sections):
    context_str = " ".join([f"Section {sec}: {ctx}" for ctx, sec in zip(contexts, sections)])
    if not context_str.strip():
        return "No relevant information found in the document."
    
    try:
        result = qa_pipeline(question=query, context=context_str)
        return result['answer']  # Return only the answer, without section
    except Exception as e:
        print(f"Error generating answer: {e}")
        return "Unable to generate an answer due to an error."

# Initialize MySQL
setup_mysql()

# Global variable to store current collection
current_collection = None

# Route for file upload
@app.route('/upload', methods=['POST'])
def upload_file():
    global current_collection
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Process and index the file
            chunks = load_legal_text(file_path)
            current_collection = index_chunks(chunks)
            
            # Clean up the uploaded file
            os.remove(file_path)
            
            return jsonify({'message': 'File uploaded and indexed successfully'})
        else:
            return jsonify({'error': 'Invalid file type. Only .txt files are allowed'}), 400
    except Exception as e:
        print(f"Error processing file upload: {e}")
        return jsonify({'error': 'Failed to process file'}), 500

# Route for querying legal terms
@app.route('/query', methods=['POST'])
def query_legal_terms():
    global current_collection
    try:
        if current_collection is None:
            return jsonify({'error': 'No document uploaded. Please upload a .txt file first.'}), 400
        
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({'error': 'Missing question in request body'}), 400
        
        question = data['question'].strip()
        if not question:
            return jsonify({'error': 'Question cannot be empty'}), 400

        contexts, sections = retrieve_chunks(question, current_collection)
        answer = generate_answer(question, contexts, sections)
        save_to_mysql(question, answer)

        return jsonify({
            'question': question,
            'answer': answer
        })
    except Exception as e:
        print(f"Error processing query: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)