(function (global) {
  "use strict";

  const ads = global.RandomClassConfig && global.RandomClassConfig.ads;
  if (!ads || !ads.showReservedSlots) return;

  document.querySelectorAll("[data-ad-slot]").forEach((slot) => {
    if (ads.placements[slot.dataset.adSlot] === true) {
      slot.classList.remove("hidden");
    }
  });
})(window);
