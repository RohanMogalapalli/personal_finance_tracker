# FinTrack Feature Engineering & Logic Breakdown

This document provides a technical dive into exactly how every functional system acts and reacts across the FinTrack application. It explains the relationship between the React frontend logic and Express backend routing.

---

## 1. Dashboard Analytics (The Overview Board)

**Purpose:** Provide an instantaneous, high-fidelity visualization of the user's total financial capacity upon loading.

**How it works structurally:**
1.  **Data Ingestion:** The `App.js` fires a `fetch('http://localhost:5000/transactions')` hook when the project initializes across Port 3000. It routes down an array of transaction objects.
2.  **Mathematical Aggregation:**
    *   The `Dashboard` component rips the array apart using Javascript `.filter` and `.reduce(...)`. It calculates the `Total Balance` by summing the entire dataset. It separates positive and negative numbers purely mathematically to establish explicit `Total Income` and `Total Expenses` tiles without writing complicated SQL database rules.
3.  **Dynamic Recharts:**
    *   **Bar Chart (Income vs Expense):** The system dynamically loops over the transactions and shapes them into coordinates mapping exactly to `<BarChart data={chartData}>`.
    *   **Pie Chart (Categorization):** The component filters for purely negative numbers (expenses), reduces them into an object associating the `category` to absolute sums (e.g., `{ Food: 1500, Rent: 20000 }`), and maps that object specifically against our custom `Emerald-to-Rose` hex color arrays to generate smooth pie slices natively.

---

## 2. Slide-Over Transaction Modal

**Purpose:** Offer users a persistent ability to seamlessly log expenses instantaneously from any primary view natively.

**How it works structurally:**
1.  **Global React State:** `isDrawerOpen` and `setDrawerOpen` boolean variables are nested safely at the absolute root `<App />` component level. Clicking “Add Transaction” or "New Entry" flawlessly updates this toggle state.
2.  **CSS Transition Animation:** When triggered true, an overarching `.drawer-backdrop.open` class is activated. The panel itself changes CSS parameters from `transform: translateX(100%)` (hidden off-screen) to `0` (on-screen), shifting in smoothly.
3.  **Explicit Data Formatting:** 
    *   To prevent invalid database artifacts or negative numbers throwing formatting bugs, the `<input>` exclusively accepts positive numbers.
    *   The "Income" and "Expense" custom toggles define the overarching mathematical multiplier mathematically before POST-processing. If `expense` is selected, the application silently prefixes a minus token to the amount before submission. It injects a formalized `category` description natively in the background.
4.  **Submission Trigger:** When the "Save" button is clicked, it sends a payload natively via `fetch(".../transactions", { method: 'POST' })`, collapses the drawer organically, and triggers a full-board UI re-render updating the system's financial analytics perfectly synchronously.

---

## 3. The Transactions Ledger

**Purpose:** Present an explicitly styled chronological data log of exact input histories isolated beautifully alongside independent modification metrics.

**How it works structurally:**
1.  **Reversed Mapping Layout:** We ingest the array directly from the Express API, execute `.slice().reverse()` cleanly inside Javascript, and run `.map` to render it mathematically backward (displaying newest entries securely at the top of the ledger sequentially).
2.  **Regional INR Formatting:** Values bypass default string outputs utilizing `new Intl.NumberFormat('en-IN')`. This forces all outputs specifically strictly to standard Indian Regional configurations with `₹` tokens seamlessly implemented.
3.  **Absolute API Deletion Mechanism:** Next to every row sits a `Trash2` action icon. Clicking it traps the exact `ID` code string generated originally by the Server. It bridges heavily across a `fetch(".../transactions/{id}", { method: 'DELETE' })` block mapping straight back to `server.js` destroying the entry natively in memory.

---

## 4. Smart Budget Planner

**Purpose:** Provide proactive dynamic bounding mechanisms ensuring particular spending thresholds are actively tracked natively per independent category classification.

**How it works structurally:**
1.  **Independent Dynamic API Sync:** The React application taps the `http://localhost:5000/budgets` endpoint natively over standard protocols. 
2.  **Server-Side Native Calculation:** Unlike normal APIs, the Backend Node Server handles intensive calculation loads dynamically. Before serving the payload to React, it evaluates every transaction internally stored, categorizes them specifically, subtracts natively against arbitrary limits assigned, and packages final `%` completion constraints natively into a JSON layout for frontend interpretation without burdening your web-browser.
3.  **Continuous Inline Overwrite Triggers (`onBlur` REST API Updates):** If the user chooses to type a new Limit threshold for `Food` into the inline numeric `<input>`, React executes an `onBlur` event directly observing the interaction. As you click away natively from the component, React seamlessly forces a `fetch(..., { method: "PUT" })` overwrite payload. 
4.  **Mathematical Progress UI Triggers:** Expanding the constraints recalculates percentages internally. The `<div style={{ width: percentage }}>` progress bar shifts, dynamically turning explicitly Red `var(--expense-color)` when math exceeds 100%.

---

## 5. Light Mode & Aesthetics Override System

**Purpose:** Fluidly execute dynamic visual updates transitioning user aesthetics from pitched glassmorphism black variables flawlessly into white mode overlays natively.

**How it works structurally:**
1.  **Single Switch Trigger Protocol:** You navigate down explicitly into the Settings UI logic module. Physically dragging the Switch fires an `setIsLightMode(!isLightMode)` Javascript boolean modifier hook propagating backward to `App.js`.
2.  **Component Mounting Overwrites:** When React observes the state changes cleanly, an overarching `useEffect` algorithm strictly fires, directly mutating the basic viewport utilizing Javascript `document.body.classList.add("light-theme")`.
3.  **CSS Variable Overrides Specific Tiers:** All parameters run across Custom Properties tokens (e.g. `--card-bg: rgba()`). The raw CSS code possesses heavily weighted `<style>` priorities at the absolute bottom establishing `body.light-theme` specificity. Executing the Javascript override explicitly overwrites these tags forcing Recharts UI logic, input interfaces, and backdrop parameters systematically matching strict White/Slate aesthetic rendering protocols seamlessly natively without re-factoring hundreds of independent HTML classes manually.
