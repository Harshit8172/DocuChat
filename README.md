# DocuChat AI - Document Intelligence Chatbot

A modern full-stack AI chatbot that allows users to upload documents and ask questions about their content. Built with FastAPI, Vue.js, Pinecone vector database, and OpenRouter LLM.

**Live Demo**: https://docu-chat-seven.vercel.app

---

## ✨ Features

- 🔐 **User Authentication** - Secure signup/login with JWT tokens
- 📄 **Document Upload** - Support for PDF, DOCX, CSV, and TXT files
- 🗂️ **File Organization** - Create folders and organize documents
- 💬 **AI Chat** - Ask questions about your documents with context-aware responses
- 🔑 **Secure API Key Management** - Store OpenRouter, Hugging Face, and Pinecone keys
- 🗑️ **Delete Files/Folders** - Remove documents and folders anytime
- 🎯 **Context Filtering** - Select specific files/folders for focused responses
- 👤 **User Display** - Shows logged-in user name in header

---

## 🏗️ Architecture

- **Frontend**: Vanilla HTML5, JavaScript, and Tailwind CSS (Served dynamically by FastAPI).
- **Backend**: Python FastAPI.
- **Database**: PostgreSQL (via SQLAlchemy) for Users, Credentials, Folders, and Files.
- **Vector Store**: Pinecone (with Metadata filtering for targeted chatting).
- **Embeddings**: Hugging Face Inference API (`sentence-transformers/all-MiniLM-L6-v2`).
- **LLM**: OpenRouter (Defaults to `openai/gpt-4o`).

---

## 🚀 How to Run Locally

For local development, the app automatically defaults to using a lightweight SQLite database (`app.db`) so you don't need to configure a heavy database right away.

1. **Clone & Setup Virtual Environment**:
   ```bash
   git clone <your-repo>
   cd Chatbot
   python -m venv venv
   .\venv\Scripts\activate   # Windows
   # source venv/bin/activate # Mac/Linux
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Server**:
   ```bash
   uvicorn api.index:app --reload
   ```
   Or open `api/index.py` in VS Code and click **Run and Debug**.

4. **Use the App**:
   - Open your browser and navigate to `http://127.0.0.1:8000`
   - Create a new account and login.
   - Click the **Gear Icon** (Settings) to securely save your API keys.
   - Create folders, upload files, and start chatting!

---

## 🚀 Production Deployment (Vercel + Render)

### Architecture: Vercel Frontend + Render Backend

This setup separates frontend and backend for better scalability:
- **Frontend**: Deployed on Vercel (free)
- **Backend**: Deployed on Render (free tier available)

### Step 1: Deploy Backend on Render

1. **Create Render Account**
   - Go to https://render.com and sign up (free tier available)

2. **Create Web Service**
   - Click **New +** → **Web Service**
   - Connect your GitHub repository
   - Fill in these details:
     - **Name**: `docuchat-backend`
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn api.index:app --host 0.0.0.0 --port $PORT`
     - **Plan**: Free (or paid for better uptime)

3. **Add Environment Variables**
   - In Render dashboard: **Environment**
   - Add:
     ```
     SECRET_KEY=your-secure-random-key-here
     ```
   - Generate a secure key:
     ```python
     import secrets
     print(secrets.token_urlsafe(32))
     ```

4. **Set Up Database (Optional)**
   - For production, use PostgreSQL instead of SQLite
   - Create PostgreSQL on Render or Supabase
   - Add to environment variables:
     ```
     DATABASE_URL=postgresql://user:password@your-db.onrender.com/docuchat
     ```

5. **Get Backend URL**
   - After deployment, you'll get a URL like:
     ```
     https://docuchat-backend.onrender.com
     ```
   - Save this for frontend configuration

### Step 2: Update Frontend for Render Backend

Before deploying frontend, update the API URL in `public/script.js`:

Find all `fetch()` calls and add backend URL logic:

```javascript
// At the top of the file, after DOMContentLoaded
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://127.0.0.1:8000'
  : 'https://your-render-backend-url.onrender.com';
```

Then update fetch calls like:
```javascript
// Old:
const res = await fetch('/api/settings', { ... });

// New:
const res = await fetch(`${API_BASE_URL}/api/settings`, { ... });
```

Or update all references at once by searching for `/api/` and replacing with `${API_BASE_URL}/api/`

### Step 3: Deploy Frontend on Vercel

1. **Push Updated Code to GitHub**
   ```bash
   git add .
   git commit -m "Update API URL for Render backend"
   git push origin main
   ```

2. **Create Vercel Account**
   - Go to https://vercel.com and sign up with GitHub

3. **Import Project**
   - Click **Add New** → **Project**
   - Select your DocuChat GitHub repository
   - Click **Import**

4. **Configure Build**
   - **Build Command**: (leave empty)
   - **Output Directory**: `public`
   - **Install Command**: (leave empty)

5. **Deploy**
   - Click **Deploy**
   - Your frontend will be live at `https://your-vercel-app.vercel.app`

### Step 4: Test the Deployment

1. Open your Vercel URL in browser
2. Sign up with new account
3. Go to Settings ⚙️
4. Add API keys:
   - OpenRouter Key
   - Hugging Face Key
   - Pinecone Key + Index Name
5. Upload a document and test chat

---

## 🔑 How to Get Required API Keys

You will need three free API keys to use the application. Every user on your deployed app can bring their own keys via the Settings menu.

1. **OpenRouter API Key (LLM)**:
   - Go to [OpenRouter.ai](https://openrouter.ai/)
   - Create an account and go to **Keys** to generate a key.
2. **Pinecone API Key (Vector Database)**:
   - Go to [Pinecone.io](https://pinecone.io/)
   - Create an account and create a free Serverless Index.
   - **CRITICAL**: You must set the index dimensions to **384** (which matches the MiniLM model).
   - Go to **API Keys** to get your key.
3. **Hugging Face API Key (Embeddings)**:
   - Go to [Hugging Face](https://huggingface.co/)
   - Create an account, go to **Settings** -> **Access Tokens**.
   - Create a new token with *Read* permissions.
