
/* ==========================================
   SAVED FILTER VIEWS
   TRELLO POWER-UP CONNECTOR
========================================== */

const POWERUP_NAME = "Saved Filter Views";

const POWERUP_ICON =
  "https://savedfilter.vercel.app/favicon.ico";

/* ==========================================
   POPUP URL
========================================== */

const APP_URL = new URL(
  "/popup.html",
  window.location.origin
).toString();

/* ==========================================
   INITIALIZE POWER-UP
========================================== */

window.TrelloPowerUp.initialize({
  "board-buttons": function (t) {
    return [
      {
        text: POWERUP_NAME,

        icon: {
          dark: POWERUP_ICON,
          light: POWERUP_ICON,
        },

        callback: function (t) {
          return t.popup({
            title: POWERUP_NAME,
            url: APP_URL,
            height: 600,
          });
        },
      },
    ];
  },
});
