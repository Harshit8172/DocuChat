# DocuChat AI - Full Stack Stateful RAG Chatbot

DocuChat AI is a fully stateful, multi-user Retrieval-Augmented Generation (RAG) chatbot. It supports secure user accounts, cloud-based credentials storage, folder/file management, and targeted document context filtering.

Built with **Python FastAPI**, **Vanilla JS/HTML/CSS**, **Pinecone**, and **OpenRouter**, it is fully optimized to be deployed entirely for free on **Vercel**.

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

## ☁️ How to Deploy on Vercel for Free

Because Vercel relies on Serverless Functions, any local files (like a SQLite `app.db` file) will be deleted every time the server goes to sleep. **To deploy to production, you MUST use a remote PostgreSQL database.**

Here is the exact step-by-step guide:

### Step 1: Create a Free PostgreSQL Database
1. Go to [Supabase](https://supabase.com/) and create a free account.
2. Click **New Project** and create a new database (save your database password!).
3. Once created, go to **Project Settings** -> **Database**.
4. Scroll down to **Connection String** and click on **URI**.
5. Copy the connection string. It will look like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-ID].supabase.co:5432/postgres`

### Step 2: Push Your Code to GitHub
1. Create a new empty repository on [GitHub](https://github.com/).
2. Push your local `Chatbot` folder to this GitHub repository.

### Step 3: Deploy to Vercel
1. Go to [Vercel](https://vercel.com/) and create a free account.
2. Click **Add New** -> **Project**.
3. Import your new GitHub repository.
4. Expand the **Environment Variables** section before clicking deploy! You must add two variables:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-ID].supabase.co:5432/postgres`
   - *(Note: Replace `[YOUR-PASSWORD]` with your actual Supabase password)*
   - **Key**: `SECRET_KEY`
   - **Value**: *(Type a random long string of characters to secure your login tokens!)*
5. Click **Deploy**.

Vercel will automatically detect `vercel.json`, install the packages from `requirements.txt` (including the required Postgres connector `psycopg2-binary`), and start your FastAPI server!

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
