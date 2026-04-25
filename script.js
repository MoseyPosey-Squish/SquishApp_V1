import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.2/src/van.min.js";

const { button, div, h1, input, li, p, ul } = van.tags;

function createCounterCard() {
  const count = van.state(0);

  return div({ class: "card" },
    h1({ class: "title" }, "VanJS Counter"),
    p(() => `Count: ${count.val}`),
    div({ class: "row" },
      button({ onclick: () => count.val-- }, "-1"),
      button({ onclick: () => count.val++ }, "+1"),
      button({ onclick: () => count.val = 0 }, "Reset"),
    ),
  );
}

function createListCard() {
  const draft = van.state("");
  const items = van.state(["Learn VanJS"]);

  function addItem() {
    const clean = draft.val.trim();
    if (!clean) {
      return;
    }

    items.val = [...items.val, clean];
    draft.val = "";
  }

  return div({ class: "card" },
    h1({ class: "title" }, "Reactive List"),
    div({ class: "row" },
      input({
        type: "text",
        placeholder: "Add an item...",
        value: draft,
        oninput: (event) => draft.val = event.target.value,
      }),
      button({ onclick: addItem }, "Add"),
    ),
    ul(() => items.val.map((item) => li(item))),
  );
}

van.add(
  document.getElementById("app"),
  createCounterCard(),
  createListCard(),
);