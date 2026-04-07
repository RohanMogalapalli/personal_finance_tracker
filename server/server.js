const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory arrays for transactions, budgets, and users
let transactions = [];
let users = [];
let budgets = [
  { category: 'Food', limit: 0 },
  { category: 'Rent', limit: 0 },
  { category: 'Utilities', limit: 0 },
  { category: 'Entertainment', limit: 0 },
  { category: 'Transport', limit: 0 },
  { category: 'Healthcare', limit: 0 },
  { category: 'Other', limit: 0 }
];

// GET all transactions
app.get('/transactions', (req, res) => {
  res.json(transactions);
});

// POST a new transaction
app.post('/transactions', (req, res) => {
  const { text, amount, category, date } = req.body;
  
  if (!text || amount === undefined) {
    return res.status(400).json({ error: 'Please provide text and amount' });
  }

  const newTransaction = {
    id: Math.floor(Math.random() * 100000000),
    text,
    amount: Number(amount),
    category: category || 'Other',
    date: date || new Date().toISOString().split('T')[0]
  };

  transactions.push(newTransaction);
  res.status(201).json(newTransaction);
});

// PUT to update an existing transaction
app.put('/transactions/:id', (req, res) => {
  const transactionId = Number(req.params.id);
  const { text, amount, category, date } = req.body;

  if (!text || amount === undefined) {
    return res.status(400).json({ error: 'Please provide text and amount' });
  }

  const transactionIndex = transactions.findIndex((transaction) => transaction.id === transactionId);

  if (transactionIndex === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const existingTransaction = transactions[transactionIndex];
  const updatedTransaction = {
    ...existingTransaction,
    text,
    amount: Number(amount),
    category: category || 'Other',
    date: date || existingTransaction.date
  };

  transactions[transactionIndex] = updatedTransaction;
  res.json(updatedTransaction);
});

// DELETE a transaction
app.delete('/transactions/:id', (req, res) => {
  const transactionId = Number(req.params.id);
  const initialLength = transactions.length;
  transactions = transactions.filter(t => t.id !== transactionId);

  if (transactions.length < initialLength) {
    res.status(200).json({ message: 'Transaction deleted' });
  } else {
    res.status(404).json({ error: 'Transaction not found' });
  }
});

// GET all budgets dynamically calculated
app.get('/budgets', (req, res) => {
  const calculations = budgets.map(b => {
    const spent = transactions
      .filter(t => t.amount < 0 && (t.category === b.category || (!t.category && b.category === 'Other')))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    return {
      category: b.category,
      limit: b.limit,
      spent: spent,
      remaining: b.limit - spent
    };
  });
  res.json(calculations);
});

// PUT to update a budget limit
app.put('/budgets/:category', (req, res) => {
  const categoryParam = req.params.category;
  const { limit } = req.body;
  
  if (limit === undefined) {
    return res.status(400).json({ error: 'Please provide a limit amount' });
  }

  let index = budgets.findIndex(b => b.category.toLowerCase() === categoryParam.toLowerCase());
  
  if (index >= 0) {
    budgets[index].limit = Number(limit);
    res.json(budgets[index]);
  } else {
    // If category didn't exist in predefined list, create it
    const newBudget = { category: categoryParam, limit: Number(limit) };
    budgets.push(newBudget);
    res.json(newBudget);
  }
});

// POST /register - Create a new user account
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = { email, password }; // In a real app, hash password!
  users.push(newUser);
  res.status(201).json({ message: 'User registered successfully', email });
});

// POST /login - Authenticate an existing user
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.status(200).json({ message: 'Login successful', email });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
