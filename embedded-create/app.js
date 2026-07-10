const modal = document.querySelector("#lifeModal");
const shell = document.querySelector(".phone-shell");
const openModal = document.querySelector("#openModal");
const closeModal = document.querySelector("#closeModal");
const scrimClose = document.querySelector("#scrimClose");
const claimButton = document.querySelector("#claimButton");
const createClose = document.querySelector("#createClose");
const toast = document.querySelector("#toast");
const placeCards = document.querySelectorAll(".place-card");
const selectionDrawer = document.querySelector("#selectionDrawer");
const selectedList = document.querySelector("#selectedList");
const nextStep = document.querySelector(".next-step");
const introBack = document.querySelector("#introBack");
const coverImage = document.querySelector("#coverImage");
const introThumbList = document.querySelector("#introThumbList");
const createNow = document.querySelector(".create-now");
const previewBack = document.querySelector("#previewBack");
const previewCoverImage = document.querySelector("#previewCoverImage");
const previewCollageMid = document.querySelector("#previewCollageMid");
const previewCollageTop = document.querySelector("#previewCollageTop");
const previewCollageFront = document.querySelector("#previewCollageFront");
const previewTitle = document.querySelector("#previewTitle");
const previewDescription = document.querySelector("#previewDescription");
const previewPlaceCount = document.querySelector("#previewPlaceCount");
const previewPlaceList = document.querySelector("#previewPlaceList");
const finishButton = document.querySelector(".finish-button");

let toastTimer;
let dragState;
let nativeDraggedCard;
let suppressClickUntil = 0;
const maxSelectedPlaces = 5;
const selectedPlaces = new Map();

function showModal() {
  modal.classList.add("is-open");
}

