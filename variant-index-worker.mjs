import { buildVariantIndex, getVariantDetail, queryVariants } from "./variant-catalog.mjs";

let records = null;

function ensureIndex() {
  records ||= buildVariantIndex();
  return records;
}

self.addEventListener("message", ({ data }) => {
  try {
    switch (data?.type) {
      case "init":
        self.postMessage({ type: "ready", total: ensureIndex().length });
        break;
      case "query":
        self.postMessage({ type: "results", payload: queryVariants(ensureIndex(), data.state) });
        break;
      case "detail": {
        const record = ensureIndex().find(({ id }) => id === data.id);
        self.postMessage({ type: "detail", payload: record ? getVariantDetail(record) : null });
        break;
      }
      default:
        self.postMessage({ type: "error", messageKey: "explorer.error.invalidMessage" });
    }
  } catch (error) {
    self.postMessage({ type: "error", messageKey: "explorer.error.worker", detail: String(error?.message || error) });
  }
});
