import React, { useEffect, useMemo, useState } from 'react';
import { eventAPI } from '../services/eventApi';
import {
  EventBringItem,
  EventBringItemInput,
  EventBringClaimInput
} from '../types/Event';
import './EventBringListSection.css';

interface EventBringListSectionProps {
  eventId: string;
  bringListEnabled: boolean;
  initialItems?: EventBringItem[];
  canManageList: boolean;
  onItemsUpdated?: (items: EventBringItem[]) => void;
  eventTitle?: string;
}

interface ClaimDraft {
  quantity: number;
  note: string;
}

const emptyNewItem: EventBringItemInput = {
  name: '',
  description: '',
  quantityNeeded: undefined,
  allowMultipleClaims: true
};

const EventBringListSection: React.FC<EventBringListSectionProps> = ({
  eventId,
  bringListEnabled,
  initialItems = [],
  canManageList,
  onItemsUpdated,
  eventTitle
}) => {
  const [items, setItems] = useState<EventBringItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<EventBringItemInput>({ ...emptyNewItem });
  const [addingItem, setAddingItem] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EventBringItemInput>({ ...emptyNewItem });
  const [savingEdit, setSavingEdit] = useState(false);

  const [claimDrafts, setClaimDrafts] = useState<Record<string, ClaimDraft>>({});
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
    const initialDrafts: Record<string, ClaimDraft> = {};
    initialItems.forEach(item => {
      initialDrafts[item.id] = {
        quantity: item.userClaim?.quantity ?? 1,
        note: item.userClaim?.note ?? ''
      };
    });
    setClaimDrafts(initialDrafts);
  }, [initialItems]);

  const refreshItems = async () => {
    try {
      const response = await eventAPI.getBringItems(eventId);
      setItems(response.data);
      setClaimDrafts(prev => {
        const updated: Record<string, ClaimDraft> = {};
        response.data.forEach(item => {
          updated[item.id] = {
            quantity: item.userClaim?.quantity ?? prev[item.id]?.quantity ?? 1,
            note: item.userClaim?.note ?? prev[item.id]?.note ?? ''
          };
        });
        return updated;
      });
      onItemsUpdated?.(response.data);
    } catch (err: any) {
      console.error('Failed to refresh bring items', err);
      setError(err.response?.data?.error || 'Failed to load bring items');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      setError('Item name is required');
      return;
    }
    try {
      setAddingItem(true);
      setError(null);
      const payload: EventBringItemInput = {
        name: newItem.name.trim(),
        description: newItem.description?.trim() || undefined,
        quantityNeeded:
          newItem.quantityNeeded && newItem.quantityNeeded > 0
            ? newItem.quantityNeeded
            : 1,
        allowMultipleClaims: newItem.allowMultipleClaims !== false
      };
      await eventAPI.addBringItem(eventId, payload);
      setNewItem({ ...emptyNewItem });
      await refreshItems();
    } catch (err: any) {
      console.error('Failed to add bring item', err);
      setError(err.response?.data?.error || 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleStartEdit = (item: EventBringItem) => {
    setEditingItemId(item.id);
    setEditDraft({
      name: item.name,
      description: item.description,
      quantityNeeded: item.quantityNeeded,
      allowMultipleClaims: item.allowMultipleClaims
    });
  };

  const handleUpdateItem = async () => {
    if (!editingItemId) return;
    if (!editDraft.name?.trim()) {
      setError('Item name is required');
      return;
    }
    try {
      setSavingEdit(true);
      setError(null);
      const payload: EventBringItemInput = {
        name: editDraft.name.trim(),
        description: editDraft.description?.trim() || undefined,
        quantityNeeded:
          editDraft.quantityNeeded && editDraft.quantityNeeded > 0
            ? editDraft.quantityNeeded
            : 1,
        allowMultipleClaims: editDraft.allowMultipleClaims !== false
      };
      await eventAPI.updateBringItem(eventId, editingItemId, payload);
      setEditingItemId(null);
      await refreshItems();
    } catch (err: any) {
      console.error('Failed to update bring item', err);
      setError(err.response?.data?.error || 'Failed to update item');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Remove this item from the bring-list? This will delete all claims for it.')) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await eventAPI.deleteBringItem(eventId, itemId);
      await refreshItems();
    } catch (err: any) {
      console.error('Failed to delete bring item', err);
      setError(err.response?.data?.error || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimChange = (itemId: string, draft: Partial<ClaimDraft>) => {
    setClaimDrafts(prev => ({
      ...prev,
      [itemId]: {
        quantity: draft.quantity ?? prev[itemId]?.quantity ?? 1,
        note: draft.note ?? prev[itemId]?.note ?? ''
      }
    }));
  };

  const submitClaim = async (item: EventBringItem) => {
    const draft = claimDrafts[item.id] ?? { quantity: 1, note: '' };
    if (draft.quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    if (
      item.allowMultipleClaims !== true &&
      item.quantityRemaining !== undefined &&
      !item.userClaim &&
      draft.quantity > item.quantityRemaining
    ) {
      setError('Not enough quantity remaining to claim that amount');
      return;
    }

    const payload: EventBringClaimInput = {
      quantity: draft.quantity,
      note: draft.note?.trim() || undefined
    };

    try {
      setClaimingItemId(item.id);
      setError(null);
      await eventAPI.claimBringItem(eventId, item.id, payload);
      await refreshItems();
    } catch (err: any) {
      console.error('Failed to claim item', err);
      setError(err.response?.data?.error || 'Failed to claim item');
    } finally {
      setClaimingItemId(null);
    }
  };

  const releaseClaim = async (itemId: string) => {
    try {
      setClaimingItemId(itemId);
      setError(null);
      await eventAPI.releaseBringItem(eventId, itemId);
      await refreshItems();
    } catch (err: any) {
      console.error('Failed to release claim', err);
      setError(err.response?.data?.error || 'Failed to release claim');
    } finally {
      setClaimingItemId(null);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aRemaining = a.quantityRemaining ?? Number.MAX_SAFE_INTEGER;
      const bRemaining = b.quantityRemaining ?? Number.MAX_SAFE_INTEGER;
      return aRemaining - bRemaining;
    });
  }, [items]);

  const summaryRows = useMemo(
    () =>
      sortedItems.map(item => {
        const allowMultiple = item.allowMultipleClaims !== false;
        const quantityNeeded = item.quantityNeeded ?? 1;
        const totalClaimed = typeof item.quantityClaimed === 'number'
          ? item.quantityClaimed
          : item.claims?.reduce((sum, claim) => sum + (claim.quantity ?? 0), 0) ?? 0;

        let quantityRemaining: number | null;
        if (item.quantityRemaining !== undefined && item.quantityRemaining !== null) {
          quantityRemaining = item.quantityRemaining;
        } else if (quantityNeeded !== null) {
          quantityRemaining = Math.max(quantityNeeded - totalClaimed, 0);
        } else if (allowMultiple) {
          quantityRemaining = totalClaimed > 0 ? 0 : null;
        } else {
          quantityRemaining = Math.max(1 - totalClaimed, 0);
        }

        return {
          id: item.id,
          name: item.name,
          needed: quantityNeeded,
          claimed: totalClaimed,
          remaining: quantityRemaining,
          allowMultipleClaims: allowMultiple,
          claims: item.claims
        };
      }),
    [sortedItems]
  );

  const outstandingItems = useMemo(
    () =>
      summaryRows.filter(row => {
        if (row.remaining === null) {
          return true;
        }
        return row.remaining > 0;
      }),
    [summaryRows]
  );

  if (!bringListEnabled) {
    return (
      <div className="bring-list-disabled">
        <h3>Community bring-list</h3>
        <p>
          The organizer has not enabled a shared bring-list for this event yet. Reach out if you
          would like to coordinate supplies!
        </p>
      </div>
    );
  }

  return (
    <div className="bring-list-section">
      <div className="bring-list-header">
        <div>
          <h3>Community bring-list</h3>
          <p>
            Claim an item to let everyone know what you’re bringing. You can always adjust or release
            your claim later.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={refreshItems}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bring-list-error">
          <p>{error}</p>
        </div>
      )}

      {canManageList && (
        <div className="bring-list-add-card">
          <h4>Add a new item</h4>
          <div className="add-item-grid">
            <div className="input-group">
              <label htmlFor="new-item-name">Item name *</label>
              <input
                id="new-item-name"
                type="text"
                value={newItem.name}
                onChange={(event) => setNewItem(prev => ({ ...prev, name: event.target.value }))}
                placeholder="e.g., Paper plates"
              />
            </div>

            <div className="input-group">
              <label htmlFor="new-item-qty">Quantity needed</label>
              <input
                id="new-item-qty"
                type="number"
                min={1}
                value={newItem.quantityNeeded ?? ''}
                onChange={(event) =>
                  setNewItem(prev => ({
                    ...prev,
                    quantityNeeded: event.target.value === '' ? undefined : Number(event.target.value)
                  }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="input-group full-width">
              <label htmlFor="new-item-desc">Notes</label>
              <textarea
                id="new-item-desc"
                rows={2}
                value={newItem.description ?? ''}
                onChange={(event) => setNewItem(prev => ({ ...prev, description: event.target.value }))}
                placeholder="Include any helpful details"
              />
            </div>

            <label className="checkbox-label inline">
              <input
                type="checkbox"
                checked={newItem.allowMultipleClaims !== false}
                onChange={(event) =>
                  setNewItem(prev => ({ ...prev, allowMultipleClaims: event.target.checked }))
                }
              />
              <span className="checkmark"></span>
              Allow multiple people to claim this item
            </label>
          </div>
          <div className="add-item-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAddItem}
              disabled={addingItem}
            >
              {addingItem ? 'Adding...' : 'Add item'}
            </button>
          </div>
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className="bring-list-empty">
          <p>No items on the bring-list yet. Be the first to add something!</p>
        </div>
      ) : (
        <>
          <div className="bring-items-grid">
            {sortedItems.map(item => {
              const claimDraft = claimDrafts[item.id] ?? { quantity: 1, note: '' };
              const userHasClaim = Boolean(item.userClaim);

              const allowMultiple = item.allowMultipleClaims !== false;
              const quantityNeeded = item.quantityNeeded ?? 1;
              const totalClaimed = typeof item.quantityClaimed === 'number'
                ? item.quantityClaimed
                : item.claims?.reduce((sum, claim) => sum + (claim.quantity ?? 0), 0) ?? 0;

              let effectiveRemaining: number | null;
              if (item.quantityRemaining !== undefined && item.quantityRemaining !== null) {
                effectiveRemaining = item.quantityRemaining;
              } else if (quantityNeeded !== null) {
                effectiveRemaining = Math.max(quantityNeeded - totalClaimed, 0);
              } else if (allowMultiple) {
                effectiveRemaining = totalClaimed > 0 ? 0 : null;
              } else {
                effectiveRemaining = Math.max(1 - totalClaimed, 0);
              }

              const statusLabel =
                effectiveRemaining === null
                  ? 'Open'
                  : effectiveRemaining <= 0
                  ? 'Closed'
                  : `${effectiveRemaining} remaining`;

              const claimDisabled =
                claimingItemId === item.id ||
                (!userHasClaim && effectiveRemaining !== null && effectiveRemaining <= 0);

              const claimedByOthers =
                item.claims.filter(claim => claim.userId !== item.userClaim?.userId) || [];

              return (
                <div key={item.id} className="bring-item-card">
                  <div className="card-header">
                    <div>
                      <h4>{item.name}</h4>
                      <span className="status-pill">{statusLabel}</span>
                    </div>
                    {item.canEdit && (
                      <div className="item-actions">
                        <button
                          type="button"
                          className="btn btn-link"
                          onClick={() =>
                            editingItemId === item.id ? setEditingItemId(null) : handleStartEdit(item)
                          }
                        >
                          {editingItemId === item.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-link danger"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {item.description && <p className="item-description">{item.description}</p>}

                  {editingItemId === item.id && (
                    <div className="item-edit-form">
                      <div className="input-group">
                        <label htmlFor={`edit-name-${item.id}`}>Item name *</label>
                        <input
                          id={`edit-name-${item.id}`}
                          type="text"
                          value={editDraft.name ?? ''}
                          onChange={(event) =>
                            setEditDraft(prev => ({ ...prev, name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor={`edit-qty-${item.id}`}>Quantity needed</label>
                        <input
                          id={`edit-qty-${item.id}`}
                          type="number"
                          min={1}
                          value={editDraft.quantityNeeded ?? ''}
                          onChange={(event) =>
                            setEditDraft(prev => ({
                              ...prev,
                              quantityNeeded:
                                event.target.value === '' ? undefined : Number(event.target.value)
                            }))
                          }
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor={`edit-desc-${item.id}`}>Notes</label>
                        <textarea
                          id={`edit-desc-${item.id}`}
                          rows={2}
                          value={editDraft.description ?? ''}
                          onChange={(event) =>
                            setEditDraft(prev => ({ ...prev, description: event.target.value }))
                          }
                        />
                      </div>
                      <label className="checkbox-label inline">
                        <input
                          type="checkbox"
                          checked={editDraft.allowMultipleClaims !== false}
                          onChange={(event) =>
                            setEditDraft(prev => ({
                              ...prev,
                              allowMultipleClaims: event.target.checked
                            }))
                          }
                        />
                        <span className="checkmark"></span>
                        Allow multiple claims
                      </label>
                      <div className="edit-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleUpdateItem}
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving...' : 'Save changes'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="claim-section">
                    <div className="claim-form">
                      <div className="input-group">
                        <label htmlFor={`claim-qty-${item.id}`}>Quantity</label>
                        <input
                          id={`claim-qty-${item.id}`}
                          type="number"
                          min={1}
                          value={claimDraft.quantity}
                          onChange={(event) =>
                            handleClaimChange(item.id, {
                              quantity: Number(event.target.value)
                            })
                          }
                        />
                      </div>
                      <div className="input-group full-width">
                        <label htmlFor={`claim-note-${item.id}`}>Note</label>
                        <textarea
                          id={`claim-note-${item.id}`}
                          rows={2}
                          value={claimDraft.note}
                          onChange={(event) =>
                            handleClaimChange(item.id, { note: event.target.value })
                          }
                          placeholder="Add a short note (optional)"
                        />
                      </div>
                    </div>
                    <div className="claim-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => submitClaim(item)}
                        disabled={claimDisabled}
                      >
                        {item.userClaim ? 'Update my claim' : 'Claim this'}
                      </button>
                      {item.userClaim && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => releaseClaim(item.id)}
                          disabled={claimingItemId === item.id}
                        >
                          Release
                        </button>
                      )}
                    </div>
                  </div>

                  {item.claims.length > 0 && (
                    <div className="claim-list">
                      <h5>People bringing:</h5>
                      <ul>
                        {item.claims.map(claim => (
                          <li key={claim.id}>
                            <span className="claim-user">{claim.userName}</span>
                            <span className="claim-quantity">
                              {claim.quantity} {claim.quantity === 1 ? 'item' : 'items'}
                            </span>
                            {claim.note && <span className="claim-note">“{claim.note}”</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bring-list-summary">
            <div className="summary-header">
              <div>
                <h3>Bring-list summary</h3>
                <p className="summary-subtitle">
                  Snapshot of every item, who's bringing it, and what's still open.
                </p>
              </div>
              <button 
                className="btn btn-print-summary no-print"
                onClick={() => window.print()}
                title="Print or save as PDF"
              >
                🖨️ Print / Save PDF
              </button>
            </div>

            <div className="summary-print-header print-only">
              <h1>{eventTitle || 'Bring-list Summary'}</h1>
              <p className="print-subtitle">Bring-list Summary</p>
            </div>

            <div className="summary-table-wrapper">
              <table className="bring-summary-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Needed</th>
                    <th>Claimed</th>
                    <th>Remaining</th>
                    <th className="no-print">People Bringing</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map(row => (
                    <tr key={row.id}>
                      <td>
                        <div className="summary-item-cell">
                          <span className="summary-item-name">{row.name}</span>
                          {row.allowMultipleClaims && row.needed === null && (
                            <span className="summary-badge no-print">Open</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {row.needed === null
                          ? row.allowMultipleClaims
                            ? 'Open'
                            : '—'
                          : row.needed}
                      </td>
                      <td>{row.claimed}</td>
                      <td>
                        {row.remaining === null
                          ? 'Open'
                          : row.remaining === 0
                          ? 'Closed'
                          : row.remaining}
                      </td>
                      <td className="no-print">
                        {row.claims.length === 0 ? (
                          <span className="summary-none">No claims yet</span>
                        ) : (
                          <ul className="summary-claim-list">
                            {row.claims.map(claim => (
                              <li key={claim.id}>
                                <span className="summary-claim-user">{claim.userName}</span>
                                <span className="summary-claim-quantity">{claim.quantity}</span>
                                {claim.note && (
                                  <span className="summary-claim-note">"{claim.note}"</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bring-summary-remaining">
              <h4>Still needed</h4>
              {outstandingItems.length === 0 ? (
                <p className="summary-none">Everything is covered—thank you! 🎉</p>
              ) : (
                <ul>
                  {outstandingItems.map(item => (
                    <li key={item.id}>
                      <span className="summary-item-name">{item.name}</span>
                      <span className="summary-remaining-value">
                        {item.remaining === null
                          ? 'Open'
                          : item.remaining === 0
                          ? 'Closed'
                          : `${item.remaining} remaining`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventBringListSection;

