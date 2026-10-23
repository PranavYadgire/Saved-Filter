
/* ==========================================
   SAVED FILTER VIEWS - TRELLO POWER-UP
   Board Button + Compact Popup
   ========================================== */

const APP_URL = new URL(
  "../popup.html",
  window.location.href
).toString();
const POWERUP_NAME = "Saved Filter Views";

const POWERUP_ICON =
  "https://savedfilter.vercel.app/favicon.ico";

/* ==========================================
   INITIALIZE TRELLO POWER-UP
   ========================================== */

window.TrelloPowerUp.initialize({

  /* ========================================
     BOARD BUTTON
     ======================================== */

  "board-buttons": function (t) {

    return [
      {
        text: POWERUP_NAME,

        icon: {
          dark: POWERUP_ICON,
          light: POWERUP_ICON
        },

        condition: "always",

        callback: function (t) {

          /* Open compact popup */

          return t.popup({

            title: POWERUP_NAME,

            url: APP_URL,

            height: 520,

            width: 420

          });

        }

      }
    ];

  }

});
