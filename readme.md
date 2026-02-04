# 🚀 Echo : A Community Feed
### High-Performance Community Feed Prototype

![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Style-TailwindCSS-38B2AC?logo=tailwind-css&logoColor=white)
![Django](https://img.shields.io/badge/Backend-Django%20REST-092E20?logo=django&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)

> A full-stack discussion platform featuring threaded comments, real-time-like updates, and a dynamic 24-hour leaderboard. Optimized for concurrency and N+1 query performance.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

* **Python 3.8+**
* **Node.js 18+** & **npm**
* **Git**

---

## ⚡ Quick Start Guide

Follow these steps to get **ThreadFlow** running locally.

### 1️⃣ Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/ThreadFlow.git](https://github.com/YOUR_USERNAME/ThreadFlow.git)
cd ThreadFlow
```

### 2️⃣ Backend Setup (Terminal A)
We use Django for the backend API.

**1. Create a Virtual Environment:**

```Bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

**2. Install Dependencies:**

```Bash
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt
```

**3. Run Migration and Seed Data**

```bash
python manage.py makemigrations
python manage.py migrate

# Optional: Pre-populate DB with users and comments for testing
python populate_db.py
```

**4. Run The Server**

```bash
python manage.py runserver
```

The Backend is now running at http://127.0.0.1:8000/


### 3️⃣ Frontend Setup (Terminal B)
We use React + Vite for a lightning-fast frontend. Open a new terminal window.

**1. Navigate to Frontend:**

```Bash
cd frontend
```

**2. Install Packages:**

```Bash
npm install
```

**3. Start The Dev Server:**

```Bash
npm run dev
```

The Frontend is now running at http://localhost:5173/ (or similar)

### 🧪 How to Test
Open your browser to the frontend URL (usually http://localhost:5173).

### 🔐 Login Credentials (from populate_db.py)
If you ran the seed script, you can use these accounts:

| Username | Password     | Role             |
|----------|-------------|----------------|
| bob      | password123 | Active User     |
| alice    | password123 | Admin / Power User |
| charlie  | password123 | Casual User     |


### ✅ Key Features to Try
1. Threaded Comments: Reply to a comment, then reply to that reply. Notice the recursive nesting.

2. N+1 Optimization: Check your backend console logs. Loading a post with 50 comments triggers only 1 SQL query.

3. Concurrency: Try "Double Clicking" the like button rapidly; the database constraint prevents duplicate votes.

4. Dynamic Leaderboard: Like a post and watch the "24h Leaders" widget update instantly (via Optimistic UI).

### 📂 Project Structure
```
Echo : A community Feed/
├── config/ # Django Project Settings
├── feed/ # Main App (Models, Views, Serializers)
├── frontend/ # React Application
│ ├── src/
│ │ ├── components/ # Reusable UI (CommentItem, etc.)
│ │ ├── App.jsx # Main Logic & Layout
│ │ └── api.js # Axios Interceptor Config
├── populate_db.py # Database Seeder Script
└── manage.py # Django Command Utility
```


Made with ❤️ by Kanishk Negi

