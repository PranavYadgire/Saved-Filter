
/* =========================================
   SAVED FILTER VIEWS
   TRELLO CONNECTION
========================================= */

const STORAGE_KEY = "savedFilterViews";

let trelloClient = null;

/* =========================================
   INITIALIZE TRELLO
========================================= */

export function initializeTrello() {
  if (!window.TrelloPowerUp) {
    console.warn("Trello Power-Up client is not loaded.");
    return null;
  }

  if (!trelloClient) {
    trelloClient = window.TrelloPowerUp.iframe();
  }

  return trelloClient;
}

/* =========================================
   CHECK TRELLO
========================================= */

export function isTrelloAvailable() {
  return Boolean(window.TrelloPowerUp);
}

/* =========================================
   BOARD INFORMATION
========================================= */

export async function getBoardInfo() {
  const t = initializeTrello();

  if (!t) return null;

  try {
    const board = await t.board("id", "name");

    return {
      id: board.id,
      name: board.name,
    };
  } catch (error) {
    console.error("Unable to load Trello board:", error);
    return null;
  }
}

/* =========================================
   LOAD REAL BOARD CARDS
========================================= */



export async function getTrelloCards() {
  const t = initializeTrello();

  if (!t) return [];

  try {
    const cards = await t.cards("all");

    // Safely inspect the data returned by Trello.
    console.log("Trello raw cards:", cards);
    console.log("Trello card count:", cards?.length);

console.log(
  "Card labels:",
  (cards || []).map((card) => ({
    title: card.name,
    labels: card.labels
  }))
);
    return (cards || []).map((card) => ({
      id: card.id || "",
      title: card.name || "",
      description: card.desc || "",
      listId: card.idList || "",
      members: Array.isArray(card.idMembers)
        ? card.idMembers
        : Array.isArray(card.members)
          ? card.members.map((member) =>
              typeof member === "string" ? member : member.id
            ).filter(Boolean)
          : [],
      labels: (card.labels || []).map((label) => ({
  id: label.id || "",
  name: (label.name || "").trim(),
  color: label.color || "",
})),
      due: card.due || null,
      dueComplete: Boolean(card.dueComplete),
      closed: Boolean(card.closed),
      url: card.url || "",
      attachments: card.attachments || [],
      badges: card.badges || {},
      checklists: card.checklists || [],
      customFieldItems: card.customFieldItems || [],
    }));
  } catch (error) {
    console.error("Unable to load Trello cards:", error);
    return [];
  }
}



/* =========================================
   LOAD BOARD LISTS
========================================= */

export async function getTrelloLists() {
  const t = initializeTrello();

  if (!t) return [];

  try {
    const lists = await t.lists(
      "id",
      "name",
      "closed"
    );

    return lists
      .filter((list) => !list.closed)
      .map((list) => ({
        id: list.id,
        name: list.name,
      }));
  } catch (error) {
    console.error("Unable to load Trello lists:", error);
    return [];
  }
}

/* =========================================
   LOAD BOARD MEMBERS
========================================= */

export async function getTrelloMembers() {
  const t = initializeTrello();

  if (!t) return [];

  try {
    const members = await t.members("all");

    return members.map((member) => ({
      id: member.id,
      name: member.fullName || member.username || "",
      username: member.username || "",
    }));
  } catch (error) {
    console.error("Unable to load Trello members:", error);
    return [];
  }
}

/* =========================================
   LOAD BOARD LABELS
========================================= */

export async function getTrelloLabels() {
  const t = initializeTrello();

  if (!t) return [];

  try {
    const labels = await t.board(
      "id",
      "name",
      "labelNames"
    );

    return Object.entries(labels.labelNames || {})
      .filter(([name]) => Boolean(name))
      .map(([name, color]) => ({
        name,
        color: color || "",
      }));
  } catch (error) {
    console.error("Unable to load Trello labels:", error);
    return [];
  }
}

/* =========================================
   LOAD SAVED FILTER VIEWS
   BOARD SHARED STORAGE
========================================= */

export async function loadSavedViews() {
  const t = initializeTrello();

  if (!t) return [];

  try {
    const views = await t.get(
      "board",
      "shared",
      STORAGE_KEY
    );

    return Array.isArray(views) ? views : [];
  } catch (error) {
    console.error("Unable to load saved views:", error);
    return [];
  }
}

/* =========================================
   SAVE FILTER VIEWS
   BOARD SHARED STORAGE
========================================= */

export async function saveSavedViews(views) {
  const t = initializeTrello();

  if (!t) {
    throw new Error(
      "Trello is not available. Open this Power-Up inside Trello."
    );
  }

  if (!Array.isArray(views)) {
    throw new Error("Saved views must be an array.");
  }

  await t.set(
    "board",
    "shared",
    STORAGE_KEY,
    views
  );

  return views;
}

