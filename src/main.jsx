
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import {
  initializeTrello,
  getBoardInfo,
  getTrelloCards,
  getTrelloLists,
  getTrelloMembers,
  loadSavedViews,
  saveSavedViews,
  openTrelloCard
} from "./trello";

/* =========================================
   HELPERS
========================================= */

const emptyFilter = {
  members: "all",
  dueDate: "any",
  labels: [],
  cardType: "all",
  checklist: "any",
  attachment: "any",
  keyword: "",
  customFields: "any"
};

function createId() {
  return crypto.randomUUID();
}

function normalizeView(view) {
  return {
    id: view.id || createId(),
    name: view.name || "Untitled View",
    filters: {
      ...emptyFilter,
      ...(view.filters || {})
    }
  };
}

function isDueThisWeek(date) {
  if (!date) return false;

  const due = new Date(date);
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  return due >= start && due <= end;
}

function matchesFilters(card, filters, members) {
  const selectedMembers = filters.members;

  if (
    selectedMembers !== "all" &&
    selectedMembers !== "me" &&
    !card.members?.includes(selectedMembers)
  ) {
    return false;
  }

  if (selectedMembers === "me") {
    const currentMember = members.find(member => member.isMe);

    if (
      currentMember &&
      !card.members?.includes(currentMember.id)
    ) {
      return false;
    }
  }

  if (filters.dueDate === "week" && !isDueThisWeek(card.due)) {
    return false;
  }

  if (filters.dueDate === "overdue") {
    if (!card.due || new Date(card.due) >= new Date()) {
      return false;
    }
  }

  if (filters.dueDate === "noDue" && card.due) {
    return false;
  }

  if (filters.labels?.length) {
    const cardLabels = (card.labels || []).map(label =>
      typeof label === "string" ? label : label.name
    );

    const hasLabel = filters.labels.some(label =>
      cardLabels.includes(label)
    );

    if (!hasLabel) return false;
  }

  if (filters.cardType === "open" && card.closed) {
    return false;
  }

  if (filters.cardType === "closed" && !card.closed) {
    return false;
  }

  if (filters.checklist === "complete" && !card.checklistComplete) {
    return false;
  }

  if (filters.checklist === "incomplete" && card.checklistComplete) {
    return false;
  }

  if (filters.attachment === "yes" && !card.attachments?.length) {
    return false;
  }

  if (filters.attachment === "no" && card.attachments?.length) {
    return false;
  }

  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();

    const text = [
      card.name,
      card.title,
      card.desc,
      card.description
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!text.includes(keyword)) {
      return false;
    }
  }

  return true;
}

/* =========================================
   APP
========================================= */

