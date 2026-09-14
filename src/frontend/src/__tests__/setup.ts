import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Generated components use `data-ocid` as their test hook attribute.
configure({ testIdAttribute: "data-ocid" });

// jsdom does not implement IntersectionObserver, which Home uses for its
// infinite-scroll sentinel. Provide a no-op so the component mounts.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// @ts-expect-error assigning a partial mock to the global
globalThis.IntersectionObserver = MockIntersectionObserver;

// jsdom does not implement URL.createObjectURL/revokeObjectURL, which the
// upload preview uses to show a selected audio file.
globalThis.URL.createObjectURL = () => "blob:mock-preview-url";
globalThis.URL.revokeObjectURL = () => {};

// jsdom does not implement Element.prototype.scrollIntoView, which the
// conversation thread uses to scroll to the latest message.
Element.prototype.scrollIntoView = () => {};
