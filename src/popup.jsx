
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "saved-filter-views";

const DEFAULT_FILTERS = [
  {
    id: "my-tasks",
    name: "My Tasks",
    icon: "👤",
    filters: {
      member: "me",
      dueDate: "any",
      labels: [],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
  {
    id: "due-week",
    name: "Due This Week",
    icon: "▣",
    filters: {
      member: "any",
      dueDate: "week",
      labels: [],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
  {
    id: "bugs",
    name: "Bugs",
    icon: "◇",
    filters: {
      member: "any",
      dueDate: "any",
      labels: ["Bug"],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
  {
    id: "high-priority",
    name: "High Priority",
    icon: "◇",
    filters: {
      member: "any",
      dueDate: "any",
      labels: ["High Priority"],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
];

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

function getInitialFilters() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Unable to load saved filters:", error);
  }

  return DEFAULT_FILTERS;
}

function getFilterDescription(filters) {
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

function Popup() {
  const [savedFilters, setSavedFilters] = useState(
    getInitialFilters
  );

  const [modal, setModal] = useState(null);

  const [editingFilter, setEditingFilter] = useState(null);

  const [menuFilter, setMenuFilter] = useState(null);

  const [activeFilter, setActiveFilter] = useState(null);

  const [filterForm, setFilterForm] = useState({
    name: "",
    ...EMPTY_FILTER,
  });

  const [error, setError] = useState("");

  const [appliedFilters, setAppliedFilters] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedFilters)
      );
    } catch (error) {
      console.error("Unable to save filters:", error);
    }
  }, [savedFilters]);

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

  function openEditModal(filter) {
    setEditingFilter(filter);

    setFilterForm({
      name: filter.name,
      ...EMPTY_FILTER,
      ...filter.filters,
      labels: [...(filter.filters.labels || [])],
    });

    setError("");
    setMenuFilter(null);
    setModal("edit");
  }

  function openRenameModal(filter) {
    setEditingFilter(filter);

    setFilterForm({
      name: filter.name,
      ...EMPTY_FILTER,
      ...filter.filters,
      labels: [...(filter.filters.labels || [])],
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
            ? previous.labels.filter((item) => item !== label)
            : [...previous.labels, label],
      };
    });
  }

  function saveFilter() {
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
      filters: {
        member: filterForm.member,
        dueDate: filterForm.dueDate,
        labels: [...filterForm.labels],
        cardType: filterForm.cardType,
        checklist: filterForm.checklist,
        attachment: filterForm.attachment,
        keyword: filterForm.keyword,
        customFields: filterForm.customFields,
      },
    };

    if (editingFilter) {
      setSavedFilters((previous) =>
        previous.map((filter) =>
          filter.id === editingFilter.id ? newFilter : filter
        )
      );
    } else {
      setSavedFilters((previous) => [
        ...previous,
        newFilter,
      ]);
    }

    closeModal();
  }

  function renameFilter() {
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

    setSavedFilters((previous) =>
      previous.map((filter) =>
        filter.id === editingFilter.id
          ? { ...filter, name }
          : filter
      )
    );

    closeModal();
  }

  function deleteFilter() {
    if (!editingFilter) return;

    setSavedFilters((previous) =>
      previous.filter(
        (filter) => filter.id !== editingFilter.id
      )
    );

    if (activeFilter?.id === editingFilter.id) {
      setActiveFilter(null);
      setAppliedFilters(null);
    }

    closeModal();
  }

  function applyFilter(filter) {
    setActiveFilter(filter);

    setAppliedFilters({
      ...filter.filters,
      labels: [...(filter.filters.labels || [])],
    });

    setMenuFilter(null);
  }

  function clearFilters() {
    setActiveFilter(null);
    setAppliedFilters(null);
  }

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

      {error && !modal && (
        <div className="error">{error}</div>
      )}

      <main className="saved-list">
        <div className="list-header">
          <h3>Saved Filters</h3>

          <button
            className="icon-button"
            title="Close saved filters"
            onClick={clearFilters}
          >
            ×
          </button>
        </div>

        {savedFilters.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 28, marginBottom: 8 }}>
              ◇
            </div>

            <strong>No saved filters yet</strong>

            <p>
              Create a filter to quickly find the cards you need.
            </p>
          </div>
        ) : (
          savedFilters.map((filter) => (
            <div
              className={
                "saved-item" +
                (activeFilter?.id === filter.id ? " active" : "")
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

              {menuFilter === filter.id && (
                <div className="item-menu">
                  <button onClick={() => openEditModal(filter)}>
                    ✎ Edit
                  </button>

                  <button onClick={() => openRenameModal(filter)}>
                    ▧ Rename
                  </button>

                  <button
                    className="delete-menu-item"
                    onClick={() => {
                      setEditingFilter(filter);
                      setMenuFilter(null);
                      setModal("delete");
                    }}
                  >
                    🗑 Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        <button
          className="create-button"
          onClick={openCreateModal}
        >
          <span>＋</span>
          Create a filter
        </button>

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
      </main>

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
                <div className="delete-icon">♲</div>

                <p>
                  Are you sure you want to permanently delete
                  <strong> "{editingFilter?.name}"</strong>?
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
                  {modal === "rename"
                    ? "Update the name of your saved view."
                    : "Set filter conditions and save your view for quick access."}
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
                      <span className="field-label">Labels</span>

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
                        placeholder="Enter keyword (optional)"
                        value={filterForm.keyword}
                        onChange={(event) =>
                          updateForm("keyword", event.target.value)
                        }
                      />
                    </label>

                    {renderSelect(
                      "customFields",
                      "Custom fields",
                      [
                        { value: "any", label: "Any" },
                        {
                          value: "complete",
                          label: "Complete",
                        },
                        {
                          value: "incomplete",
                          label: "Incomplete",
                        },
                      ]
                    )}
                  </div>
                )}

                {error && <div className="error">{error}</div>}

                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    className="primary-button"
                    onClick={
                      modal === "rename"
                        ? renameFilter
                        : saveFilter
                    }
                  >
                    {modal === "create" && "Save Filter"}
                    {modal === "edit" && "Update View"}
                    {modal === "rename" && "Rename"}
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
