import React from 'react';
import { EventBringItem, EventBringItemInput } from '../types/Event';
import './BringListEditor.css';

interface BringListEditorProps {
  items: EventBringItemInput[];
  onChange: (items: EventBringItemInput[]) => void;
  existingItems?: EventBringItem[];
  isEditingExisting?: boolean;
}

const createEmptyItem = (): EventBringItemInput => ({
  name: '',
  description: '',
  quantityNeeded: undefined,
  allowMultipleClaims: true
});

const BringListEditor: React.FC<BringListEditorProps> = ({
  items,
  onChange,
  existingItems = [],
  isEditingExisting = false
}) => {
  const handleAddItem = () => {
    onChange([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleItemChange = <K extends keyof EventBringItemInput>(
    index: number,
    key: K,
    value: EventBringItemInput[K]
  ) => {
    const next = items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const hasExistingItems = existingItems.length > 0;

  return (
    <div className="bring-list-editor">
      {isEditingExisting && hasExistingItems && (
        <div className="bring-list-existing">
          <h4>Existing bring-list items</h4>
          <p className="helper-text">
            Manage these from the event details page. Add new items below to expand the list.
          </p>
          <ul className="existing-items-list">
            {existingItems.map(item => (
              <li key={item.id} className="existing-item">
                <div className="existing-item-main">
                  <span className="name">{item.name}</span>
                  {item.quantityNeeded !== undefined && (
                    <span className="quantity">
                      Needed: {item.quantityNeeded} • Claimed: {item.quantityClaimed ?? 0}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="description">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="editor-header">
        <div>
          <h4>Seed new bring-list items</h4>
          <p className="helper-text">
            These items will appear for attendees to claim once the event is created.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
          + Add item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No new items yet. Add at least one item or continue without seeding.</p>
        </div>
      ) : (
        <div className="bring-list-items">
          {items.map((item, index) => (
            <div key={index} className="bring-list-row">
              <div className="row-main">
                <div className="input-group">
                  <label htmlFor={`item-name-${index}`}>Item name *</label>
                  <input
                    id={`item-name-${index}`}
                    type="text"
                    value={item.name}
                    onChange={(event) => handleItemChange(index, 'name', event.target.value)}
                    placeholder="e.g., Mashed potatoes"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor={`item-qty-${index}`}>Quantity needed</label>
                  <input
                    id={`item-qty-${index}`}
                    type="number"
                    min={1}
                    value={item.quantityNeeded ?? ''}
                    onChange={(event) =>
                      handleItemChange(
                        index,
                        'quantityNeeded',
                        event.target.value === '' ? undefined : Number(event.target.value)
                      )
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="row-secondary">
                <div className="input-group">
                  <label htmlFor={`item-desc-${index}`}>Notes</label>
                  <textarea
                    id={`item-desc-${index}`}
                    rows={2}
                    value={item.description ?? ''}
                    onChange={(event) => handleItemChange(index, 'description', event.target.value)}
                    placeholder="Include any helpful details"
                  />
                </div>

                <label className="checkbox-label inline">
                  <input
                    type="checkbox"
                    checked={item.allowMultipleClaims !== false}
                    onChange={(event) =>
                      handleItemChange(index, 'allowMultipleClaims', event.target.checked)
                    }
                  />
                  <span className="checkmark"></span>
                  Allow multiple people to claim this item
                </label>
              </div>

              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-link danger"
                  onClick={() => handleRemoveItem(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BringListEditor;

