import { handleFixture } from "../../scripts/fixture-handler.mjs";
export default (request) => handleFixture(request);
export const config = { path: "/api/search" };
