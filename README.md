# ChatPDF Pro

**Intelligent Document Analysis Through Conversational AI** — Transform static PDFs into interactive knowledge bases with AI-powered semantic search and contextual responses.

---

## 🚀 Overview

ChatPDF Pro revolutionizes document interaction by enabling natural language conversations with PDF content. Instead of manually searching through pages, users can ask complex questions and receive precise answers with source citations, summaries, and contextual insights.

**Problem Solved**: Traditional PDF readers offer basic search, but fail at understanding context, relationships between concepts, or answering nuanced questions. ChatPDF Pro bridges this gap by leveraging advanced AI to comprehend document semantics, making information retrieval intuitive and efficient.

**Real-World Impact**: Ideal for researchers analyzing academic papers, professionals reviewing contracts, students studying textbooks, or anyone needing to extract insights from dense documentation quickly and accurately.

---

## ✨ Key Features

- **🧠 Semantic Vector Search**: Embeds document chunks into high-dimensional vectors for context-aware retrieval, far surpassing keyword matching
- **🔄 Hybrid Matching Algorithm**: Combines vector similarity with text-based filtering for optimal relevance and accuracy
- **📊 Intelligent Chunking**: Dynamically segments PDF content by semantic boundaries, preserving context across page breaks
- **⚡ Streaming AI Responses**: Real-time response generation using Google's Gemini models with automatic retry logic for reliability
- **📍 Precision Citations**: Automatic source attribution with page numbers and confidence scores for verifiable answers
- **🎯 Multi-Document Analysis**: Query across single documents or entire collections with configurable scope
- **📱 Adaptive UI**: Responsive design with dark/light themes and mobile-optimized interactions
- **🔧 Model Flexibility**: Switch between Gemini 2.5 Flash (speed-optimized) and Pro (depth-optimized) based on use case

---

## 🧠 System Architecture

### High-Level Overview

ChatPDF Pro is a full-stack web application that combines modern frontend technologies with AI-powered backend services to enable conversational interactions with PDF documents. The system follows a client-server architecture with specialized components for document processing, vector search, and AI generation.

### Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Express API   │    │   AI Services   │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Gemini)      │
│                 │    │                 │    │                 │
│ - PDF Viewer    │    │ - Document Mgmt │    │ - Text Gen      │
│ - Chat Interface│    │ - Vector Search │    │ - Embeddings    │
│ - Upload Zone   │    │ - Chat History  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Data Layer    │
                    │                 │
                    │ - SQLite DB     │
                    │ - Vector Store  │
                    │ - File Storage  │
                    └─────────────────┘
