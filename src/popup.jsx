
import React, { useEffect, useState } from "react";

import {
  getTrelloCards,
  getTrelloMembers,
  loadSavedViews,
  saveSavedViews,
  openTrelloCard,
} from "./trello";

const EMPTY_FILTER = {
  member: "any",
  dueDate: "any",
  labels: [],
  cardType: "all",
  checklist: "any",
  attachment: "any",
  keyword: "",
  customFields: "any",
};

const DEFAULT_FILTERS = [
  {
    id: "my-tasks",
    name: "My Tasks",
    icon: "👤",
    filters: {
      ...EMPTY_FILTER,
      member: "me",
    },
  },
  {
    id: "due-week",
    name: "Due This Week",
    icon: "▣",
    filters: {
      ...EMPTY_FILTER,
      dueDate: "week",
    },
  },
  {
    id: "bugs",
    name: "Bugs",
    icon: "◇",
    filters: {
      ...EMPTY_FILTER,
      labels: ["Bug"],
    },
  },
  {
    id: "high-priority",
    name: "High Priority",
    icon: "◇",
    filters: {
      ...EMPTY_FILTER,
      labels: ["High Priority"],
    },
  },
];

const LABELS = [
  "Bug",
  "High Priority",
  "Feature",
  "Design",
  "Documentation",
];

function createId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function getFilterDescription(filters = EMPTY_FILTER) {
  const parts = [];

  if (filters.member === "me") {
    parts.push("Members: Me");
  } else if (filters.member !== "any") {
    parts.push("Members: " + filters.member);
  }

  if (filters.dueDate !== "any") {
    const dueLabels = {
      today: "Today",
      week: "This week",
      overdue: "Overdue",
      month: "This month",
      none: "No due date",
    };

    parts.push(
      "Due date: " +
        (dueLabels[filters.dueDate] || filters.dueDate)
    );
  }

  if (filters.labels?.length) {
    parts.push("Label: " + filters.labels.join(", "));
  }

  if (filters.cardType !== "all") {
    parts.push("Card type: " + filters.cardType);
  }

  if (filters.keyword?.trim()) {
    parts.push("Keyword: " + filters.keyword);
  }

  return parts.length ? parts.join(" · ") : "All cards";
}

function normalizeFilters(filters = {}) {
  return {
    ...EMPTY_FILTER,
    ...filters,
    labels: Array.isArray(filters.labels)
      ? filters.labels
      : [],
  };
}

