import os
import json
import datetime
import numpy as np
import faiss
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
import logging
from sentence_transformers import SentenceTransformer
from transformers import pipeline

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

load_dotenv()

# MySQL configuration from .env
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')

# Paths for FAISS index and chunks
INDEX_PATH = 'legal_index.faiss'
CHUNKS_PATH = 'legal_chunks.json'

# Load local embedding model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Load local generation model
generator = pipeline('text-generation', model='distilgpt2')

# Function to get embeddings locally
def get_embeddings(texts):
    try:
        if isinstance(texts, str):
            texts = [texts]
        embeddings = embedding_model.encode(texts, convert_to_tensor=False)
        logger.debug(f"Local embeddings generated for {len(texts)} texts")
        return embeddings
    except Exception as e:
        logger.error(f"Local embedding error: {str(e)}")
        raise ValueError(f"Local embedding error: {str(e)}")

# Function to generate answer using distilgpt2
def generate_answer(prompt):
    try:
        # Extract context and question
        context = prompt.split('Context:')[1].split('Question:')[0].strip()
        question = prompt.split('Question:')[1].split('Answer:')[0].strip().lower()
        
        # Simplified prompt for distilgpt2
        simplified_prompt = f"Given this context: {context}\nAnswer this question in one concise sentence: {question}"
        
        # Generate response
        result = generator(
            simplified_prompt,
            max_new_tokens=30,  # Further reduced to avoid irrelevant text
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=50256
        )
        generated_text = result[0]['generated_text'].strip()
        
        # Extract answer
        answer = generated_text.split("Answer this question in one concise sentence:")[1].strip() if "Answer this question in one concise sentence:" in generated_text else generated_text
        
        # Fallback to context if answer is irrelevant or doesn't contain key terms
        if "affidavit" not in answer.lower() or "defendant" in answer.lower() or "lawyer" in answer.lower() or len(answer) > 100:
            # Extract affidavit definition from context
            if "Affidavit:" in context:
                answer = context.split('Affidavit:')[1].split('\n\n')[0].strip()
            else:
                answer = "Definition not found in context."
        
        logger.debug(f"Local generation for prompt: {simplified_prompt[:50]}...")
        return answer
    except Exception as e:
        logger.error(f"Local generation error: {str(e)}")
        raise ValueError(f"Local generation error: {str(e)}")

# Function to chunk text (simple: split into ~500 char chunks)
def chunk_text(text, chunk_size=500):
    chunks = []
    current_chunk = ""
    for line in text.split('\n'):
        if len(current_chunk) + len(line) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = line
        else:
            current_chunk += '\n' + line
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks

# MySQL connection function
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return connection
    except Error as e:
        logger.error(f"Error connecting to MySQL: {e}")
        return None

# Endpoint to upload legal content
@app.route('/upload', methods=['POST'])
def upload_legal_content():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        content = file.read().decode('utf-8')
        chunks = chunk_text(content)
        logger.debug(f"Text chunks created: {len(chunks)} chunks")
        
        # Get embeddings
        embeddings = get_embeddings(chunks)
        embeddings_np = np.array(embeddings).astype('float32')
        
        # Create FAISS index
        dimension = embeddings_np.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(embeddings_np)
        
        # Save index and chunks
        faiss.write_index(index, INDEX_PATH)
        with open(CHUNKS_PATH, 'w') as f:
            json.dump(chunks, f)
        
        return jsonify({'message': 'Legal content uploaded and indexed successfully'}), 200
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Endpoint to ask a question
@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.json
    question = data.get('question')
    if not question:
        return jsonify({'error': 'No question provided'}), 400
    
    if not os.path.exists(INDEX_PATH) or not os.path.exists(CHUNKS_PATH):
        return jsonify({'error': 'No legal content indexed. Upload first.'}), 400
    
    try:
        # Load index and chunks
        index = faiss.read_index(INDEX_PATH)
        with open(CHUNKS_PATH, 'r') as f:
            chunks = json.load(f)
        
        # Embed question
        q_embedding = np.array(get_embeddings([question])).astype('float32')
        
        # Search for top 3 similar chunks
        distances, indices = index.search(q_embedding, k=3)
        relevant_chunks = [chunks[i] for i in indices[0] if i < len(chunks)]
        context = "\n\n".join(relevant_chunks)
        
        # Generate prompt
        prompt = f"Based on the following legal context, provide a clear and concise answer to the question. Reference specific sections if available.\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer:"
        
        # Generate answer
        answer = generate_answer(prompt)
        
        # Save to MySQL
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            query = "INSERT INTO qa_history (question, answer, created_at) VALUES (%s, %s, %s)"
            cursor.execute(query, (question, answer, datetime.datetime.now()))
            connection.commit()
            cursor.close()
            connection.close()
        
        return jsonify({'answer': answer}), 200
    except Exception as e:
        logger.error(f"Ask error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)