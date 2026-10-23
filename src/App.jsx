
import React, { useEffect, useMemo, useState } from "react";

import {
  initializeTrello,
  getBoardInfo,
  getTrelloCards,
  getTrelloLists,
  getTrelloMembers,
  loadSavedViews,
  saveSavedViews,
  filterTrelloCards,
  openTrelloCard,
} from "./trello";

import "./styles.css";

const EMPTY_FILTER = {
  member: "any",
  dueDate: "any",
  labels: [],
  cardType: "open",
  keyword: "",
  attachment: "any",
  checklist: "any",
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [board, setBoard] = useState(null);
  const [cards, setCards] = useState([]);
  const [lists, setLists] = useState([]);
  const [members, setMembers] = useState([]);
  const [views, setViews] = useState([]);

  const [activeViewId, setActiveViewId] = useState(null);

  const [filter, setFilter] = useState(EMPTY_FILTER);

  const [viewName, setViewName] = useState("");

  const [editingViewId, setEditingViewId] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [currentMember, setCurrentMember] = useState(null);

  const [trelloReady, setTrelloReady] = useState(false);

  /* =====================================
     LOAD TRELLO DATA
  ===================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const client = initializeTrello();

        if (!client) {
          throw new Error(
            "Open this Power-Up inside a Trello board."
          );
        }

        const [
          boardData,
          cardData,
          listData,
          memberData,
          savedData,
        ] = await Promise.all([
          getBoardInfo(),
          getTrelloCards(),
          getTrelloLists(),
          getTrelloMembers(),
          loadSavedViews(),
        ]);

        if (cancelled) return;

        setBoard(boardData);
        setCards(cardData);
        setLists(listData);
        setMembers(memberData);
        setViews(savedData);

        setTrelloReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to connect to Trello."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================
     ACTIVE VIEW
  ===================================== */

  const activeView = useMemo(() => {
    return views.find(
      (view) => view.id === activeViewId
    ) || null;
  }, [views, activeViewId]);

  /* =====================================
     FILTER CARDS
  ===================================== */

  const filteredCards = useMemo(() => {
    let result = filterTrelloCards(cards, {
      ...filter,
      currentMemberId: currentMember?.id,
    });

    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();

      result = result.filter((card) => {
        return (
          card.title.toLowerCase().includes(keyword) ||
          card.description.toLowerCase().includes(keyword)
        );
      });
    }

    return result;
  }, [cards, filter, searchText, currentMember]);

  /* =====================================
     UPDATE FILTER
  ===================================== */

  function updateFilter(key, value) {
    setFilter((previous) => ({
      ...previous,
      [key]: value,
    }));

    setActiveViewId(null);
  }

  /* =====================================
     LABEL SELECTION
  ===================================== */

  function toggleLabel(labelName) {
    setFilter((previous) => {
      const selected = previous.labels || [];

      const exists = selected.includes(labelName);

      return {
        ...previous,
        labels: exists
          ? selected.filter((label) => label !== labelName)
          : [...selected, labelName],
      };
    });

    setActiveViewId(null);
  }

  /* =====================================
     RESET FILTERS
  ===================================== */

  function resetFilters() {
    setFilter(EMPTY_FILTER);
    setActiveViewId(null);
    setSearchText("");
  }

  /* =====================================
     OPEN CREATE VIEW
  ===================================== */

  function openCreateModal() {
    setEditingViewId(null);
    setViewName("");
    setFilter(EMPTY_FILTER);
    setShowModal(true);
  }

  /* =====================================
     OPEN EDIT VIEW
  ===================================== */

  function openEditModal(view) {
    setEditingViewId(view.id);
    setViewName(view.name);

    setFilter({
      ...EMPTY_FILTER,
      ...(view.filters || {}),
    });

    setShowModal(true);
  }

  /* =====================================
     SAVE VIEW
  ===================================== */

  async function handleSaveView(event) {
    event.preventDefault();

    const trimmedName = viewName.trim();

    if (!trimmedName) {
      setNotice("Enter a filter view name.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      let updatedViews;

      if (editingViewId) {
        updatedViews = views.map((view) =>
          view.id === editingViewId
            ? {
                ...view,
                name: trimmedName,
                filters: { ...filter },
                updatedAt: new Date().toISOString(),
              }
            : view
        );
      } else {
        const newView = {
          id: createId(),
          name: trimmedName,
          filters: { ...filter },
          createdAt: new Date().toISOString(),
        };

        updatedViews = [...views, newView];

        setActiveViewId(newView.id);
      }

      await saveSavedViews(updatedViews);

      setViews(updatedViews);
      setShowModal(false);

      setNotice("Filter view saved successfully.");
    } catch (err) {
      setNotice(
        err?.message || "Unable to save filter view."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================
     APPLY SAVED VIEW
  ===================================== */

  function applyView(view) {
    setFilter({
      ...EMPTY_FILTER,
      ...(view.filters || {}),
    });

    setActiveViewId(view.id);

    setSearchText("");

    setNotice(`Applied "${view.name}".`);
  }

  /* =====================================
     DELETE SAVED VIEW
  ===================================== */

  async function deleteView(viewId) {
    const view = views.find(
      (item) => item.id === viewId
    );

    if (!view) return;

    const confirmed = window.confirm(
      `Delete "${view.name}"?`
    );

    if (!confirmed) return;

    try {
      const updatedViews = views.filter(
        (item) => item.id !== viewId
      );

      await saveSavedViews(updatedViews);

      setViews(updatedViews);

      if (activeViewId === viewId) {
        setActiveViewId(null);
        setFilter(EMPTY_FILTER);
      }

      setNotice("Filter view deleted.");
    } catch (err) {
      setNotice(
        err?.message || "Unable to delete filter view."
      );
    }
  }

  /* =====================================
     REFRESH BOARD DATA
  ===================================== */

  async function refreshData() {
    setLoading(true);
    setError("");

    try {
      const [
        cardData,
        listData,
        memberData,
        savedData,
      ] = await Promise.all([
        getTrelloCards(),
        getTrelloLists(),
        getTrelloMembers(),
        loadSavedViews(),
      ]);

      setCards(cardData);
      setLists(listData);
      setMembers(memberData);
      setViews(savedData);

      setNotice("Board data refreshed.");
    } catch (err) {
      setError(
        err?.message || "Unable to refresh board data."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================
     LOADING SCREEN
  ===================================== */

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />

        <h2>Saved Filter Views</h2>

        <p>Connecting to Trello...</p>
      </div>
    );
  }

  /* =====================================
     MAIN UI
  ===================================== */

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <span className="logo-icon">▦</span>
          </div>

          <div>
            <h1>Saved Filter Views</h1>

            <p className="board-name">
              {board?.name || "Trello Board"}
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="icon-button"
            title="Refresh"
            onClick={refreshData}
          >
            ↻
          </button>

          <button
            className="primary-button"
            onClick={openCreateModal}
          >
            + Create view
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>

          <button onClick={refreshData}>
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="notice-banner">
          <span>{notice}</span>

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <main className="app-main">
        {/* SAVED VIEWS */}

        <section className="saved-views-section">
          <div className="section-heading">
            <div>
              <h2>My saved views</h2>

              <p>
                Save and reuse your favorite card filters.
              </p>
            </div>

            <span className="view-count">
              {views.length} views
            </span>
          </div>

          {views.length === 0 ? (
            <div className="empty-views">
              <div className="empty-icon">☆</div>

              <h3>No saved views yet</h3>

              <p>
                Create a filter view to quickly find the
                cards you need.
              </p>

              <button
                className="primary-button"
                onClick={openCreateModal}
              >
                + Create your first view
              </button>
            </div>
          ) : (
            <div className="saved-view-list">
              {views.map((view) => (
                <div
                  className={`saved-view-card ${
                    activeViewId === view.id
                      ? "active"
                      : ""
                  }`}
                  key={view.id}
                >
                  <button
                    className="saved-view-main"
                    onClick={() => applyView(view)}
                  >
                    <span className="saved-view-icon">
                      ◫
                    </span>

                    <span className="saved-view-name">
                      {view.name}
                    </span>

                    {activeViewId === view.id && (
                      <span className="active-indicator">
                        Active
                      </span>
                    )}
                  </button>

                  <div className="saved-view-actions">
                    <button
                      title="Edit view"
                      onClick={() => openEditModal(view)}
                    >
                      ✎
                    </button>

                    <button
                      title="Delete view"
                      onClick={() => deleteView(view.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FILTERS */}

        <section className="filters-section">
          <div className="section-heading">
            <div>
              <h2>Filters</h2>

              <p>
                Narrow down cards on this board.
              </p>
            </div>

            <button
              className="text-button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="filter-grid">
            {/* MEMBER */}

            <div className="filter-field">
              <label htmlFor="member-filter">
                Member
              </label>

              <select
                id="member-filter"
                value={filter.member}
                onChange={(event) =>
                  updateFilter("member", event.target.value)
                }
              >
                <option value="any">Any member</option>

                {members.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* DUE DATE */}

            <div className="filter-field">
              <label htmlFor="due-filter">
                Due date
              </label>

              <select
                id="due-filter"
                value={filter.dueDate}
                onChange={(event) =>
                  updateFilter("dueDate", event.target.value)
                }
              >
                <option value="any">Any time</option>
                <option value="today">Due today</option>
                <option value="week">Next 7 days</option>
                <option value="overdue">Overdue</option>
                <option value="none">No due date</option>
              </select>
            </div>

            {/* CARD TYPE */}

            <div className="filter-field">
              <label htmlFor="card-type-filter">
                Card status
              </label>

              <select
                id="card-type-filter"
                value={filter.cardType}
                onChange={(event) =>
                  updateFilter("cardType", event.target.value)
                }
              >
                <option value="any">All cards</option>
                <option value="open">Open cards</option>
                <option value="closed">Completed cards</option>
              </select>
            </div>

            {/* ATTACHMENT */}

            <div className="filter-field">
              <label htmlFor="attachment-filter">
                Attachments
              </label>

              <select
                id="attachment-filter"
                value={filter.attachment}
                onChange={(event) =>
                  updateFilter("attachment", event.target.value)
                }
              >
                <option value="any">Any</option>
                <option value="yes">Has attachments</option>
                <option value="no">No attachments</option>
              </select>
            </div>
          </div>

          {/* LABELS */}

          <div className="filter-field label-filter-field">
            <label>Labels</label>

            {cards.length === 0 ? (
              <p className="muted-text">
                No cards available.
              </p>
            ) : (
              <div className="label-options">
                {[
                  ...new Map(
                    cards
                      .flatMap((card) => card.labels)
                      .map((label) => [
                          label.name,
                          label,
                        ])
                  ).values(),
                ].map((label) => {
                  const selected =
                    filter.labels.includes(label.name);

                  return (
                    <button
                      key={label.id || label.name}
                      className={`label-chip ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() => toggleLabel(label.name)}
                    >
                      {label.color && (
                        <span
                          className="label-color"
                          style={{
                            backgroundColor: label.color,
                          }}
                        />
                      )}

                      {label.name || "Unnamed label"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* KEYWORD */}

          <div className="filter-field keyword-field">
            <label htmlFor="keyword-filter">
              Search cards
            </label>

            <input
              id="keyword-filter"
              type="text"
              placeholder="Search card title or description..."
              value={filter.keyword}
              onChange={(event) =>
                updateFilter("keyword", event.target.value)
              }
            />
          </div>

          {/* SAVE */}

          <div className="filter-footer">
            <button
              className="secondary-button"
              onClick={resetFilters}
            >
              Reset
            </button>

            <button
              className="primary-button"
              onClick={openCreateModal}
            >
              Save current filters
            </button>
          </div>
        </section>

        {/* FILTERED CARDS */}

        <section className="cards-section">
          <div className="section-heading">
            <div>
              <h2>Matching cards</h2>

              <p>
                {filteredCards.length} cards found
              </p>
            </div>

            <button
              className="text-button"
              onClick={() => {
                setSearchOpen((previous) => !previous);
                setSearchText("");
              }}
            >
              {searchOpen ? "Close search" : "Search"}
            </button>
          </div>

          {searchOpen && (
            <input
              className="card-search-input"
              type="text"
              placeholder="Search matching cards..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          )}

          {filteredCards.length === 0 ? (
            <div className="empty-cards">
              <div className="empty-icon">⌕</div>

              <h3>No matching cards</h3>

              <p>
                Try changing your filters or clearing
                the current selection.
              </p>

              <button
                className="secondary-button"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="matching-card-list">
              {filteredCards.map((card) => {
                const list = lists.find(
                  (item) => item.id === card.listId
                );

                return (
                  <button
                    className="matching-card"
                    key={card.id}
                    onClick={() => openTrelloCard(card.id)}
                  >
                    <div className="matching-card-content">
                      <h3>{card.title}</h3>

                      {card.description && (
                        <p>
                          {card.description.length > 120
                            ? `${card.description.slice(0, 120)}...`
                            : card.description}
                        </p>
                      )}

                      <div className="card-meta">
                        {list && (
                          <span className="list-badge">
                            {list.name}
                          </span>
                        )}

                        {card.due && (
                          <span className="due-badge">
                            Due{" "}
                            {new Date(
                              card.due
                            ).toLocaleDateString()}
                          </span>
                        )}

                        {card.members.length > 0 && (
                          <span className="member-badge">
                            {card.members.length} member
                            {card.members.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {card.labels.length > 0 && (
                        <div className="card-labels">
                          {card.labels.map((label) => (
                            <span
                              className="card-label"
                              key={label.id || label.name}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="card-open-icon">
                      ↗
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* CREATE / EDIT VIEW MODAL */}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="view-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editingViewId
                    ? "Edit saved view"
                    : "Create saved view"}
                </h2>

                <p>
                  Save your current filters for later.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveView}>
              <div className="filter-field">
                <label htmlFor="view-name">
                  View name
                </label>

                <input
                  id="view-name"
                  type="text"
                  placeholder="Example: My overdue cards"
                  value={viewName}
                  onChange={(event) =>
                    setViewName(event.target.value)
                  }
                  autoFocus
                  required
                />
              </div>

              <div className="modal-summary">
                <span>Current filters</span>

                <p>
                  {filter.member !== "any" &&
                    "Member selected · "}

                  {filter.dueDate !== "any" &&
                    `${filter.dueDate} · `}

                  {filter.labels.length > 0 &&
                    `${filter.labels.length} label(s) · `}

                  {filter.keyword &&
                    "Keyword selected · "}

                  {filter.cardType !== "any" &&
                    `${filter.cardType} cards · `}

                  {filter.member === "any" &&
                    filter.dueDate === "any" &&
                    filter.labels.length === 0 &&
                    !filter.keyword &&
                    filter.cardType === "any" &&
                    "No filters selected"}
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingViewId
                    ? "Update view"
                    : "Save view"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <span>
          Saved Filter Views
        </span>

        <span>
          {trelloReady
            ? "Connected to Trello"
            : "Not connected"}
        </span>
      </footer>
    </div>
  );
}
