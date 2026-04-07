# FinTrack – Personal Finance & Budget Tracker 💰

Welcome to **FinTrack**, a sleek, modern, and highly interactive Full-Stack web application designed to track your cashflow securely and beautifully. 

It was built utilizing a premium **Fintech Glassmorphism** aesthetic, bringing financial analytics to life using custom micro-interactions, responsive sidebars, and fluid mathematical charting.

---

## 🎨 Design & Architecture

FinTrack uses a two-folder monorepo architecture:
- **`server/`** – A lightweight Node.js/Express backend that handles mathematical processing, transaction logging, budgeting bounds, and CORS routing.
- **`client/`** – A React 18 frontend leveraging React Router DOM, dynamic Recharts for visualization, styling with vanilla CSS flex container properties, and strict `en-IN` (₹) INR currency formatting globally.

---

## 🔥 Key Core Features

### 1. The Dynamic Dashboard (`/`)
The main dashboard serves as a high-fidelity visual summary of your exact net capacity. It features:
- **Three Header Metric Cards**: Isolated representations for strictly your Total Balance, Total Income, and Total Expenses.
- **Bar Chart Analytics**: A Recharts integration comparing incoming money versus outgoing money chronologically. 
- **Pie Chart Segmenter**: A visual, mathematically constrained map calculating your exact expenses grouped beautifully across predefined categories relying on an Emerald-to-Rose dynamic color palette.

### 2. Transaction Management Ledger (`/transactions`)
A formal historical ledger table displaying chronological histories of all inputs with strict tagging attributes.
- **Auto-Tagging**: Expenses render in subtle red pills (e.g. `Food`, `Rent`), whereas positive inputs strictly display as Green `Income`.
- **Absolute Deletion**: Features an explicit trash action button sending a safe `DELETE` command natively to the backend, rewriting math constraints upon deletion dynamically.

### 3. Smart Budget Planner (`/budget`)
Allows you to mathematically target hard constraints on categories.
- **Limit Settings**: Allows you to type custom threshold amounts into fluid input modes per category (`Food`, `Entertaintment`, etc.). 
- **Active Calculus**: Modifying these limits instantly sends `PUT` requests to the Node server, actively refreshing the categorized progress bars. If a transaction pushes its category above 100%, the metric bar inherently snaps completely to Rose Warning coloring.

### 4. Slide-Over Global Modal
To optimize User Experience natively, writing a new transaction doesn't bounce you to an empty blank form. Instead, anywhere across the entire application interface, triggering "Add Transaction" slides a sleek, backdrop-blurred drawer panel across the window. 
- Features interactive "Income" / "Expense" strict toggles explicitly converting positive integers securely.

---

## 🚀 How to Launch the Application

Because this application relies on active Backend math parsing alongside Frontend visual state layers, both independent programs must be run locally in parallel across two distinct terminals.

### Step 1: Start the Backend server 
Open your terminal (or Terminal #1 inside VS Code) and navigate to the project directory:
```bash
> cd server
> npm install     # Installs Express, nodemon, and CORS protocols (Only needed on first launch)
> node server.js  # Boots up the core API router securely on Port 5000
```
*(Leave this terminal operational untouched!)*

### Step 2: Start the Frontend React framework
Open a brand new, secondary terminal (Terminal #2) inside the standard project folder:
```bash
> cd client
> npm install     # Pre-compiles all React dependencies, Router, and Recharts
> npm start       # Ignites the UI layer across Port 3000
```

Once successful, your default browser will instantaneously spin up pointing securely to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ Backend API Overview

The backend acts entirely in-memory tracking lightweight session JSON arrays to provide instantaneous local interactions. 

- **`GET /transactions`** - Delivers chronological histories.
- **`POST /transactions`** - Injects signed positive/negative items strictly formatted. 
- **`DELETE /transactions/:id`** - Safely purges an element globally.
- **`GET /budgets`** - An inherently intelligent route combining raw transaction footprints filtered natively against assigned boundaries generating mathematically completed `%` calculations directly.
- **`PUT /budgets/:category`** - Accepts new limit boundaries.
