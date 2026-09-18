export function isWorkshopLocation({ search = "", hash = "" } = {}) {
  const params = new URLSearchParams(search);
  return params.get("view") === "atelier"
    || Boolean(params.get("spell"))
    || Boolean(params.get("sigils"))
    || Boolean(params.get("communityCircle"))
    || hash === "#practice";
}

export function savedSpellHref(id) {
  const params = new URLSearchParams({ view: "atelier", spell: id });
  return `index.html?${params}`;
}
