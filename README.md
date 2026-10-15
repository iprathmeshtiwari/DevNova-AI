# 🚀 DevNova AI

### Your AI-Powered Coding Assistant

**Live Website:** https://devnova-ai.onrender.com

DevNova AI is an AI-powered coding assistant designed to help developers write, understand, debug, and improve code. It provides an interactive chat interface where users can ask programming questions and receive AI-generated assistance.

The project combines an AI API with a backend server and database to deliver an interactive coding experience with user authentication and persistent chat history.

## 🌐 Live Demo

👉 **Try DevNova AI:** https://devnova-ai.onrender.com

## ✨ Key Features

- **AI Coding Assistance:** Get help with programming questions and code generation.
- **Code Explanation:** Understand code, programming concepts, and logic.
- **Debugging Support:** Get assistance identifying and fixing coding errors.
- **Code Optimization:** Explore ways to improve code readability and efficiency.
- **User Authentication:** Register and log in to your account.
- **Chat History:** Store conversations for future reference.
- **Database Integration:** Use MongoDB to persist application data.
- **Secure Configuration:** Keep API keys and other sensitive settings in environment variables.
- **Responsive Web Experience:** Access the application through its web interface.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend server and API routes |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB object modeling |
| JavaScript | Application logic |
| HTML, CSS | Web interface |
| JWT | Authentication tokens |
| Helmet | HTTP security headers |
| Express Rate Limit | API request limiting |
| Nebius Token Factory | AI model API integration |
| Render | Website hosting and deployment |

## ⚙️ How to Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/iprathmeshtiwari/DevNova-AI.git
cd DevNova-AI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and add your own credentials:

```env
PORT=3000
AI_API_KEY=your_ai_api_key
AI_BASE_URL=your_ai_base_url
AI_MODEL=nvidia/Nemotron-3_5-Lightning
JWT_SECRET=your_long_random_secret
MONGODB_URI=your_mongodb_connection_string
DAILY_LIMIT=50
```

Replace the placeholder values with your actual configuration. Never upload `.env` or expose your API key, JWT secret, or database credentials on GitHub.

### 4. Start the application

```bash
npm start
```

Open your browser at:

http://localhost:3000

## ☁️ Deployment

DevNova AI is deployed using Render, with MongoDB Atlas providing cloud database storage.

Live application: https://devnova-ai.onrender.com

Deployment requires correctly configured environment variables, a reachable MongoDB cluster, and valid AI API credentials.

## 🎯 Project Goals

- Make programming assistance more accessible.
- Help developers understand and troubleshoot code.
- Demonstrate full-stack web development with AI integration.
- Practice authentication, database persistence, API integration, and cloud deployment.

## 🔮 Future Improvements

- Support for additional AI models.
- More programming languages and development tools.
- Code editor with syntax highlighting.
- File upload and code analysis.
- Improved conversation search and organization.
- Expanded user preferences and usage analytics.

## 👨‍💻 Author

**Prathmesh Tiwari**

GitHub: https://github.com/iprathmeshtiwari

## 📄 License

Choose an appropriate open-source license before distributing or reusing this project.