function App() {
  const [trello, setTrello] = useState(false);

  const [board, setBoard] = useState(null);

  const [cards, setCards] = useState([]);

  const [lists, setLists] = useState([]);

  const [members, setMembers] = useState([]);

  const [savedViews, setSavedViews] = useState([]);

  const [activeFilters, setActiveFilters] = useState({
    ...emptyFilter
  });

  const [selectedView, setSelectedView] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showDropdown, setShowDropdown] = useState(true);

  const [showCreate, setShowCreate] = useState(false);

  const [editingView, setEditingView] = useState(null);

  const [renamingView, setRenamingView] = useState(null);

  const [deletingView, setDeletingView] = useState(null);

  const [viewName, setViewName] = useState("");

  const [formFilters, setFormFilters] = useState({
    ...emptyFilter
  });

  const [search, setSearch] = useState("");

  /* =========================================
     LOAD TRELLO DATA
  ========================================= */

  useEffect(() => {
    async function loadData() {
      try {
        const t = initializeTrello();

        if (!t) {
          setTrello(false);
          setLoading(false);
          return;
        }

        setTrello(true);

        const [
          boardData,
          cardData,
          listData,
          memberData,
          viewData
        ] = await Promise.all([
          getBoardInfo(),
          getTrelloCards(),
          getTrelloLists(),
          getTrelloMembers(),
          loadSavedViews()
        ]);

        setBoard(boardData);

        setCards(cardData || []);

        setLists(listData || []);

        setMembers(memberData || []);

        setSavedViews((viewData || []).map(normalizeView));
      } catch (err) {
        console.error(err);
        setError("Unable to load Trello board data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* =========================================
     FILTER CARDS
  ========================================= */

  const filteredCards = useMemo(() => {
    return cards.filter(card =>
      matchesFilters(card, activeFilters, members)
    );
  }, [cards, activeFilters, members]);

  /* =========================================
     SAVE VIEWS
  ========================================= */

  async function persistViews(nextViews) {
    setSavedViews(nextViews);

    try {
      if (trello) {
        await saveSavedViews(nextViews);
      } else {
        localStorage.setItem(
          "savedFilterViews",
          JSON.stringify(nextViews)
        );
      }
    } catch (err) {
      console.error("Saving views failed:", err);

      setError("Unable to save views to Trello.");
    }
  }

  /* =========================================
     CREATE FILTER
  ========================================= */

  function openCreate() {
    setViewName("");

    setFormFilters({
      ...emptyFilter,
      labels: []
    });

    setShowCreate(true);
  }

  async function createView() {
    if (!viewName.trim()) {
      alert("Please enter a view name.");
      return;
    }

    const newView = {
      id: createId(),
      name: viewName.trim(),
      filters: {
        ...formFilters,
        labels: [...formFilters.labels]
      }
    };

    await persistViews([...savedViews, newView]);

    setShowCreate(false);
  }

  /* =========================================
     APPLY VIEW
  ========================================= */

  function applyView(view) {
    setActiveFilters({
      ...emptyFilter,
      ...view.filters
    });

    setSelectedView(view.id);

    setShowDropdown(false);
  }

  /* =========================================
     EDIT VIEW
  ========================================= */

  function openEdit(view) {
    setEditingView(view);

    setViewName(view.name);

    setFormFilters({
      ...emptyFilter,
      ...view.filters
    });
  }

  async function updateView() {
    if (!viewName.trim()) {
      alert("Please enter a view name.");
      return;
    }

    const updatedViews = savedViews.map(view =>
      view.id === editingView.id
        ? {
            ...view,
            name: viewName.trim(),
            filters: {
              ...formFilters,
              labels: [...formFilters.labels]
            }
          }
        : view
    );

    await persistViews(updatedViews);

    setEditingView(null);
  }

  /* =========================================
     RENAME VIEW
  ========================================= */

  function openRename(view) {
    setRenamingView(view);

    setViewName(view.name);
  }

  async function renameView() {
    if (!viewName.trim()) {
      alert("Please enter a view name.");
      return;
    }

    const updatedViews = savedViews.map(view =>
      view.id === renamingView.id
        ? {
            ...view,
            name: viewName.trim()
          }
        : view
    );

    await persistViews(updatedViews);

    setRenamingView(null);
  }

  /* =========================================
     DELETE VIEW
  ========================================= */

  async function deleteView() {
    const updatedViews = savedViews.filter(
      view => view.id !== deletingView.id
    );

    await persistViews(updatedViews);

    if (selectedView === deletingView.id) {
      setSelectedView(null);
      setActiveFilters({ ...emptyFilter });
    }

    setDeletingView(null);
  }

  /* =========================================
     CLEAR FILTERS
  ========================================= */

  function clearFilters() {
    setActiveFilters({ ...emptyFilter });

    setSelectedView(null);
  }

  /* =========================================
     FORM FIELD
  ========================================= */

  function updateField(field, value) {
    setFormFilters(previous => ({
      ...previous,
      [field]: value
    }));
  }

  function toggleLabel(label) {
    setFormFilters(previous => {
      const labels = previous.labels || [];

      return {
        ...previous,
        labels: labels.includes(label)
          ? labels.filter(item => item !== label)
          : [...labels, label]
      };
    });
  }

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="loading">
        Loading Saved Filter Views...
      </div>
    );
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="app">

      <header className="header">
        <strong>Saved Filter Views</strong>

        <button
          className="icon-button"
          onClick={() => setShowDropdown(false)}
          aria-label="Close"
        >
          ×
        </button>
      </header>

      {!trello && (
        <div className="notice">
          Demo mode: open this Power-Up inside Trello
          to load real board data.
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* =====================================
           SAVED FILTER LIST
      ====================================== */}

      <section className="saved-list">

        <div className="list-header">
          <h3>Saved Filters</h3>

          <button
            className="icon-button"
            onClick={() => setShowDropdown(false)}
          >
            ×
          </button>
        </div>

        {savedViews.length === 0 && (
          <div className="empty">
            No saved filters yet.
            <br />
            Create your first filter.
          </div>
        )}

        {savedViews.map(view => (
          <div
            className={
              selectedView === view.id
                ? "saved-item active"
                : "saved-item"
            }
            key={view.id}
          >

            <button
              className="saved-main"
              onClick={() => applyView(view)}
            >

              <span className="saved-icon">
                ◇
              </span>

              <span className="saved-text">

                <strong>{view.name}</strong>

                <small>
                  {view.filters.keyword
                    ? `Keyword: ${view.filters.keyword}`
                    : view.filters.labels?.length
                    ? `Label: ${view.filters.labels.join(", ")}`
                    : view.filters.members === "me"
                    ? "Members: Me"
                    : view.filters.dueDate === "week"
                    ? "Due date: This week"
                    : "Custom filter"}
                </small>

              </span>

            </button>

            <div className="actions">

              <button
                className="icon-button"
                title="Edit"
                onClick={() => openEdit(view)}
              >
                ✎
              </button>

              <button
                className="icon-button"
                title="Rename"
                onClick={() => openRename(view)}
              >
                Aa
              </button>

              <button
                className="icon-button delete-action"
                title="Delete"
                onClick={() => setDeletingView(view)}
              >
                ⋯
              </button>

            </div>

          </div>
        ))}

        <button
          className="create-button"
          onClick={openCreate}
        >
          <span>＋</span>
          Create a filter
        </button>

      </section>

      {/* =====================================
           FILTERED CARDS
      ====================================== */}

      <section className="results">

        <div className="results-header">

          <strong>
            {board?.name || "Board Cards"}
          </strong>

          <span>
            {filteredCards.length} cards
          </span>

        </div>

        <input
          className="search-input"
          placeholder="Search cards..."
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        {filteredCards
          .filter(card =>
            (card.name || card.title || "")
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map(card => {

            const list = lists.find(
              item => item.id === card.listId
            );

            return (
              <button
                className="card-result"
                key={card.id}
                onClick={() => openTrelloCard(card.id)}
              >

                <strong>
                  {card.name || card.title}
                </strong>

                <small>
                  {list?.name || "Trello Card"}
                </small>

              </button>
            );
          })}

        {filteredCards.length === 0 && (
          <div className="empty">
            No matching cards.
          </div>
        )}

        <button
          className="clear-button"
          onClick={clearFilters}
        >
          Clear filters
        </button>

      </section>

      {/* =====================================
           CREATE / EDIT MODAL
      ====================================== */}

      {(showCreate || editingView) && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>
                {editingView
                  ? "Edit Saved View"
                  : "Create a Filter"}
              </h2>

              <button
                className="icon-button"
                onClick={() => {
                  setShowCreate(false);
                  setEditingView(null);
                }}
              >
                ×
              </button>

            </div>

            <p className="subtitle">
              Set filter conditions and save this view.
            </p>

            <label>
              Members
              <select
                value={formFilters.members}
                onChange={e =>
                  updateField("members", e.target.value)
                }
              >
                <option value="all">All members</option>
                <option value="me">Me</option>

                {members.map(member => (
                  <option
                    value={member.id}
                    key={member.id}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Due date
              <select
                value={formFilters.dueDate}
                onChange={e =>
                  updateField("dueDate", e.target.value)
                }
              >
                <option value="any">Any</option>
                <option value="week">This week</option>
                <option value="overdue">Overdue</option>
                <option value="noDue">No due date</option>
              </select>
            </label>

            <label>
              Labels
              <div className="label-options">

                {[...new Set(
                  cards.flatMap(card =>
                    (card.labels || []).map(label =>
                      typeof label === "string"
                        ? label
                        : label.name
                    )
                  )
                )].map(label => (

                  <button
                    key={label}
                    type="button"
                    className={
                      formFilters.labels.includes(label)
                        ? "label-chip selected"
                        : "label-chip"
                    }
                    onClick={() => toggleLabel(label)}
                  >
                    {label}
                  </button>

                ))}

              </div>
            </label>

            <label>
              Card type
              <select
                value={formFilters.cardType}
                onChange={e =>
                  updateField("cardType", e.target.value)
                }
              >
                <option value="all">All cards</option>
                <option value="open">Open cards</option>
                <option value="closed">Closed cards</option>
              </select>
            </label>

            <label>
              Checklist
              <select
                value={formFilters.checklist}
                onChange={e =>
                  updateField("checklist", e.target.value)
                }
              >
                <option value="any">Any</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </label>

            <label>
              Attachment
              <select
                value={formFilters.attachment}
                onChange={e =>
                  updateField("attachment", e.target.value)
                }
              >
                <option value="any">Any</option>
                <option value="yes">Has attachment</option>
                <option value="no">No attachment</option>
              </select>
            </label>

            <label>
              Keyword
              <input
                placeholder="Enter keyword"
                value={formFilters.keyword}
                onChange={e =>
                  updateField("keyword", e.target.value)
                }
              />
            </label>

            <label>
              View Name *
              <input
                placeholder="My Tasks"
                value={viewName}
                onChange={e =>
                  setViewName(e.target.value)
                }
              />
            </label>

            <div className="modal-actions">

              <button
                className="secondary-button"
                onClick={() => {
                  setShowCreate(false);
                  setEditingView(null);
                }}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={editingView
                  ? updateView
                  : createView}
              >
                {editingView
                  ? "Update View"
                  : "Save Filter"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================
           RENAME MODAL
      ====================================== */}

      {renamingView && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>Rename Saved View</h2>

              <button
                className="icon-button"
                onClick={() => setRenamingView(null)}
              >
                ×
              </button>

            </div>

            <label>
              View Name *
              <input
                value={viewName}
                onChange={e =>
                  setViewName(e.target.value)
                }
              />
            </label>

            <div className="modal-actions">

              <button
                className="secondary-button"
                onClick={() => setRenamingView(null)}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={renameView}
              >
                Rename
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================
           DELETE MODAL
      ====================================== */}

      {deletingView && (

        <div className="modal-overlay">

          <div className="modal delete-modal">

            <div className="delete-icon">
              🗑
            </div>

            <h2>Delete Saved View?</h2>

            <p>
              "{deletingView.name}" will be permanently
              deleted from your saved views.
            </p>

            <div className="modal-actions">

              <button
                className="secondary-button"
                onClick={() => setDeletingView(null)}
              >
                Cancel
              </button>

              <button
                className="danger-button"
                onClick={deleteView}
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

/* =========================================
   RENDER
========================================= */

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
