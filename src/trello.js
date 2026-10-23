
const STORAGE_KEY = "savedFilterViews";

let trelloClient = null;

/**
 * Initialize Trello Power-Up client.
 */
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

/**
 * Check whether the app is running inside Trello.
 */
export function isTrelloAvailable() {
  return Boolean(window.TrelloPowerUp);
}

/**
 * Get current Trello board information.
 */
export async function getBoardInfo() {
  const t = initializeTrello();

  if (!t) {
    return null;
  }

  try {
    const board = await t.board("id", "name");

    return {
      id: board.id,
      name: board.name
    };
  } catch (error) {
    console.error("Unable to load Trello board:", error);
    return null;
  }
}

/**
 * Load real Trello cards.
 */
export async function getTrelloCards() {
  const t = initializeTrello();

  if (!t) {
    return [];
  }

  try {
    const cards = await t.cards(
      "id",
      "name",
      "desc",
      "idList",
      "idMembers",
      "labels",
      "due",
      "closed",
      "url"
    );

    return cards.map(card => ({
      id: card.id,
      title: card.name,
      description: card.desc || "",
      listId: card.idList,
      members: card.idMembers || [],
      labels: (card.labels || []).map(label => label.name),
      due: card.due || "",
      closed: Boolean(card.closed),
      url: card.url
    }));
  } catch (error) {
    console.error("Unable to load Trello cards:", error);
    return [];
  }
}

/**
 * Load board lists.
 */
export async function getTrelloLists() {
  const t = initializeTrello();

  if (!t) {
    return [];
  }

  try {
    const lists = await t.lists("id", "name", "closed");

    return lists
      .filter(list => !list.closed)
      .map(list => ({
        id: list.id,
        name: list.name
      }));
  } catch (error) {
    console.error("Unable to load Trello lists:", error);
    return [];
  }
}

/**
 * Load board members.
 */
export async function getTrelloMembers() {
  const t = initializeTrello();

  if (!t) {
    return [];
  }

  try {
    const members = await t.members("all");

    return members.map(member => ({
      id: member.id,
      name: member.fullName,
      username: member.username
    }));
  } catch (error) {
    console.error("Unable to load Trello members:", error);
    return [];
  }
}

/**
 * Load saved filters from Trello board storage.
 */
export async function loadSavedViews() {
  const t = initializeTrello();

  if (!t) {
    return [];
  }

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

/**
 * Save filters to Trello board storage.
 */
export async function saveSavedViews(views) {
  const t = initializeTrello();

  if (!t) {
    throw new Error("Trello is not available.");
  }

  await t.set(
    "board",
    "shared",
    STORAGE_KEY,
    views
  );

  return views;
}

/**
 * Open a real Trello card.
 */
export async function openTrelloCard(cardId) {
  const t = initializeTrello();

  if (!t) {
    return;
  }

  await t.showCard(cardId);
}
