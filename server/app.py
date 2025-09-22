import os
import json
import datetime
import pymysql
from pymysql.cursors import DictCursor

import numpy as np
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# LangChain imports (updated for deprecation)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings  # Updated
from langchain_chroma import Chroma  # Updated
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain_huggingface import HuggingFacePipeline
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

# ---- Config ----
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "your_username")
DB_PASS = os.getenv("DB_PASS", "your_password")
DB_NAME = os.getenv("DB_NAME", "legal_rag_db")

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
LLM_MODEL_NAME = os.getenv("LLM_MODEL", "distilgpt2")

CHROMA_PERSIST_DIR = "./chroma_db"

app = Flask(__name__)

# Initialize embedding model
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)

# Initialize local LLM
tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(LLM_MODEL_NAME)
llm_pipeline = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_new_tokens=256,  # Reduced to avoid token limit
    temperature=0.7,
    device=-1,  # CPU
    return_full_text=False  # Avoid echoing prompt
)
llm = HuggingFacePipeline(pipeline=llm_pipeline)

# ---- DB Connection Helper ----
def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=DictCursor
    )

# ---- Utility Functions ----
def get_vectorstore():
    return Chroma(persist_directory=CHROMA_PERSIST_DIR, embedding_function=embeddings)

# ---- Flask Endpoints ----
@app.route("/upload_document", methods=["POST"])
def upload_document():
    conn = None
    try:
        if "file" in request.files:
            f = request.files["file"]
            raw_text = f.read().decode("utf-8", errors="ignore")
            title = f.filename or "Untitled"
            print(f"DEBUG: File upload - title: {title}, raw_text length: {len(raw_text)}")
        else:
            payload = request.get_json(force=True)
            raw_text = payload.get("text", "")
            title = payload.get("title", "Untitled")
            print(f"DEBUG: JSON payload - title: {title}, raw_text length: {len(raw_text)}")

        if not raw_text.strip():
            return jsonify({"error": "No valid text provided"}), 400

        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("INSERT INTO documents (title, raw_text) VALUES (%s, %s)", (title, raw_text))
            doc_id = cur.lastrowid
        conn.commit()
        print(f"DEBUG: Document saved to MySQL with ID: {doc_id}")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=350 * 4, chunk_overlap=50, separators=["\n\n", "\n", " ", ""])
        chunks = text_splitter.split_text(raw_text)
        print(f"DEBUG: Generated {len(chunks)} chunks")

        if not chunks:
            return jsonify({"error": "No chunks generated from text"}), 400

        vectorstore = get_vectorstore()
        ids = vectorstore.add_texts(
            texts=chunks,
            metadatas=[{"document_id": str(doc_id), "chunk_index": i+1} for i in range(len(chunks))]
        )
        print(f"DEBUG: Added {len(chunks)} chunks to Chroma for document_id={doc_id}, IDs={ids}")
        vectorstore.persist()

        return jsonify({"message": "Document uploaded and indexed", "document_id": doc_id}), 201
    except pymysql.MySQLError as e:
        if conn:
            conn.rollback()
        print(f"DEBUG: MySQL error: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        print(f"DEBUG: Server error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()

@app.route("/ask_question", methods=["POST"])
def ask_question():
    data = request.get_json(force=True)
    question = data.get("question")
    if not question:
        return jsonify({"error": "question is required"}), 400
    
    document_id = data.get("document_id")
    top_k = int(data.get("top_k", 4))

    try:
        vectorstore = get_vectorstore()
        print(f"DEBUG: Vector store initialized, persist_dir={CHROMA_PERSIST_DIR}")

        all_docs = vectorstore.get()
        doc_count = len(all_docs['ids'])
        print(f"DEBUG: Total documents in Chroma: {doc_count}")
        if doc_count == 0:
            answer_text = "No documents found in the vector store. Please upload a document first."
            references = []
            raise Exception("Empty vector store")

        for i, (id, text, meta) in enumerate(zip(all_docs['ids'], all_docs['documents'], all_docs['metadatas'])):
            print(f"DEBUG: Chroma Doc {i+1}: ID={id}, Text={text[:50]}..., Metadata={meta}")

        filter = {"document_id": str(document_id)} if document_id else None
        print(f"DEBUG: Filter applied: {filter}")

        retriever = vectorstore.as_retriever(search_kwargs={"k": top_k, "filter": filter})
        retrieved_docs = retriever.invoke(question)
        print(f"DEBUG: Retrieved {len(retrieved_docs)} documents for query: {question}")
        for i, doc in enumerate(retrieved_docs):
            print(f"DEBUG: Retrieved Doc {i+1}: {doc.page_content[:50]}... (metadata: {doc.metadata})")

        if not retrieved_docs:
            answer_text = "I cannot answer this question based on the provided documents."
            references = []
        else:
            prompt_template = """
            You are a helpful assistant specialized in legal terms. 
            Use only the provided CONTEXT to answer the QUESTION concisely. 
            If the CONTEXT lacks relevant information, respond with: 
            'I cannot answer this question based on the provided documents.'
            
            CONTEXT: {context}
            
            QUESTION: {question}
            
            ANSWER:
            """
            PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
            
            qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=retriever,
                return_source_documents=True,
                chain_type_kwargs={"prompt": PROMPT}
            )
            
            result = qa_chain.invoke({"query": question})
            answer_text = result["result"].strip()
            top_docs = result["source_documents"]

            if "ANSWER:" in answer_text:
                answer_text = answer_text.split("ANSWER:")[-1].strip()
            elif answer_text.startswith("You are a helpful assistant") or not answer_text:
                answer_text = "I cannot answer this question based on the provided documents."

            references = [
                {
                    "chunk_index": doc.metadata.get("chunk_index"),
                    "document_id": doc.metadata.get("document_id"),
                    "score": 1.0
                }
                for doc in top_docs
            ]

    except Exception as ex:
        print(f"DEBUG: Exception in ask_question: {str(ex)}")
        answer_text = answer_text if 'answer_text' in locals() else f"I cannot answer this question due to an error: {str(ex)}"
        references = references if 'references' in locals() else []

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO qa_log (user_question, system_answer, document_id) VALUES (%s, %s, %s)",
                (question, answer_text, document_id)
            )
            qa_id = cur.lastrowid
        conn.commit()
    except pymysql.MySQLError as e:
        print(f"DEBUG: MySQL error: {str(e)}")
        answer_text = f"Database error: {str(e)}"
    finally:
        conn.close()

    return jsonify({"answer": answer_text, "references": references, "qa_id": qa_id})

@app.route("/qa_history", methods=["GET"])
def qa_history():
    limit = int(request.args.get("limit", 50))
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM qa_log ORDER BY created_at DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return jsonify({"qa_logs": rows})

@app.route("/documents", methods=["GET"])
def list_documents():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, title, upload_date FROM documents ORDER BY upload_date DESC")
            docs = cur.fetchall()
    finally:
        conn.close()
    return jsonify({"documents": docs})

@app.route("/document/<int:doc_id>", methods=["GET"])
def get_document(doc_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM documents WHERE id=%s", (doc_id,))
            doc = cur.fetchone()
            if not doc:
                return jsonify({"error": "document not found"}), 404
        vectorstore = get_vectorstore()
        results = vectorstore.get(where={"document_id": str(doc_id)})
        chunks = [
            {"id": results['ids'][i], "chunk_index": results['metadatas'][i]['chunk_index'], "text_preview": results['documents'][i][:400]}
            for i in range(len(results['ids']))
        ]
        chunks.sort(key=lambda x: x['chunk_index'])
    finally:
        conn.close()
    return jsonify({"document": doc, "chunks": chunks})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)