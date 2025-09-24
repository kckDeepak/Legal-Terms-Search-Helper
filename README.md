# Legal Terms Search Helper

## Overview
The **Legal Terms Search Helper** is a web application designed to assist users in searching and understanding legal documents such as terms of service, NDAs, and other contracts. Users can upload a text file containing legal content, ask questions about it (e.g., "What is the refund policy?"), and receive concise, easy-to-read answers extracted from the document. The application leverages natural language processing (NLP) and stores question-answer pairs in a MySQL database for future reference.

## Features
- Upload a `.txt` file containing legal content.
- Ask questions about the uploaded document (e.g., "When can a user cancel?").
- Receive simplified answers (e.g., "Users can cancel within 14 days as per section 3.2.").
- Store question-answer history in a MySQL database.
- User-friendly React-based interface with a chat-like experience.

## Prerequisites
- **Python 3.9+** for the backend server.
- **Node.js** and **npm** for the frontend.
- **MySQL Server** for storing Q&A history.
- Required Python libraries (listed in `requirements.txt`).
- A `.env` file with MySQL credentials and API base URL.

## Installation

### Backend Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd client/legal-terms-search-helper/server
   ```
2. Create a `.env` file in the `server` directory with the following content:
   ```
   MYSQL_HOST=localhost
   MYSQL_USER=your_username
   MYSQL_PASSWORD=your_password
   MYSQL_DB=legal_terms_db
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up the MySQL database (the app will create the necessary database and table on first run).
5. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the `client/legal-terms-search-helper` directory:
   ```bash
   cd client/legal-terms-search-helper
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the `REACT_APP_API_BASE_URL` in the `.env` file to match your backend URL (e.g., `http://localhost:5000`).
4. Start the React app:
   ```bash
   npm start
   ```

## Usage
1. Open your browser and navigate to `http://localhost:3000`.
2. Upload a `.txt` file containing legal text using the file uploader.
3. Once uploaded, type a question in the input field (e.g., "What is the refund policy?").
4. View the answer in the chat window and explore previous Q&A history.

## Project Structure
```
client/legal-terms-search-helper/
├── public/
├── src/
│   ├── components/
│   │   ├── ChatWindow.js
│   │   ├── FileUploader.js
│   │   └── QuestionInput.js
│   ├── App.css
│   ├── App.js
│   ├── index.css
│   └── index.js
├── .gitignore
├── package-lock.json
└── package.json
server/
├── env/
├── static/
├── uploads/
├── app.py
├── .gitignore
├── legal_terms.txt
└── requirements.txt
README.md
```

## Technologies Used
- **Backend**: Python, Flask, SentenceTransformers, ChromaDB, Hugging Face Transformers, MySQL.
- **Frontend**: React, Material-UI, Axios.
- **NLP**: Embedding generation with `all-MiniLM-L6-v2`, Question-answering with `distilbert-base-uncased-distilled-squad`.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request with your changes. Ensure to follow the existing code style and add tests if applicable.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact
- **Email:** [kckdeepak29@gmail.com](mailto:kckdeepak29@gmail.com)
- **GitHub Issues**
