# Factory Machinery Real-Time Monitoring Dashboard

A comprehensive real-time monitoring system for factory machinery featuring high-velocity sensor data ingestion, live video streaming, and a modern Vue.js dashboard.

## Architecture Overview

┌─────────────────┐     MQTT (500ms)      ┌──────────────┐     write      ┌───────────┐
│   Simulator     │ ────────────────────► │   Backend    │ ─────────────► │ InfluxDB  │
│  (Python)       │                        │  (Node.js)   │                │ (TSDB)    │
│                 │     WS :3001 /video    │              │   Socket.IO    │           │
│                 │ ────────────────────►  │              │ ─────────────► │ Frontend  │
└─────────────────┘                        │              │   (live data   │ (Vue.js)  │
                                           │              │   + video)     │           │
                                           │   cron 1min  │                │           │
                                           │ ◄─────────── │  query +       │           │
                                           │   aggregate  │  write         │           │
                                           │ ─────────────┼──────────────► │ Postgres  │
                                           └──────────────┘                └───────────┘
                                                                                  │
                                                                                  │ REST API
                                                                                  │ (history, auth)
                                                                                  ▼
                                                                            Frontend (dashboard)
```

## Tech Stack

- **Simulator**: Python 3.11 (Threading, MQTT, OpenCV)
- **TSDB**: InfluxDB 2.x (raw high-speed sensor data)
- **Relational DB**: PostgreSQL 15 + Prisma ORM
- **Backend**: Node.js 20 + TypeScript + Express
- **Frontend**: Vue.js 3 + Vite + Chart.js
- **DevOps**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Running the Application

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd visionRD-caseStudy
   ```

2. **Start all services**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend Dashboard: http://localhost:5173
   - Backend API: http://localhost:3000
   - InfluxDB UI: http://localhost:8086

### Default Credentials

- **InfluxDB**: admin / adminpassword123
- **PostgreSQL**: postgres / postgres123
- **Application**: Create account via signup

## Project Structure

```
visionRD-caseStudy/
├── docker-compose.yml        # Container orchestration
├── simulator/                # Python factory simulator
│   ├── factory_sim.py        # Multi-threaded simulator
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile
├── backend/                  # Node.js/TypeScript API
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth middleware
│   │   └── jobs/             # Cron jobs
│   ├── prisma/               # Prisma schema
│   └── Dockerfile
├── frontend/                 # Vue.js 3 dashboard
│   ├── src/
│   │   ├── views/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── stores/           # Pinia stores
│   │   └── router/           # Vue Router
│   └── Dockerfile
└── mosquitto/                # MQTT broker config
    └── mosquitto.conf
```

## Development

### Running Services Individually

**Simulator**
```bash
cd simulator
pip install -r requirements.txt
python factory_sim.py
```

**Backend**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Features

### Real-Time Sensor Monitoring
- Temperature and pressure readings from 3 machines
- 500ms update interval
- Live charts with historical view

### Live Video Streaming
- WebSocket-based frame streaming
- Efficient base64 encoding
- Adaptive frame rate

### Data Aggregation
- 1-minute rolling averages
- Per-machine statistics
- Historical data retention

### Security
- JWT-based authentication
- Protected API routes
- Secure WebSocket connections

## Git Strategy

This project uses feature branches:
- `main` - Production-ready code
- `feature/auth` - Authentication implementation
- `feature/mqtt-ingest` - MQTT and InfluxDB integration
- `feature/vue-setup` - Frontend dashboard

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login and get JWT

### Data (Protected)
- `GET /api/sensors/latest` - Get latest sensor readings
- `GET /api/sensors/history` - Get historical data
- `GET /api/aggregates` - Get 1-minute averages

### WebSocket Events
- `sensor-data` - Real-time sensor updates
- `video-frame` - Live video frames

## 📄 License

MIT License

