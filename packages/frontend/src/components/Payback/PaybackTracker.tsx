import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, DollarSign, RotateCcw, X } from 'lucide-react';
import { paybackApi } from '../../services/api';
import './PaybackTracker.css';

interface PaybackAccount {
  id: number;
  kid_name: string;
  total_owed: number;
  total_paid: number;
  balance: number;
  is_active: boolean;
}

interface PaybackChore {
  id: number;
  account_id: number;
  description: string;
  amount: number;
  completed_date: string;
}

export function PaybackTracker() {
  const [accounts, setAccounts] = useState<PaybackAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PaybackAccount | null>(null);
  const [chores, setChores] = useState<PaybackChore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add chore form
  const [choreDescription, setChoreDescription] = useState('');
  const [choreAmount, setChoreAmount] = useState('1.00');

  // Add debt modal
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtAccountId, setDebtAccountId] = useState<number | null>(null);

  // Add account modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newKidName, setNewKidName] = useState('');

  // Reset confirmation
  const [confirmResetId, setConfirmResetId] = useState<number | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await paybackApi.getAllAccounts();
      const accts = res.data.data;
      setAccounts(accts);
      if (accts.length > 0 && !selectedAccount) {
        setSelectedAccount(accts[0]);
      } else if (selectedAccount) {
        const updated = accts.find((a: PaybackAccount) => a.id === selectedAccount.id);
        if (updated) setSelectedAccount(updated);
      }
    } catch (err: any) {
      setError('Failed to load accounts');
    }
  }, [selectedAccount]);

  const loadChores = useCallback(async (accountId: number) => {
    try {
      const res = await paybackApi.getChores(accountId);
      setChores(res.data.data);
    } catch (err: any) {
      setError('Failed to load chores');
    }
  }, []);

  useEffect(() => {
    loadAccounts().then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedAccount) {
      loadChores(selectedAccount.id);
    }
  }, [selectedAccount, loadChores]);

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !choreDescription.trim()) return;

    try {
      await paybackApi.addChore(selectedAccount.id, {
        description: choreDescription.trim(),
        amount: parseFloat(choreAmount) || 1.00,
      });
      setChoreDescription('');
      setChoreAmount('1.00');
      await loadAccounts();
      await loadChores(selectedAccount.id);
    } catch (err: any) {
      setError('Failed to add chore');
    }
  };

  const handleQuickAmount = (amount: number) => {
    setChoreAmount(amount.toFixed(2));
  };

  const handleDeleteChore = async (choreId: number) => {
    if (!selectedAccount) return;
    try {
      await paybackApi.deleteChore(choreId);
      await loadAccounts();
      await loadChores(selectedAccount.id);
    } catch (err: any) {
      setError('Failed to delete chore');
    }
  };

  const handleAddDebt = async () => {
    if (debtAccountId === null || !debtAmount) return;
    const account = accounts.find(a => a.id === debtAccountId);
    if (!account) return;

    const addAmount = parseFloat(debtAmount);
    if (isNaN(addAmount) || addAmount <= 0) return;

    try {
      await paybackApi.updateAccount(debtAccountId, {
        total_owed: account.total_owed + addAmount,
      });
      setShowDebtModal(false);
      setDebtAmount('');
      setDebtAccountId(null);
      await loadAccounts();
    } catch (err: any) {
      setError('Failed to add debt');
    }
  };

  const handleCreateAccount = async () => {
    if (!newKidName.trim()) return;
    try {
      await paybackApi.createAccount({ kid_name: newKidName.trim() });
      setShowAccountModal(false);
      setNewKidName('');
      await loadAccounts();
    } catch (err: any) {
      setError('Failed to create account');
    }
  };

  const handleResetAccount = async (accountId: number) => {
    try {
      await paybackApi.resetAccount(accountId);
      setConfirmResetId(null);
      await loadAccounts();
      if (selectedAccount?.id === accountId) {
        await loadChores(accountId);
      }
    } catch (err: any) {
      setError('Failed to reset account');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getProgressPercent = (account: PaybackAccount) => {
    if (account.total_owed <= 0) return 100;
    return Math.min(100, (account.total_paid / account.total_owed) * 100);
  };

  if (loading) {
    return <div className="payback-tracker"><p>Loading...</p></div>;
  }

  return (
    <div className="payback-tracker">
      <div className="pb-header">
        <h1>Goal Chores</h1>
        <button className="pb-add-account-btn" onClick={() => setShowAccountModal(true)}>
          <Plus size={20} /> Add Kid
        </button>
      </div>

      {error && (
        <div className="pb-error">
          {error}
          <button onClick={() => setError('')} className="pb-error-dismiss"><X size={16} /></button>
        </div>
      )}

      {/* Account cards */}
      <div className="pb-accounts">
        {accounts.map(account => (
          <div
            key={account.id}
            className={`pb-account-card ${selectedAccount?.id === account.id ? 'selected' : ''}`}
            onClick={() => setSelectedAccount(account)}
          >
            <div className="pb-account-name">{account.kid_name}</div>

            <div className="pb-balance-grid">
              <div className="pb-balance-item">
                <span className="pb-balance-label">Owes</span>
                <span className="pb-balance-value owed">${account.total_owed.toFixed(2)}</span>
              </div>
              <div className="pb-balance-item">
                <span className="pb-balance-label">Earned</span>
                <span className="pb-balance-value earned">${account.total_paid.toFixed(2)}</span>
              </div>
              <div className="pb-balance-item">
                <span className="pb-balance-label">Remaining</span>
                <span className={`pb-balance-value ${account.balance <= 0 ? 'paid-off' : 'remaining'}`}>
                  ${Math.max(0, account.balance).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pb-progress-bar">
              <div
                className={`pb-progress-fill ${account.balance <= 0 ? 'complete' : ''}`}
                style={{ width: `${getProgressPercent(account)}%` }}
              />
            </div>
            {account.total_owed > 0 && (
              <div className="pb-progress-text">
                {account.balance <= 0 ? 'Paid off!' : `${getProgressPercent(account).toFixed(0)}% paid`}
              </div>
            )}

            <div className="pb-account-actions">
              <button
                className="pb-debt-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDebtAccountId(account.id);
                  setShowDebtModal(true);
                }}
              >
                <DollarSign size={16} /> Add Debt
              </button>
              {confirmResetId === account.id ? (
                <div className="pb-reset-confirm">
                  <span>Reset all?</span>
                  <button className="pb-confirm-yes" onClick={(e) => { e.stopPropagation(); handleResetAccount(account.id); }}>Yes</button>
                  <button className="pb-confirm-no" onClick={(e) => { e.stopPropagation(); setConfirmResetId(null); }}>No</button>
                </div>
              ) : (
                <button
                  className="pb-reset-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmResetId(account.id);
                  }}
                >
                  <RotateCcw size={16} /> Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add chore form */}
      {selectedAccount && (
        <div className="pb-add-chore-section">
          <h2>Log Chore for {selectedAccount.kid_name}</h2>
          <form onSubmit={handleAddChore} className="pb-chore-form">
            <input
              type="text"
              placeholder="What chore was done?"
              value={choreDescription}
              onChange={(e) => setChoreDescription(e.target.value)}
              className="pb-chore-input"
              required
            />
            <div className="pb-amount-row">
              <div className="pb-amount-input-group">
                <span className="pb-dollar-sign">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={choreAmount}
                  onChange={(e) => setChoreAmount(e.target.value)}
                  className="pb-amount-input"
                />
              </div>
              <div className="pb-quick-amounts">
                <button type="button" className="pb-quick-btn" onClick={() => handleQuickAmount(1)}>$1</button>
                <button type="button" className="pb-quick-btn" onClick={() => handleQuickAmount(5)}>$5</button>
              </div>
            </div>
            <button type="submit" className="pb-add-chore-btn" disabled={!choreDescription.trim()}>
              <Plus size={20} /> Add Chore
            </button>
          </form>
        </div>
      )}

      {/* Chore log */}
      {selectedAccount && (
        <div className="pb-chore-log">
          <h2>Chore Log</h2>
          {chores.length === 0 ? (
            <p className="pb-empty">No chores logged yet.</p>
          ) : (
            <div className="pb-chore-list">
              {chores.map(chore => (
                <div key={chore.id} className="pb-chore-item">
                  <div className="pb-chore-info">
                    <span className="pb-chore-date">{formatDate(chore.completed_date)}</span>
                    <span className="pb-chore-desc">{chore.description}</span>
                  </div>
                  <div className="pb-chore-right">
                    <span className="pb-chore-amount">+${chore.amount.toFixed(2)}</span>
                    <button
                      className="pb-chore-delete"
                      onClick={() => handleDeleteChore(chore.id)}
                      aria-label="Delete chore"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Debt Modal */}
      {showDebtModal && (
        <div className="pb-modal-overlay" onClick={() => setShowDebtModal(false)}>
          <div className="pb-modal" onClick={e => e.stopPropagation()}>
            <div className="pb-modal-header">
              <h3>Add to Debt</h3>
              <button className="pb-modal-close" onClick={() => setShowDebtModal(false)}><X size={20} /></button>
            </div>
            <div className="pb-modal-body">
              <label>Amount to add:</label>
              <div className="pb-amount-input-group modal-amount">
                <span className="pb-dollar-sign">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={debtAmount}
                  onChange={e => setDebtAmount(e.target.value)}
                  className="pb-amount-input"
                  autoFocus
                />
              </div>
              <button className="pb-modal-confirm" onClick={handleAddDebt} disabled={!debtAmount || parseFloat(debtAmount) <= 0}>
                Add Debt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAccountModal && (
        <div className="pb-modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="pb-modal" onClick={e => e.stopPropagation()}>
            <div className="pb-modal-header">
              <h3>Add Kid</h3>
              <button className="pb-modal-close" onClick={() => setShowAccountModal(false)}><X size={20} /></button>
            </div>
            <div className="pb-modal-body">
              <label>Kid's name:</label>
              <input
                type="text"
                value={newKidName}
                onChange={e => setNewKidName(e.target.value)}
                className="pb-chore-input"
                placeholder="Enter name"
                autoFocus
              />
              <button className="pb-modal-confirm" onClick={handleCreateAccount} disabled={!newKidName.trim()}>
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