/* =========================================
   OPEN TRELLO CARD
========================================= */

export async function openTrelloCard(cardId) {
  const t = initializeTrello();

  if (!t || !cardId) return;

  try {
    await t.showCard(cardId);
  } catch (error) {
    console.error("Unable to open Trello card:", error);
  }
}

/* =========================================
   GET CURRENT MEMBER
========================================= */

export async function getCurrentMember() {
  const t = initializeTrello();

  if (!t) return null;

  try {
    const member = await t.member(
      "id",
      "fullName",
      "username"
    );

    return {
      id: member.id,
      name: member.fullName || "",
      username: member.username || "",
    };
  } catch (error) {
    console.error("Unable to load current member:", error);
    return null;
  }
}

/* =========================================
   GET CARD COUNTS
========================================= */

export async function getBoardCardCounts() {
  const cards = await getTrelloCards();

  return {
    total: cards.length,

    open: cards.filter(
      (card) => !card.closed
    ).length,

    completed: cards.filter(
      (card) => card.closed
    ).length,
  };
}

/* =========================================
   APPLY FILTER TO REAL BOARD CARDS
========================================= */

/* =========================================
   APPLY FILTER TO TRELLO CARDS
========================================= */

export function filterTrelloCards(cards, filters = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const monthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1
  );

  return (cards || []).filter((card) => {
    /* =====================================
       MEMBER FILTER
    ===================================== */

    const members = card.members || [];

    if (filters.member === "me") {
      if (!filters.currentMemberId) {
        return false;
      }

      if (!members.includes(filters.currentMemberId)) {
        return false;
      }
    } else if (
      filters.member &&
      filters.member !== "any"
    ) {
      if (!members.includes(filters.member)) {
        return false;
      }
    }

    /* =====================================
       DUE DATE FILTER
    ===================================== */

    if (
      filters.dueDate &&
      filters.dueDate !== "any"
    ) {
      const due = card.due
        ? new Date(card.due)
        : null;

      if (filters.dueDate === "none" && due) {
        return false;
      }

      if (
        filters.dueDate !== "none" &&
        (!due || Number.isNaN(due.getTime()))
      ) {
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
          filters.dueDate === "month" &&
          (due < monthStart || due >= monthEnd)
        ) {
          return false;
        }

        if (
          filters.dueDate === "overdue" &&
          (due >= today || card.dueComplete)
        ) {
          return false;
        }
      }
    }

    /* =====================================
       LABEL FILTER
    ===================================== */

    const cardLabels = (card.labels || []).map(
      (label) =>
        (label.name || "").trim().toLowerCase()
    );

    const selectedLabels = (
      filters.labels || []
    ).map((label) =>
      (
        typeof label === "string"
          ? label
          : label.name || ""
      )
        .trim()
        .toLowerCase()
    );

    if (selectedLabels.length > 0) {
      const hasLabel = selectedLabels.some(
        (label) => cardLabels.includes(label)
      );

      if (!hasLabel) {
        return false;
      }
    }

    /* =====================================
       CARD TYPE FILTER
    ===================================== */

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

    /* =====================================
       KEYWORD FILTER
    ===================================== */

    if (filters.keyword?.trim()) {
      const keyword = filters.keyword
        .trim()
        .toLowerCase();

      const title = (
        card.title || ""
      ).toLowerCase();

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

    /* =====================================
       ATTACHMENT FILTER
    ===================================== */

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

    /* =====================================
       CHECKLIST FILTER
    ===================================== */

    if (
      filters.checklist &&
      filters.checklist !== "any"
    ) {
      const checklists = card.checklists || [];

      if (checklists.length === 0) {
        return false;
      }

      const items = checklists.flatMap(
        (checklist) =>
          checklist.checkItems || []
      );

      if (items.length === 0) {
        return false;
      }

      const completedItems = items.filter(
        (item) => item.state === "complete"
      ).length;

      const allComplete =
        completedItems === items.length;

      if (
        filters.checklist === "complete" &&
        !allComplete
      ) {
        return false;
      }

      if (
        filters.checklist === "incomplete" &&
        allComplete
      ) {
        return false;
      }
    }

    /* =====================================
       CUSTOM FIELD FILTER
    ===================================== */

    if (
      filters.customFields &&
      filters.customFields !== "any"
    ) {
      const customFieldItems =
        card.customFieldItems || [];

      if (customFieldItems.length === 0) {
        return false;
      }

      const hasValue = customFieldItems.some(
        (item) =>
          item.value &&
          Object.values(item.value).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              value !== ""
          )
      );

      if (
        filters.customFields === "complete" &&
        !hasValue
      ) {
        return false;
      }

      if (
        filters.customFields === "incomplete" &&
        hasValue
      ) {
        return false;
      }
    }

    /* =====================================
       CARD MATCHES ALL SELECTED CONDITIONS
    ===================================== */

    return true;
  });
}


   