function hideModal() {
  modal.classList.remove("is-open");
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function updateSelectionDrawer() {
  selectionDrawer.classList.toggle("is-visible", selectedPlaces.size > 0);
  shell.classList.toggle("is-selection-full", selectedPlaces.size >= maxSelectedPlaces);
}

function createSelectedPlace(card) {
  const existingItem = selectedList.querySelector(`[data-place-id="${card.dataset.placeId}"]`);
  if (existingItem) return;

  const image = card.querySelector("img");
  const title = card.querySelector("strong").textContent;
  const item = document.createElement("div");
  item.className = "selected-place";
  item.dataset.placeId = card.dataset.placeId;
  item.innerHTML = `
    <img src="${image.getAttribute("src")}" alt="" />
    <button class="remove-selected" type="button" aria-label="移除${title}">×</button>
    <strong>${title}</strong>
  `;
  selectedList.append(item);
  selectedPlaces.set(card.dataset.placeId, item);
}

function selectPlace(card) {
  if (selectedPlaces.has(card.dataset.placeId) || selectedList.querySelector(`[data-place-id="${card.dataset.placeId}"]`)) {
    updateSelectionDrawer();
    return;
  }

  if (selectedPlaces.size >= maxSelectedPlaces) {
    showToast("最多选择5个地点");
    updateSelectionDrawer();
    return;
  }

  card.classList.add("is-selected");
  createSelectedPlace(card);
  updateSelectionDrawer();
}

function removePlace(placeId) {
  const item = selectedPlaces.get(placeId);
  const card = document.querySelector(`.place-card[data-place-id="${placeId}"]`);

  item?.remove();
  card?.classList.remove("is-selected");
  selectedPlaces.delete(placeId);
  updateSelectionDrawer();
}

function canDragCard(card) {
  return selectionDrawer.classList.contains("is-visible") && !selectedPlaces.has(card.dataset.placeId) && selectedPlaces.size < maxSelectedPlaces;
}

function isInsideDrawer(x, y) {
  const drawerRect = selectionDrawer.getBoundingClientRect();

  return x >= drawerRect.left && x <= drawerRect.right && y >= drawerRect.top && y <= drawerRect.bottom;
}

function createDragGhost(card) {
  const cardRect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  const badge = ghost.querySelector(".add-badge");

  badge?.remove();
  ghost.classList.add("place-card-drag-ghost");
  ghost.classList.remove("place-card-a", "place-card-b", "place-card-c", "place-card-d", "place-card-e");
  ghost.style.left = `${cardRect.left}px`;
  ghost.style.top = `${cardRect.top}px`;
  ghost.style.width = `${card.offsetWidth}px`;
  ghost.style.height = `${card.offsetHeight}px`;
  ghost.style.minHeight = `${card.offsetHeight}px`;
  ghost.style.rotate = "0deg";
  document.body.append(ghost);

  return ghost;
}

function startDrag(event, card) {
  if (dragState) return;
  if (!canDragCard(card) || event.button > 0) return;

  dragState = {
    card,
    ghost: null,
    pointerId: event.pointerId ?? "mouse",
    startX: event.clientX,
    startY: event.clientY,
    dragging: false,
  };
  card.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
  if (!dragState || (event.pointerId ?? "mouse") !== dragState.pointerId) return;

  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;

  if (!dragState.dragging && Math.hypot(deltaX, deltaY) < 6) return;

  if (!dragState.dragging) {
    dragState.dragging = true;
    dragState.ghost = createDragGhost(dragState.card);
  }

  event.preventDefault();
  dragState.ghost.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
  const overDrawer = isInsideDrawer(event.clientX, event.clientY);
  dragState.ghost.classList.toggle("is-over-drawer", overDrawer);
  selectionDrawer.classList.toggle("is-drop-target", overDrawer);
}

function endDrag(event) {
  if (!dragState || (event.pointerId ?? "mouse") !== dragState.pointerId) return;

  const shouldSelect = dragState.dragging && isInsideDrawer(event.clientX, event.clientY);

  dragState.ghost?.remove();
  selectionDrawer.classList.remove("is-drop-target");
  dragState.card.releasePointerCapture?.(event.pointerId);

  if (shouldSelect) {
    selectPlace(dragState.card);
    suppressClickUntil = Date.now() + 250;
  }

  dragState = null;
}

function startNativeDrag(event, card) {
  if (!canDragCard(card)) {
    event.preventDefault();
    return;
  }

  nativeDraggedCard = card;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("text/plain", card.dataset.placeId);

  const transparentDragImage = document.createElement("canvas");
  transparentDragImage.width = 1;
  transparentDragImage.height = 1;
  event.dataTransfer.setDragImage(transparentDragImage, 0, 0);
}

function endNativeDrag() {
  selectionDrawer.classList.remove("is-drop-target");
  nativeDraggedCard = null;
}

function getSelectedData() {
  return Array.from(selectedPlaces.keys()).map((placeId) => {
    const card = document.querySelector(`.place-card[data-place-id="${placeId}"]`);

    return {
      image: card.querySelector("img").getAttribute("src"),
      title: card.querySelector("strong").textContent,
    };
  });
}

function renderIntroPage() {
  const selectedData = getSelectedData();
  const [cover] = selectedData;

  if (!cover) {
    showToast("先选一家地点");
    return;
  }

  coverImage.src = cover.image;
  document.querySelectorAll(".collage-tile").forEach((tile, index) => {
    const place = selectedData[index + 1] || selectedData[index] || cover;
    tile.style.backgroundImage = `url("${place.image}")`;
  });
  introThumbList?.replaceChildren(
    ...selectedData.map((place) => {
      const item = document.createElement("div");
      item.className = "intro-thumb";
      item.innerHTML = `<img src="${place.image}" alt="${place.title}" />`;
      return item;
    })
  );

  shell.classList.remove("is-creating");
  shell.classList.remove("is-returning-to-create");
  shell.classList.add("is-introducing");
  requestAnimationFrame(() => {
    document.querySelector("#specialName")?.focus({ preventScroll: true });
  });
}

function renderPreviewPage() {
  const selectedData = getSelectedData();
  const [cover] = selectedData;

  if (!cover) {
    showToast("先选一家地点");
    return;
  }

  const fallbackPlaces = [
    { image: "./assets/place-sanmuchuan.webp", title: "三木川菜" },
    { image: "./assets/place-museum.webp", title: "浦东美术馆" },
    { image: "./assets/place-amao.webp", title: "阿毛的深夜食堂" },
    { image: "./assets/place-aying.webp", title: "阿英家拌川" },
    { image: "./assets/place-ama-zaodian.webp", title: "阿嬷早点" },
  ];
  const previewPlaces = selectedData.length >= 3 ? selectedData : fallbackPlaces;
  const title = document.querySelector("#specialName").value.trim() || "大学毕业前，\n和室友吃完的大学路";
  const description = document.querySelector("#specialDescription").value.trim() || "四年，四条胃，一家一家吃过来的。";

  previewCoverImage.src = previewPlaces[0]?.image || cover.image;
  previewCollageMid.src = previewPlaces[1]?.image || cover.image;
  previewCollageTop.src = previewPlaces[2]?.image || cover.image;
  previewCollageFront.src = previewPlaces[3]?.image || previewPlaces[1]?.image || cover.image;
  previewTitle.textContent = title;
  previewDescription.textContent = description;
  previewPlaceCount.textContent = `${previewPlaces.length}个地点`;

  const metaList = [
    ["4.4星", "¥47/人", "川菜", "大学路", "1.5km", "打卡过5次", "评价1次超预期", "每次聚餐都说换一家，最后还是拐回这家排挡。"],
    ["4.5星", "¥91/人", "川菜", "大学路", "2.1km", "打卡过3次", "", "这里为什么值得一去再去"],
    ["3.9星", "¥36/人", "杭帮菜", "大学路", "700m", "打卡过5次", "评价1次超预期", "哪道菜给你留下过深刻的印象"],
    ["4.4星", "¥95/人", "江西菜", "大学路", "2.1km", "打卡过5次", "评价1次超预期", "有没有什么推荐的隐藏吃法"],
    ["4.4星", "¥126/人", "意大利菜", "大学路", "900m", "打卡过3次", "评价1次很棒", "这样洋气小资的环境，来这里猛猛出片"],
  ];
  previewPlaceList.replaceChildren(
    ...previewPlaces.map((place, index) => {
      const meta = metaList[index % metaList.length];
      const card = document.createElement("article");
      card.className = "preview-place-card";
      card.innerHTML = `
        <div class="preview-place-main">
          <img src="${place.image}" alt="" />
          <div class="preview-place-info">
            <strong>${place.title}</strong>
            <div class="preview-meta">
              <span class="preview-score">${meta[0]}</span>
              <span class="preview-price">${meta[1]}</span>
              <span>${meta[2]}</span>
              <span>${meta[3]}</span>
            </div>
          </div>
          <span class="preview-distance">${meta[4]}</span>
        </div>
        <div class="preview-quote">
          <div class="preview-tags">
            <span>${meta[5]}</span>
            ${meta[6] ? `<span>${meta[6]}</span>` : ""}
          </div>
          <p>${meta[7]}</p>
          <span class="quote-tail">”</span>
        </div>
      `;
      return card;
    })
  );

  shell.classList.remove("is-introducing");
  shell.classList.add("is-previewing");
}

openModal?.addEventListener("click", showModal);
closeModal.addEventListener("click", hideModal);
scrimClose.addEventListener("click", hideModal);

claimButton.addEventListener("click", () => {
  hideModal();
  shell.classList.add("is-creating");
});

createClose.addEventListener("click", () => {
  shell.classList.remove("is-creating");
  showModal();
});

placeCards.forEach((card, index) => {
  card.dataset.placeId = `place-${index}`;
  card.draggable = false;
  card.querySelectorAll("img").forEach((image) => {
    image.draggable = false;
  });
  card.addEventListener("pointerdown", (event) => startDrag(event, card));
  card.addEventListener("click", (event) => {
    if (Date.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    selectPlace(card);
  });
});

window.addEventListener("pointermove", moveDrag);
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
window.addEventListener("mousemove", moveDrag);
window.addEventListener("mouseup", endDrag);

selectionDrawer.addEventListener("dragover", (event) => {
  if (!nativeDraggedCard) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  selectionDrawer.classList.add("is-drop-target");
});

selectionDrawer.addEventListener("dragleave", (event) => {
  if (!selectionDrawer.contains(event.relatedTarget)) {
    selectionDrawer.classList.remove("is-drop-target");
  }
});

selectionDrawer.addEventListener("drop", (event) => {
  event.preventDefault();

  if (nativeDraggedCard) {
    selectPlace(nativeDraggedCard);
    suppressClickUntil = Date.now() + 250;
  }

  endNativeDrag();
});

selectedList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-selected");
  if (!removeButton) return;

  removePlace(removeButton.closest(".selected-place").dataset.placeId);
});

nextStep.addEventListener("click", renderIntroPage);

introBack.addEventListener("click", () => {
  shell.classList.remove("is-introducing");
  shell.classList.add("is-returning-to-create");
  shell.classList.add("is-creating");
  window.setTimeout(() => {
    shell.classList.remove("is-returning-to-create");
  }, 300);
});

createNow.addEventListener("click", renderPreviewPage);

previewBack.addEventListener("click", () => {
  shell.classList.remove("is-previewing");
  shell.classList.add("is-introducing");
});

finishButton.addEventListener("click", () => {
  showToast("生活特辑已创建");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    hideModal();
  }
});
