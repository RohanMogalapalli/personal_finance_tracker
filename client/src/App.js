import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { LayoutDashboard, Wallet, ReceiptText, Settings, Activity, Plus, X, Trash2, LogOut, Pencil } from 'lucide-react';
import './index.css';

// Format utility removed from global, migrated to App State

const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Utilities', 'Entertainment', 'Transport', 'Healthcare', 'Other'];
const COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#be123c'];
const FALLBACK_RATES = {
  INR: 1,
  USD: 0.012
};

const formatInputAmount = (value) => {
  if (!Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const toPdfSafeText = (value) => String(value ?? '')
  .replace(/₹/g, 'INR ')
  .replace(/•/g, '-')
  .replace(/–|—/g, '-')
  .replace(/[^\x20-\x7E]/g, ' ');

const escapePdfText = (value) => toPdfSafeText(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapPdfLine = (text, maxLength = 90) => {
  const safeText = toPdfSafeText(text);

  if (safeText.length <= maxLength) {
    return [safeText];
  }

  const words = safeText.split(/\s+/).filter(Boolean);
  const wrappedLines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxLength) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines;
};

const buildPdfDocument = (pages) => {
  const objects = [];

  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('');
  const pagesId = addObject('');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageObjectIds = [];

  pages.forEach((pageLines) => {
    const contentStream = `BT\n/F1 11 Tf\n50 792 Td\n14 TL\n${pageLines.map((line, index) => `${index === 0 ? '' : 'T*\n'}(${escapePdfText(line)}) Tj`).join('\n')}\nET`;
    const contentId = addObject(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageObjectIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((objectContent, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objectContent}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
};

const downloadPdfReport = ({ currentUser, currency, rateUpdatedAt, transactions, totals, formatCurrency }) => {
  const generatedAt = new Date();
  const orderedTransactions = [...transactions].sort((left, right) => new Date(right.date) - new Date(left.date));
  const lines = [
    'FINTRACK FINANCIAL REPORT',
    '',
    `Generated: ${generatedAt.toLocaleString('en-IN')}`,
    `User Profile: ${currentUser || 'Guest User'}`,
    `Display Currency: ${currency}`,
    `Exchange Rate Updated: ${rateUpdatedAt ? new Date(rateUpdatedAt).toLocaleString('en-IN') : 'Not available'}`,
    '',
    'SUMMARY',
    `Current Total Income: ${formatCurrency(totals.totalIncome)}`,
    `Current Total Expenditure: ${formatCurrency(totals.totalExpense)}`,
    `Current Net Balance: ${formatCurrency(totals.netBalance)}`,
    `Transaction Count: ${orderedTransactions.length}`,
    '',
    'TRANSACTION HISTORY',
    'Date | Type | Category | Description | Amount'
  ];

  if (orderedTransactions.length === 0) {
    lines.push('No transactions recorded.');
  } else {
    orderedTransactions.forEach((transaction) => {
      const type = transaction.amount < 0 ? 'Expense' : 'Income';
      const category = transaction.amount < 0 ? transaction.category : 'Income';
      const amount = `${transaction.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(transaction.amount))}`;
      const row = `${new Date(transaction.date).toLocaleDateString('en-IN')} | ${type} | ${category} | ${transaction.text} | ${amount}`;

      wrapPdfLine(row, 95).forEach((line) => {
        lines.push(line);
      });
    });
  }

  const pageSize = 48;
  const pages = [];

  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }

  const pdfContent = buildPdfDocument(pages);
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = downloadUrl;
  link.download = `fintrack-report-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};

function Login({ setCurrentUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        setCurrentUser(data.email);
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo"><Activity size={32} color="#10b981" /> FinTrack</div>
        <h2 className="auth-title">Welcome Back</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleLogin} className="form-container">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" required />
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>Secure Login</button>
        </form>
        <div className="auth-footer">
          Don't have an account? <button className="auth-link" onClick={() => navigate('/register')}>Sign Up</button>
        </div>
      </div>
    </div>
  );
}

function Register({ setCurrentUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        setCurrentUser(data.email);
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo"><Activity size={32} color="#10b981" /> FinTrack</div>
        <h2 className="auth-title">Create Account</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleRegister} className="form-container">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" required />
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>Create Account</button>
        </form>
        <div className="auth-footer">
          Already have an account? <button className="auth-link" onClick={() => navigate('/login')}>Login</button>
        </div>
      </div>
    </div>
  );
}

function SlideOverDrawer({ isOpen, onClose, fetchTransactions, currency, exchangeRate, editingTransaction }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [text, setText] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const exchangeRateRef = useRef(exchangeRate);
  const previousRateRef = useRef(exchangeRate);

  useEffect(() => {
    exchangeRateRef.current = exchangeRate;
  }, [exchangeRate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const currentRate = exchangeRateRef.current;

    if (editingTransaction) {
      const nextType = editingTransaction.amount < 0 ? 'expense' : 'income';

      setType(nextType);
      setAmount(formatInputAmount(Math.abs(editingTransaction.amount) * currentRate));
      setCategory(nextType === 'expense' ? (editingTransaction.category || EXPENSE_CATEGORIES[0]) : 'Income');
      setText(editingTransaction.text || '');
      setDate(editingTransaction.date || getTodayDate());
    } else {
      setType('expense');
      setAmount('');
      setCategory(EXPENSE_CATEGORIES[0]);
      setText('');
      setDate(getTodayDate());
    }

    setError('');
    setIsSaving(false);
    previousRateRef.current = currentRate;
  }, [editingTransaction, isOpen]);

  useEffect(() => {
    const previousRate = previousRateRef.current || 1;

    if (amount && !Number.isNaN(Number(amount)) && previousRate > 0 && exchangeRate > 0 && previousRate !== exchangeRate) {
      const baseAmount = Number(amount) / previousRate;
      setAmount(formatInputAmount(baseAmount * exchangeRate));
    }

    previousRateRef.current = exchangeRate;
  }, [amount, exchangeRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }

    if (!date) {
      setError('Choose a valid date.');
      return;
    }

    const parsedAmount = Math.abs(Number(amount));
    const baseAmount = parsedAmount / exchangeRate;
    const finalAmount = type === 'expense' ? -baseAmount : baseAmount;
    const finalCategory = type === 'expense' ? category : 'Income';
    const finalText = text.trim() || (type === 'expense' ? category : 'General Income');
    const payload = {
      text: finalText,
      amount: finalAmount,
      category: finalCategory,
      date
    };

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(
        editingTransaction
          ? `http://localhost:5000/transactions/${editingTransaction.id}`
          : 'http://localhost:5000/transactions',
        {
          method: editingTransaction ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(editingTransaction ? 'Unable to update transaction.' : 'Unable to add transaction.');
      }

      await fetchTransactions();
      onClose();
    } catch (submitError) {
      console.error('Error saving transaction:', submitError);
      setError(submitError.message || 'Something went wrong while saving the transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`drawer-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="drawer-title">{editingTransaction ? 'Edit Entry' : 'New Entry'}</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        <div className="drawer-body">
          <form onSubmit={handleSubmit} className="form-container" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory('Income');
                }}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s ease',
                  border: type === 'income' ? '2px solid var(--accent-color)' : '1px solid var(--card-border)',
                  background: type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  color: type === 'income' ? 'var(--accent-color)' : 'var(--text-secondary)'
                }}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory((currentCategory) => (
                    EXPENSE_CATEGORIES.includes(currentCategory) ? currentCategory : EXPENSE_CATEGORIES[0]
                  ));
                }}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s ease',
                  border: type === 'expense' ? '2px solid var(--expense-color)' : '1px solid var(--card-border)',
                  background: type === 'expense' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: type === 'expense' ? 'var(--expense-color)' : 'var(--text-secondary)'
                }}
              >
                Expense
              </button>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                placeholder={type === 'expense' ? 'e.g. Groceries at supermarket' : 'e.g. Salary credit'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Amount ({currency})</label>
              <input
                type="number"
                placeholder="e.g. 500"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>

            {type === 'expense' && (
              <div className="form-group">
                <label>Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                  style={{ appearance: 'auto', WebkitAppearance: 'auto', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <p style={{ color: 'var(--expense-color)', fontSize: '0.9rem' }}>{error}</p>}

            <button type="submit" className="submit-btn" disabled={!amount || isSaving} style={{ marginTop: '1.5rem' }}>
              {isSaving
                ? (editingTransaction ? 'Updating...' : 'Saving...')
                : (editingTransaction ? `Update ${type === 'expense' ? 'Expense' : 'Income'}` : `Save ${type === 'expense' ? 'Expense' : 'Income'}`)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ transactions, onAddTransaction, formatCurrency }) {
  const amounts = transactions.map(t => t.amount);
  const totalBalance = amounts.reduce((acc, item) => (acc += item), 0);
  const totalIncome = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
  const totalExpense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0);
  
  const chartData = transactions.map(t => ({
    name: t.text,
    Income: t.amount > 0 ? t.amount : 0,
    Expense: t.amount < 0 ? Math.abs(t.amount) : 0
  }));

  const expenseByCategory = transactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => {
      const cat = t.category || 'Other';
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
      return acc;
    }, {});
    
  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  })).sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Overview</h1>
          <p>Welcome back, here's your financial summary.</p>
        </div>
        <button className="submit-btn" onClick={onAddTransaction} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
          <Plus size={20} />
          Add Transaction
        </button>
      </div>

      <div className="info-cards">
        <div className="balance-card">
          <h3 className="balance-title">Total Balance</h3>
          <div className="balance-amount">{formatCurrency(totalBalance)}</div>
        </div>
        
        <div className="balance-card" style={{ '--card-bg': 'rgba(16, 185, 129, 0.1)' }}>
          <h3 className="balance-title">Income</h3>
          <div className="balance-amount" style={{ color: 'var(--accent-color)' }}>{formatCurrency(totalIncome)}</div>
        </div>

        <div className="balance-card" style={{ '--card-bg': 'rgba(239, 68, 68, 0.1)' }}>
          <h3 className="balance-title">Expenses</h3>
          <div className="balance-amount" style={{ color: 'var(--expense-color)' }}>{formatCurrency(Math.abs(totalExpense))}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div className="transactions-section" style={{ flex: '1 1 400px', marginBottom: 0 }}>
          <h2>Income vs Expense</h2>
          <div style={{ height: '300px', width: '100%' }}>
            {transactions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} 
                    itemStyle={{ color: 'var(--text-primary)' }} 
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                Not enough data for analytics. Add transactions to see charts.
              </div>
            )}
          </div>
        </div>

        <div className="transactions-section" style={{ flex: '1 1 300px', marginBottom: 0 }}>
          <h2>Expenses by Category</h2>
          <div style={{ height: '300px', width: '100%' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                No expense recorded to show types.
              </div>
            )}
          </div>
          {pieData.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
              {pieData.map((entry, index) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], marginRight: '5px' }}></span>
                  {entry.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Transactions({ transactions, fetchTransactions, onAddTransaction, onEditTransaction, formatCurrency, currency }) {
  
  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:5000/transactions/${id}`, {
        method: 'DELETE'
      });
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  return (
    <>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Ledger</h1>
          <p>Chronological history of all transactions.</p>
        </div>
        <button className="submit-btn" onClick={onAddTransaction} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
          <Plus size={20} />
          New Entry
        </button>
      </div>

      <div className="transactions-section" style={{ padding: '2rem 0' }}>
        {transactions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No transactions recorded yet.</p>
        ) : (
          <div className="ledger-table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Classification</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount ({currency})</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice().reverse().map(transaction => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td>
                      {transaction.amount < 0 ? (
                         <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--expense-color)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500' }}>
                           {transaction.category}
                         </span>
                      ) : (
                         <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-color)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500' }}>
                           Income
                         </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{transaction.text}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: transaction.amount < 0 ? 'var(--expense-color)' : 'var(--accent-color)' }}>
                      {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                        <button className="action-btn edit-btn" onClick={() => onEditTransaction(transaction.id)} title="Edit entry">
                          <Pencil size={18} />
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(transaction.id)} title="Delete entry">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Budget({ formatCurrency, exchangeRate }) {
  const [budgets, setBudgets] = useState([]);
  const [draftLimits, setDraftLimits] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    try {
      const response = await fetch('http://localhost:5000/budgets');
      const data = await response.json();
      setBudgets(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    setDraftLimits(
      budgets.reduce((acc, budget) => {
        acc[budget.category] = budget.limit > 0 ? (budget.limit * exchangeRate).toFixed(2).replace(/\.?0+$/, '') : '';
        return acc;
      }, {})
    );
  }, [budgets, exchangeRate]);

  const handleUpdateLimit = async (category, newLimit) => {
    const baseLimit = Number(newLimit) / exchangeRate; // Map updated limits back natively into Base INR
    try {
      await fetch(`http://localhost:5000/budgets/${category}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: baseLimit })
      });
      fetchBudgets();
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const displayBudgets = budgets.map(b => ({
    ...b,
    spent: b.spent * exchangeRate,
    limit: b.limit * exchangeRate
  }));

  return (
    <>
      <div className="header">
        <h1>Budget Planning</h1>
        <p>Set and monitor your monthly spending limits by category.</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading budgets...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {displayBudgets.map((budget, index) => {
            const percentage = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
            const isOverBudget = budget.spent > budget.limit && budget.limit > 0;
            const barColor = isOverBudget ? 'var(--expense-color)' : COLORS[index % COLORS.length];

            return (
              <div key={budget.category} className="transactions-section" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '500' }}>{budget.category}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Limit</span>
                    <input
                      type="number"
                      value={draftLimits[budget.category] ?? ''}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setDraftLimits((currentDrafts) => ({
                          ...currentDrafts,
                          [budget.category]: nextValue
                        }));
                      }}
                      onBlur={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue !== '' && Number(nextValue) !== budget.limit) {
                          handleUpdateLimit(budget.category, nextValue);
                        }
                      }}
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', width: '100px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Spent: <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{formatCurrency(budget.spent)}</span></span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Remaining: <span style={{ color: isOverBudget ? 'var(--expense-color)' : 'var(--accent-color)', fontWeight: '500' }}>
                        {formatCurrency(Math.max(budget.limit - budget.spent, 0))}
                      </span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                    {budget.limit > 0 ? (
                      <div style={{ width: `${percentage}%`, height: '100%', background: barColor, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                    ) : (
                      <div style={{ width: '0%', height: '100%', background: 'var(--text-secondary)' }}></div>
                    )}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: isOverBudget ? 'var(--expense-color)' : 'var(--text-secondary)', textAlign: 'right' }}>
                    {budget.limit > 0 ? `${percentage.toFixed(1)}% used` : 'No limit set'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function SettingsPage({
  isLightMode,
  setIsLightMode,
  currency,
  setCurrency,
  currentUser,
  isRateLoading,
  rateUpdatedAt,
  onDownloadReport,
  totals
}) {
  return (
    <>
      <div className="header">
        <h1>Settings</h1>
        <p>Manage your account preferences.</p>
      </div>

      <div className="transactions-section" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: '700', color: '#fff', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', flexShrink: 0 }}>
          {currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h2 style={{ marginBottom: '0.25rem', paddingBottom: 0, border: 'none', fontSize: '1.5rem' }}>Account Profile</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1rem' }}>{currentUser || 'user@example.com'}</p>
          <span style={{ padding: '0.35rem 0.85rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-color)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.2)' }}>VIP Tracker</span>
        </div>
      </div>

      <div className="transactions-section">
        <h2>Preferences</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--card-border)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500' }}>Light Mode</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Toggle dark/light theme for this session</p>
            </div>
            <div 
              onClick={() => setIsLightMode(!isLightMode)}
              style={{ width: '40px', height: '20px', background: isLightMode ? 'var(--accent-color)' : 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease' }}
            >
              <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', right: isLightMode ? '2px' : 'auto', left: isLightMode ? 'auto' : '2px', top: '2px', transition: 'all 0.3s ease' }}></div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--card-border)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500' }}>Email Notifications</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive weekly summaries</p>
            </div>
            <div style={{ width: '40px', height: '20px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', left: '2px', top: '2px' }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500' }}>Currency</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isRateLoading
                  ? 'Fetching live exchange rate...'
                  : `Live exchange rate active${rateUpdatedAt ? ` • updated ${new Date(rateUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
              </p>
            </div>
            <select className="form-input" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: 'auto', padding: '0.5rem 1rem', WebkitAppearance: 'auto', MozAppearance: 'auto', appearance: 'auto' }}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="transactions-section" style={{ marginTop: '2rem' }}>
        <h2>Export Report</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Download a PDF report containing your user profile, current income, expenditure, net balance, and full transaction history.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Income</div>
              <div style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{totals.totalIncome}</div>
            </div>
            <div style={{ padding: '1rem', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Expenditure</div>
              <div style={{ color: 'var(--expense-color)', fontWeight: 600 }}>{totals.totalExpense}</div>
            </div>
            <div style={{ padding: '1rem', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Net Balance</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totals.netBalance}</div>
            </div>
          </div>
          <button
            type="button"
            className="submit-btn"
            onClick={onDownloadReport}
            style={{ alignSelf: 'flex-start', marginTop: '0.5rem', paddingInline: '1.5rem' }}
          >
            Download PDF Report
          </button>
        </div>
      </div>
    </>
  );
}

function Sidebar({ setCurrentUser }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard />, path: '/' },
    { name: 'Budget', icon: <Wallet />, path: '/budget' },
    { name: 'Transactions', icon: <ReceiptText />, path: '/transactions' },
    { name: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Activity size={28} color="#10b981" />
        FinTrack
      </div>
      <ul className="nav-menu" style={{ flex: 1 }}>
        {navItems.map(item => (
          <li key={item.name}>
            <NavLink 
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto' }}>
        <button 
          onClick={() => setCurrentUser(null)} 
          className="nav-item" 
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', fontFamily: 'inherit', fontSize: '1rem', cursor: 'pointer' }}>
          <LogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isLightMode, setIsLightMode] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState(null);

  useEffect(() => {
    if (currency === 'INR') {
      setExchangeRate(1);
      setIsRateLoading(false);
      setRateUpdatedAt(new Date().toISOString());
      return;
    }
    const fetchRate = async () => {
      setIsRateLoading(true);
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/INR');
        const data = await res.json();
        setExchangeRate(data?.rates?.[currency] || FALLBACK_RATES[currency] || 1);
        setRateUpdatedAt(new Date().toISOString());
      } catch (err) {
        setExchangeRate(FALLBACK_RATES[currency] || 1);
      } finally {
        setIsRateLoading(false);
      }
    };
    fetchRate();
  }, [currency]);

  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }, [currency]);

  const displayTransactions = transactions.map(t => ({
    ...t,
    amount: t.amount * exchangeRate
  }));

  const transactionAmounts = displayTransactions.map((transaction) => transaction.amount);
  const totalIncome = transactionAmounts.filter((amount) => amount > 0).reduce((sum, amount) => sum + amount, 0);
  const totalExpense = Math.abs(transactionAmounts.filter((amount) => amount < 0).reduce((sum, amount) => sum + amount, 0));
  const netBalance = transactionAmounts.reduce((sum, amount) => sum + amount, 0);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightMode]);

  const fetchTransactions = useCallback(async () => {
    if (!currentUser) return; // Prevent fetching if locked out
    try {
      const response = await fetch('http://localhost:5000/transactions');
      const data = await response.json();
      setTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleOpenNewTransaction = useCallback(() => {
    setEditingTransaction(null);
    setDrawerOpen(true);
  }, []);

  const handleEditTransaction = useCallback((transactionId) => {
    const transactionToEdit = transactions.find((transaction) => transaction.id === transactionId);

    if (!transactionToEdit) {
      return;
    }

    setEditingTransaction(transactionToEdit);
    setDrawerOpen(true);
  }, [transactions]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleDownloadReport = useCallback(() => {
    downloadPdfReport({
      currentUser,
      currency,
      rateUpdatedAt,
      transactions: displayTransactions,
      totals: {
        totalIncome,
        totalExpense,
        netBalance
      },
      formatCurrency
    });
  }, [currentUser, currency, rateUpdatedAt, displayTransactions, totalIncome, totalExpense, netBalance, formatCurrency]);

  return (
    <Router>
      <div className="app-layout">
        {!currentUser ? (
          <Routes>
            <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
            <Route path="/register" element={<Register setCurrentUser={setCurrentUser} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <>
            <Sidebar setCurrentUser={setCurrentUser} />
            <main className="main-content">
              <div className="dashboard-container">
                {loading ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading application data...</p>
                ) : (
                  <Routes>
                    <Route path="/" element={<Dashboard transactions={displayTransactions} onAddTransaction={handleOpenNewTransaction} formatCurrency={formatCurrency} />} />
                    <Route path="/transactions" element={<Transactions transactions={displayTransactions} fetchTransactions={fetchTransactions} onAddTransaction={handleOpenNewTransaction} onEditTransaction={handleEditTransaction} formatCurrency={formatCurrency} currency={currency} />} />
                    <Route path="/budget" element={<Budget formatCurrency={formatCurrency} exchangeRate={exchangeRate} />} />
                    <Route
                      path="/settings"
                      element={
                        <SettingsPage
                          isLightMode={isLightMode}
                          setIsLightMode={setIsLightMode}
                          currency={currency}
                          setCurrency={setCurrency}
                          currentUser={currentUser}
                          isRateLoading={isRateLoading}
                          rateUpdatedAt={rateUpdatedAt}
                          onDownloadReport={handleDownloadReport}
                          totals={{
                            totalIncome: formatCurrency(totalIncome),
                            totalExpense: formatCurrency(totalExpense),
                            netBalance: formatCurrency(netBalance)
                          }}
                        />
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                )}
              </div>
            </main>

            <SlideOverDrawer 
              isOpen={isDrawerOpen} 
              onClose={handleCloseDrawer} 
              fetchTransactions={fetchTransactions} 
              currency={currency}
              exchangeRate={exchangeRate}
              editingTransaction={editingTransaction}
            />
          </>
        )}
      </div>
    </Router>
  );
}

export default App;