```

### Component Breakdown

#### Frontend Layer

- **React Application**: Built with TypeScript and Vite for fast development and hot reloading
- **PDF Rendering**: Client-side PDF display using React PDF with text highlighting capabilities
- **Chat Interface**: Real-time messaging interface with Server-Sent Events streaming
- **State Management**: Custom hooks managing chat state, document selection, and UI interactions
- **Responsive Design**: Adaptive UI with dark/light themes and mobile optimization

#### Backend Layer

- **API Server**: Express.js handling RESTful endpoints and real-time streaming via SSE
- **Document Ingestion Pipeline**: PDF parsing with PDF.js, semantic chunking with overlap, and batch embedding generation
- **Vector Search Engine**: Custom hybrid search combining cosine similarity (40%) and keyword matching (60%)
- **AI Orchestration**: Google Gemini API integration with retry logic and model selection (Flash/Pro)
- **File Management**: Multer-based upload handling with UUID-based storage

#### Data Layer

- **SQLite Database**: Relational storage for documents, chunks, chats, and messages with foreign key relationships
- **In-Memory Vector Store**: Fast semantic search index loaded from database chunks
- **File Storage**: Local filesystem storage for uploaded PDFs with metadata preservation

### Data Flow Architecture

#### Document Ingestion Pipeline

```
PDF Upload → File Validation → Text Extraction → Semantic Chunking → Embedding Generation → Database Storage → Vector Index Update
```

#### Query Processing Pipeline

```
User Query → Query Embedding → Hybrid Vector Search → Context Retrieval → Prompt Assembly → AI Generation → Streaming Response → Citation Parsing → Source Attribution
```

#### Response Delivery Flow

```
AI Response Stream → Token-by-Token Updates → Citation Detection → Source Validation → UI Highlighting → Chat Persistence
```

### Key Design Decisions

- **Hybrid Search Algorithm**: Combines semantic understanding (embeddings) with exact matching (keywords) for optimal relevance
- **Streaming Architecture**: Server-Sent Events enable real-time UI updates without WebSocket complexity
- **Citation Validation**: Post-processing ensures only genuinely used sources are displayed with confidence scores
- **Chunking Strategy**: 1000-character chunks with 100-character overlap preserve context across boundaries
- **Batch Processing**: Embedding generation in batches of 5 prevents API rate limiting
- **ACID Compliance**: SQLite ensures data integrity for chat history and document metadata

This architecture provides a scalable, responsive platform for AI-powered document analysis while maintaining high accuracy in source attribution and user experience.

---

## ⚙️ Tech Stack

### Frontend

- **React 19** - Modern component architecture with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first styling with custom themes
- **React PDF** - Client-side PDF rendering and interaction
- **Lucide React** - Consistent iconography

### Backend

- **Node.js** - Runtime environment
- **Express.js** - RESTful API framework
- **TypeScript** - Server-side type safety
- **Better SQLite3** - Embedded database for metadata
- **Multer** - File upload handling

### AI & Data

- **Google Gemini API** - Advanced language models (2.5 Flash/Pro)
- **PDF.js** - PDF parsing and text extraction
- **Custom Vector Store** - Semantic search implementation
- **Embedding Models** - Text-to-vector conversion for similarity matching

---

## 📸 Screenshots / Demo

_Coming soon - Interactive demo showcasing PDF upload, AI chat, and source highlighting_

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** ≥18.0.0 (LTS recommended)
- **Google Gemini API Key** (free tier available at [Google AI Studio](https://aistudio.google.com/app/apikey))

### Quick Start

1. **Clone and Navigate**

   ```bash
   git clone <repository-url>
   cd ChatPDF_Pro
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment**

   ```bash
   # Create .env file in project root
   echo "GEMINI_API_KEY=your_api_key_here" > .env
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Access Application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser
   - Upload a PDF and start chatting!

### Production Deployment

```bash
npm run build
npm start
```

---

## 📌 Usage

### Basic Workflow

1. **Upload Document**: Drag & drop or select PDF files
2. **Ask Questions**: Type natural language queries like "What are the main findings?" or "Explain the methodology on page 15"
3. **Review Answers**: Read AI-generated responses with inline citations
4. **Navigate Sources**: Click citations to jump to relevant PDF pages with highlighting

### Advanced Examples

- **Comparative Analysis**: "Compare the approaches in chapters 3 and 5"
- **Summarization**: "Summarize the key arguments against the proposed solution"
- **Specific Queries**: "What evidence supports the hypothesis on page 12?"
- **Cross-Document**: Switch to "All Documents" mode to query across multiple PDFs

### Model Selection

- **Gemini 2.5 Flash**: Faster responses for general queries
- **Gemini 2.5 Pro**: Deeper analysis for complex or technical content

---

## 🚧 Challenges & Learnings

**PDF Processing Complexity**: Implementing robust text extraction from diverse PDF formats required deep integration with PDF.js, handling encrypted documents, and managing memory efficiently during large file processing.

**Vector Search Optimization**: Balancing embedding quality with query performance involved custom chunking strategies, batch processing to respect API limits, and implementing hybrid search algorithms that combine semantic similarity with keyword matching.

**Streaming Response Architecture**: Building reliable real-time AI responses demanded careful error handling, retry logic for API failures, and efficient state management to prevent UI blocking during long generations.

**Citation Accuracy**: Developing precise source attribution involved parsing AI responses for citation markers, mapping back to original chunks, and implementing confidence scoring for result validation.

**Scalability Considerations**: Designing the system to handle multiple concurrent users while maintaining response times required thoughtful database indexing, connection pooling, and background processing for document ingestion.

---

## 🔮 Future Improvements

**Multi-Modal Integration**: Extend beyond text to support images, charts, and tables within PDFs using vision-language models for comprehensive document understanding.

**Advanced RAG Pipeline**: Implement retrieval-augmented generation with hierarchical chunking, query expansion, and multi-stage reasoning for more nuanced responses.

**Collaborative Features**: Add real-time multi-user sessions, shared document workspaces, and annotation capabilities for team collaboration.

**Enterprise Security**: Integrate document access controls, audit logging, and compliance features for organizational deployment.

**Performance Optimization**: Implement caching layers, distributed vector databases, and GPU acceleration for handling larger document collections at scale.

---

## 👨‍💻 Author

**Rohan** - Full-Stack Developer passionate about AI-powered applications and developer experience.

_Built with modern web technologies and cutting-edge AI to demonstrate practical implementation of retrieval-augmented generation systems._

---

_This project showcases advanced concepts in AI integration, vector databases, and real-time web applications. Open to feedback and collaboration opportunities._