function Popup() {
  const [savedFilters, setSavedFilters] = useState([]);
  const [cards, setCards] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);

  const [activeFilter, setActiveFilter] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState(null);

  const [modal, setModal] = useState(null);
  const [editingFilter, setEditingFilter] = useState(null);
  const [menuFilter, setMenuFilter] = useState(null);

  const [filterForm, setFilterForm] = useState({
    name: "",
    ...EMPTY_FILTER,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =====================================
     LOAD REAL TRELLO DATA
  ===================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          trelloCards,
          trelloMembers,
          storedViews,
        ] = await Promise.all([
          getTrelloCards(),
          getTrelloMembers(),
          loadSavedViews(),
        ]);

        if (cancelled) return;

        setCards(trelloCards || []);
        setMembers(trelloMembers || []);

        const me = await loadCurrentMember();

        if (cancelled) return;

        setCurrentMember(me);

        const existingViews = Array.isArray(storedViews)
          ? storedViews
          : [];

        const initialViews =
          existingViews.length > 0
            ? existingViews
            : DEFAULT_FILTERS;

        setSavedFilters(initialViews);

        if (existingViews.length === 0) {
          await saveSavedViews(DEFAULT_FILTERS);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load Trello data. Open this Power-Up inside Trello."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadCurrentMember() {
      try {
        const { getCurrentMember } = await import("./trello");

        return await getCurrentMember();
      } catch (err) {
        console.error("Unable to load current member:", err);
        return null;
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================
     SAVE VIEWS TO TRELLO
  ===================================== */

  async function persistViews(updatedViews) {
    setSaving(true);
    setError("");

    try {
      await saveSavedViews(updatedViews);
      setSavedFilters(updatedViews);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to save filters to Trello board storage."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================
     APPLY FILTER TO REAL CARDS
  ===================================== */

  const matchingCards = React.useMemo(() => {
    if (!appliedFilters) {
      return [];
    }

    const filters = normalizeFilters(appliedFilters);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    return cards.filter((card) => {
      /* MEMBER */

      if (filters.member === "me") {
        if (!currentMember?.id) {
          return false;
        }

        if (
          !(card.members || []).includes(currentMember.id)
        ) {
          return false;
        }
      } else if (filters.member !== "any") {
        if (
          !(card.members || []).includes(filters.member)
        ) {
          return false;
        }
      }

      /* DUE DATE */

      const due = card.due
        ? new Date(card.due)
        : null;

      if (filters.dueDate === "none" && due) {
        return false;
      }

      if (filters.dueDate !== "none" &&
          filters.dueDate !== "any" &&
          !due) {
        return false;
      }

      if (due) {
        due.setHours(0, 0, 0, 0);

        if (
          filters.dueDate === "today" &&
          due.getTime() !== today.getTime()
        ) {
          return false;
        }

        if (
          filters.dueDate === "week" &&
          (due < today || due >= weekEnd)
        ) {
          return false;
        }

        if (
          filters.dueDate === "overdue" &&
          (due >= today || card.dueComplete)
        ) {
          return false;
        }

        if (filters.dueDate === "month") {
          const monthEnd = new Date(today);
          monthEnd.setMonth(monthEnd.getMonth() + 1);

          if (due < today || due >= monthEnd) {
            return false;
          }
        }
      }

      /* LABELS */

      if (filters.labels.length > 0) {
        const cardLabels = (card.labels || []).map(
          (label) =>
            typeof label === "string"
              ? label
              : label.name
        );

        if (
          !filters.labels.some((label) =>
            cardLabels.includes(label)
          )
        ) {
          return false;
        }
      }

      /* OPEN / CLOSED */

      if (
        filters.cardType === "open" &&
        card.closed
      ) {
        return false;
      }

      if (
        filters.cardType === "closed" &&
        !card.closed
      ) {
        return false;
      }

      /* ATTACHMENTS */

      const attachments = card.attachments || [];

      if (
        filters.attachment === "yes" &&
        attachments.length === 0
      ) {
        return false;
      }

      if (
        filters.attachment === "no" &&
        attachments.length > 0
      ) {
        return false;
      }

      /* CHECKLIST */

      if (filters.checklist !== "any") {
        const checklists = card.checklists || [];

        if (checklists.length === 0) {
          return false;
        }

        const total = checklists.reduce(
          (sum, checklist) =>
            sum +
            (checklist.checkItems?.length || 0),
          0
        );

        const completed = checklists.reduce(
          (sum, checklist) =>
            sum +
            (checklist.checkItems || []).filter(
              (item) => item.state === "complete"
            ).length,
          0
        );

        if (
          filters.checklist === "complete" &&
          (total === 0 || completed !== total)
        ) {
          return false;
        }

        if (
          filters.checklist === "incomplete" &&
          (total === 0 || completed === total)
        ) {
          return false;
        }
      }

      /* KEYWORD */

      const keyword = filters.keyword?.trim().toLowerCase();

      if (keyword) {
        const title = (card.title || "").toLowerCase();

        const description = (
          card.description || ""
        ).toLowerCase();

        if (
          !title.includes(keyword) &&
          !description.includes(keyword)
        ) {
          return false;
        }
      }

      /* SEARCH */

      if (search.trim()) {
        const query = search.trim().toLowerCase();

        if (
          !(card.title || "").toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [cards, appliedFilters, currentMember, search]);

  /* =====================================
     OPEN CREATE MODAL
  ===================================== */

  function openCreateModal() {
    setEditingFilter(null);

    setFilterForm({
      name: "",
      ...EMPTY_FILTER,
      labels: [],
    });

    setError("");
    setModal("create");
  }

  /* =====================================
     OPEN EDIT MODAL
  ===================================== */

  function openEditModal(filter) {
    setEditingFilter(filter);

    setFilterForm({
      name: filter.name,
      ...normalizeFilters(filter.filters),
    });

    setError("");
    setMenuFilter(null);
    setModal("edit");
  }

  /* =====================================
     OPEN RENAME MODAL
  ===================================== */

  function openRenameModal(filter) {
    setEditingFilter(filter);

    setFilterForm({
      name: filter.name,
      ...normalizeFilters(filter.filters),
    });

    setError("");
    setMenuFilter(null);
    setModal("rename");
  }

  function closeModal() {
    setModal(null);
    setEditingFilter(null);
    setError("");
  }

  /* =====================================
     UPDATE FORM
  ===================================== */

  function updateForm(field, value) {
    setFilterForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function toggleLabel(label) {
    setFilterForm((previous) => {
      const exists = previous.labels.includes(label);

      return {
        ...previous,
          labels: exists
            ? previous.labels.filter(
                (item) => item !== label
              )
            : [...previous.labels, label],
      };
    });
  }

  /* =====================================
     SAVE / UPDATE FILTER
  ===================================== */

  async function saveFilter() {
    const name = filterForm.name.trim();

    if (!name) {
      setError("Please enter a filter name.");
      return;
    }

    const duplicate = savedFilters.some(
      (filter) =>
        filter.name.toLowerCase() === name.toLowerCase() &&
        filter.id !== editingFilter?.id
    );

    if (duplicate) {
      setError("A filter with this name already exists.");
      return;
    }

    const newFilter = {
      id: editingFilter?.id || createId(),
      name,
      icon: editingFilter?.icon || "◇",
      filters: normalizeFilters(filterForm),
    };

    const updatedViews = editingFilter
      ? savedFilters.map((filter) =>
          filter.id === editingFilter.id
            ? newFilter
            : filter
        )
      : [...savedFilters, newFilter];

    await persistViews(updatedViews);

    setActiveFilter(newFilter);
    setAppliedFilters(newFilter.filters);

    closeModal();
  }

  /* =====================================
     RENAME FILTER
  ===================================== */

  async function renameFilter() {
    const name = filterForm.name.trim();

    if (!name) {
      setError("Please enter a filter name.");
      return;
    }

    const duplicate = savedFilters.some(
      (filter) =>
        filter.name.toLowerCase() === name.toLowerCase() &&
        filter.id !== editingFilter?.id
    );

    if (duplicate) {
      setError("A filter with this name already exists.");
      return;
    }

    const updatedViews = savedFilters.map((filter) =>
      filter.id === editingFilter.id
        ? { ...filter, name }
        : filter
    );

    await persistViews(updatedViews);

    if (activeFilter?.id === editingFilter.id) {
      setActiveFilter({
        ...activeFilter,
        name,
      });
    }

    closeModal();
  }

  /* =====================================
     DELETE FILTER
  ===================================== */

  async function deleteFilter() {
    if (!editingFilter) return;

    const updatedViews = savedFilters.filter(
      (filter) => filter.id !== editingFilter.id
    );

    await persistViews(updatedViews);

    if (activeFilter?.id === editingFilter.id) {
      setActiveFilter(null);
      setAppliedFilters(null);
    }

    closeModal();
  }

  /* =====================================
     APPLY FILTER
  ===================================== */

  function applyFilter(filter) {
    setActiveFilter(filter);

    setAppliedFilters(
      normalizeFilters(filter.filters)
    );

    setSearch("");

    setMenuFilter(null);
  }

  /* =====================================
     CLEAR FILTER
  ===================================== */

  function clearFilters() {
    setActiveFilter(null);
    setAppliedFilters(null);
    setSearch("");
  }

  /* =====================================
     SELECT CONTROL
  ===================================== */

  function renderSelect(field, label, options) {
    return (
      <label className="filter-field" key={field}>
        <span className="field-label">{label}</span>

        <select
          value={filterForm[field] || "any"}
          onChange={(event) =>
            updateForm(field, event.target.value)
          }
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  /* =====================================
     LOADING
  ===================================== */

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>Saved Filter Views</h1>
        </header>

        <div className="empty">
          Loading Trello cards...
        </div>
      </div>
    );
  }

  /* =====================================
     MAIN UI
  ===================================== */

  return (
    <div className="app">
      <header className="header">
        <h1>Saved Filter Views</h1>

        <button
          className="icon-button"
          title="Close"
          onClick={() => {
            window.parent.postMessage(
              { type: "SAVED_FILTERS_CLOSE" },
              "*"
            );
          }}
        >
          ×
        </button>
      </header>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <main className="saved-list">
        <div className="list-header">
          <h3>Saved Filters</h3>

          <button
            className="icon-button"
            title="Clear filter"
            onClick={clearFilters}
          >
            ×
          </button>
        </div>

        {savedFilters.map((filter) => (
          <div
            className={
              "saved-item" +
              (activeFilter?.id === filter.id
                ? " active"
                : "")
            }
            key={filter.id}
          >
            <button
              className="saved-main"
              onClick={() => applyFilter(filter)}
              title="Apply saved filter"
            >
              <span className="saved-icon">
                {filter.icon || "◇"}
              </span>

              <span className="saved-text">
                <strong>{filter.name}</strong>

                <small>
                  {getFilterDescription(filter.filters)}
                </small>
              </span>
            </button>

            <div className="actions">
              <button
                className="icon-button"
                title="More options"
                onClick={() =>
                  setMenuFilter(
                    menuFilter === filter.id
                      ? null
                      : filter.id
                  )
                }
              >
                ⋯
              </button>
            </div>

            
<div className="item-menu-wrapper">
  <button
    className="item-menu-trigger"
    type="button"
    aria-label="Filter options"
    onClick={(e) => {
      e.stopPropagation();
      setMenuFilter(
        menuFilter === filter.id ? null : filter.id
      );
    }}
  >
    ⋯
  </button>

  {menuFilter === filter.id && (
    <div
      className="item-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          setMenuFilter(null);
          openEditModal(filter);
        }}
      >
        <span>✎</span>
        Edit
      </button>

      <button
        type="button"
        onClick={() => {
          setMenuFilter(null);
          openRenameModal(filter);
        }}
      >
        <span>▧</span>
        Rename
      </button>

      <button
        type="button"
        className="delete-menu-item"
        onClick={() => {
          setEditingFilter(filter);
          setMenuFilter(null);
          setModal("delete");
        }}
      >
        <span>🗑</span>
        Delete
      </button>
    </div>
  )}
</div>

          </div>
        ))}

        <button
          className="create-button"
          onClick={openCreateModal}
        >
          <span>＋</span>
          Create a filter
        </button>

        {/* ACTIVE FILTER */}

        {activeFilter && (
          <div className="active-filter">
            <span>
              Active: <strong>{activeFilter.name}</strong>
            </span>

            <button
              className="clear-button"
              onClick={clearFilters}
            >
              Clear filter
            </button>
          </div>
        )}

        {/* ACTUAL TRELLO CARD RESULTS */}

        {activeFilter && (
          <section className="filter-results">
            <div className="list-header">
              <h3>
                Matching Cards ({matchingCards.length})
              </h3>
            </div>

            <input
              type="text"
              placeholder="Search matching cards..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {matchingCards.length === 0 ? (
              <div className="empty">
                <strong>No matching cards</strong>

                <p>
                  No Trello cards match this filter.
                  Try another filter or clear it.
                </p>
              </div>
            ) : (
              matchingCards.map((card) => (
                <button
                  className="matching-card"
                  key={card.id}
                  onClick={() => openTrelloCard(card.id)}
                >
                  <strong>{card.title}</strong>

                  {card.due && (
                    <small>
                      Due:{" "}
                      {new Date(card.due).toLocaleDateString()}
                    </small>
                  )}

                  {card.labels?.length > 0 && (
                    <small>
                      Labels:{" "}
                      {card.labels
                        .map((label) =>
                          typeof label === "string"
                            ? label
                            : label.name
                        )
                        .join(", ")}
                    </small>
                  )}
                </button>
              ))
            )}
          </section>
        )}

        {saving && (
          <div className="empty">
            Saving filters...
          </div>
        )}
      </main>

      {/* CREATE / EDIT / RENAME / DELETE MODAL */}

      {modal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2>
                {modal === "create" && "Create a Filter"}
                {modal === "edit" && "Edit Saved View"}
                {modal === "rename" && "Rename Saved View"}
                {modal === "delete" && "Delete Saved View?"}
              </h2>

              <button
                className="icon-button"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {modal === "delete" ? (
              <div className="delete-modal">
                <p>
                  Are you sure you want to permanently delete
                  <strong>
                  {" "}"{editingFilter?.name}"
                  </strong>?
                </p>

                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    className="danger-button"
                    onClick={deleteFilter}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="subtitle">
                  Set filter conditions and save your view.
                </p>

                <label>
                  View Name *

                  <input
                    type="text"
                    placeholder="Enter filter name"
                    value={filterForm.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    autoFocus
                  />
                </label>

                {modal !== "rename" && (
                  <div className="filter-settings">
                    <h3>Filter Settings</h3>

                    {renderSelect("member", "Members", [
                      { value: "any", label: "Any member" },
                      { value: "me", label: "Me" },
                      ...members.map((member) => ({
                        value: member.id,
                        label: member.name,
                      })),
                    ])}

                    {renderSelect("dueDate", "Due date", [
                      { value: "any", label: "Any due date" },
                      { value: "today", label: "Today" },
                      { value: "week", label: "This week" },
                      { value: "overdue", label: "Overdue" },
                      { value: "month", label: "This month" },
                      { value: "none", label: "No due date" },
                    ])}

                    <div className="filter-field">
                      <span className="field-label">
                        Labels
                      </span>

                      <div className="label-options">
                        {LABELS.map((label) => (
                          <button
                            type="button"
                            key={label}
                            className={
                              "label-chip" +
                              (filterForm.labels.includes(label)
                                ? " selected"
                                : "")
                            }
                            onClick={() => toggleLabel(label)}
                          >
                            {label}

                            {filterForm.labels.includes(label)
                              ? " ✓"
                              : ""}
                          </button>
                        ))}
                      </div>
                    </div>

                    {renderSelect("cardType", "Card type", [
                      { value: "all", label: "All cards" },
                      { value: "open", label: "Open cards" },
                      { value: "closed", label: "Archived cards" },
                    ])}

                    {renderSelect("checklist", "Checklist", [
                      { value: "any", label: "Any" },
                      { value: "complete", label: "Complete" },
                      { value: "incomplete", label: "Incomplete" },
                    ])}

                    {renderSelect("attachment", "Attachment", [
                      { value: "any", label: "Any" },
                      { value: "yes", label: "Has attachment" },
                      { value: "no", label: "No attachment" },
                    ])}

                    <label>
                      Keyword

                      <input
                        type="text"
                        placeholder="Enter keyword"
                        value={filterForm.keyword}
                        onChange={(event) =>
                          updateForm("keyword", event.target.value)
                        }
                      />
                    </label>
                  </div>
                )}

                {error && (
                  <div className="error">
                    {error}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    className="primary-button"
                    disabled={saving}
                    onClick={
                      modal === "rename"
                        ? renameFilter
                        : saveFilter
                    }
                  >
                    {saving
                      ? "Saving..."
                      : modal === "create"
                      ? "Save Filter"
                      : modal === "edit"
                      ? "Update View"
                      : "Rename"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Popup;
