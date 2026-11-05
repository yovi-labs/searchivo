import { handleFixture } from "../../scripts/fixture-handler.mjs";
// Deliberately malformed envelope for the feature lab's adapter error state.
export default (request) => handleFixture(request, true);
export const config = { path: "/api/invalid" };
